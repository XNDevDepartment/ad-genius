import { useState } from "react";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Film, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { KlingJobRow } from "@/api/kling";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export default function VideoLibrary() {
  const {
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
    retryVideo,
  } = useVideoLibrary();

  const [viewingVideo, setViewingVideo] = useState<KlingJobRow | null>(null);

  const videoUrl = viewingVideo
    ? viewingVideo.video_url || (viewingVideo.video_path 
        ? supabase.storage.from("videos").getPublicUrl(viewingVideo.video_path).data.publicUrl 
        : null)
    : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Video Library</h1>
        </div>
        <p className="text-muted-foreground">
          Browse and manage your generated videos
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="duration">By Duration</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="font-medium">Failed to load videos</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && videos.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="text-center py-12">
          <Film className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate your first video to see it here
          </p>
          <Button onClick={() => window.location.href = "/create"}>
            Create Video
          </Button>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((job) => (
              <VideoCard
                key={job.id}
                job={job}
                onDelete={deleteVideo}
                onDownload={downloadVideo}
                onView={setViewingVideo}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Video Viewer Modal */}
      <Dialog open={!!viewingVideo} onOpenChange={() => setViewingVideo(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Video Details</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingVideo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {viewingVideo && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Video Player */}
              <div className="md:col-span-2 space-y-4">
                {videoUrl ? (
                  <video
                    key={viewingVideo.id}
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg bg-black"
                    onError={(e) => console.error("Video load error:", e)}
                  />
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {viewingVideo.status === "processing" && (
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => retryVideo(viewingVideo.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                  )}
                  {viewingVideo.status === "completed" && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadVideo(viewingVideo)}
                    >
                      Download Video
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      deleteVideo(viewingVideo.id);
                      setViewingVideo(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Details Sidebar */}
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Prompt</h4>
                  <p className="text-muted-foreground">{viewingVideo.prompt}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Settings</h4>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duration:</dt>
                      <dd>{viewingVideo.duration}s</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Model:</dt>
                      <dd className="text-xs">{viewingVideo.model?.split("/").pop()}</dd>
                    </div>
                    {viewingVideo.video_size_bytes && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">File Size:</dt>
                        <dd>{(viewingVideo.video_size_bytes / 1024 / 1024).toFixed(2)} MB</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Timestamps</h4>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Created:</dt>
                      <dd>{format(new Date(viewingVideo.created_at), "PPp")}</dd>
                    </div>
                    {viewingVideo.finished_at && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Finished:</dt>
                        <dd>{format(new Date(viewingVideo.finished_at), "PPp")}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
