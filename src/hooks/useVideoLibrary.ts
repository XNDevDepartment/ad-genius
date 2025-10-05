import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { KlingJobRow } from "@/api/kling";

type SortOption = "newest" | "oldest" | "duration";
type StatusFilter = "all" | "completed" | "processing" | "failed" | "queued";

interface UseVideoLibraryOptions {
  pageSize?: number;
}

export function useVideoLibrary(options: UseVideoLibraryOptions = {}) {
  const { pageSize = 20 } = options;
  
  const [videos, setVideos] = useState<KlingJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch videos
  const fetchVideos = async (append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("kling_jobs")
        .select("*")
        .eq("user_id", user.id);

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "duration":
          query = query.order("duration", { ascending: false });
          break;
      }

      // Apply pagination
      const offset = append ? videos.length : 0;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newVideos = (data || []) as KlingJobRow[];
      setHasMore(newVideos.length === pageSize);

      if (append) {
        setVideos((prev) => [...prev, ...newVideos]);
      } else {
        setVideos(newVideos);
      }
    } catch (err: any) {
      console.error("Failed to fetch videos:", err);
      setError(err.message);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  // Delete video
  const deleteVideo = async (jobId: string) => {
    try {
      const job = videos.find((v) => v.id === jobId);
      if (!job) return;

      // Delete from storage if exists
      if (job.video_path) {
        const { error: storageError } = await supabase.storage
          .from("videos")
          .remove([job.video_path]);
        
        if (storageError) {
          console.warn("Failed to delete video from storage:", storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("kling_jobs")
        .delete()
        .eq("id", jobId);

      if (dbError) throw dbError;

      setVideos((prev) => prev.filter((v) => v.id !== jobId));
      toast.success("Video deleted");
    } catch (err: any) {
      console.error("Failed to delete video:", err);
      toast.error("Failed to delete video");
    }
  };

  // Download video
  const downloadVideo = async (job: KlingJobRow) => {
    try {
      const videoUrl = job.video_url || (job.video_path 
        ? supabase.storage.from("videos").getPublicUrl(job.video_path).data.publicUrl 
        : null);

      if (!videoUrl) {
        toast.error("Video URL not available");
        return;
      }

      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${job.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Video downloaded");
    } catch (err: any) {
      console.error("Failed to download video:", err);
      toast.error("Failed to download video");
    }
  };

  // Load more (pagination)
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchVideos(true);
    }
  };

  // Refetch (refresh)
  const refetch = () => {
    setCurrentPage(0);
    fetchVideos(false);
  };

  // Setup realtime subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("kling_jobs_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "kling_jobs",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime video update:", payload);

            if (payload.eventType === "INSERT") {
              const newJob = payload.new as any;
              setVideos((prev) => [newJob as KlingJobRow, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              const updatedJob = payload.new as any;
              setVideos((prev) =>
                prev.map((v) =>
                  v.id === updatedJob.id ? (updatedJob as KlingJobRow) : v
                )
              );
            } else if (payload.eventType === "DELETE") {
              setVideos((prev) => prev.filter((v) => v.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchVideos(false);
  }, [sortBy, statusFilter]);

  return {
    videos,
    loading,
    error,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    hasMore,
    loadMore,
    refetch,
    deleteVideo,
    downloadVideo,
  };
}
