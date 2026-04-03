import { useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Trash2, CheckSquare, Square, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { KlingJobRow } from "@/api/kling";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  visible: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: Math.min(i * 0.04, 0.5), duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

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
    deleteVideos,
    downloadVideo,
    retryVideo,
  } = useVideoLibrary();

  const [viewingVideo, setViewingVideo] = useState<KlingJobRow | null>(null);
  const [modalVideoError, setModalVideoError] = useState(false);
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const videoUrl = viewingVideo
    ? viewingVideo.video_url || (viewingVideo.video_path 
        ? supabase.storage.from("videos").getPublicUrl(viewingVideo.video_path).data.publicUrl 
        : null)
    : null;

  const toggleSelection = (jobId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(videos.map(v => v.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    try {
      const result = await deleteVideos(Array.from(selectedIds));
      if (result.failed === 0) {
        toast.success(`Deleted ${result.success} videos`);
      } else {
        toast.warning(`Deleted ${result.success}, failed ${result.failed}`);
      }
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      toast.error("Failed to delete videos");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  return (
    <PageTransition>
    <div className="py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <Film className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Video Library</h1>
          </div>
          {!selectionMode && (
            <Button variant="outline" onClick={() => setSelectionMode(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Select
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          Browse and manage your generated videos
        </p>
      </div>

      {/* Selection Mode Header */}
      {selectionMode && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || bulkDeleting}
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectionMode(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {videos.map((job, index) => (
              <motion.div
                key={job.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className={`relative transition-all duration-200 ${selectionMode && selectedIds.has(job.id) ? 'ring-2 ring-primary rounded-lg scale-[0.97]' : ''}`}
              >
                {selectionMode && (
                  <div 
                    className="absolute top-2 left-2 z-10 cursor-pointer"
                    onClick={() => toggleSelection(job.id)}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      selectedIds.has(job.id) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background/80 border border-border'
                    }`}>
                      {selectedIds.has(job.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                )}
                <VideoCard
                  job={job}
                  onDelete={deleteVideo}
                  onDownload={downloadVideo}
                  onView={(job) => { setModalVideoError(false); setViewingVideo(job); }}
                />
              </motion.div>
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
        <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[92vh] overflow-y-auto">
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

          {viewingVideo && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Video Player */}
              <div className="md:col-span-2 space-y-4">
              {videoUrl && !modalVideoError ? (
                  <video
                    key={viewingVideo.id}
                    src={videoUrl}
                    controls
                    playsInline
                    muted
                    preload="auto"
                    className="w-full rounded-lg bg-black"
                    onError={() => setModalVideoError(true)}
                  />
                ) : videoUrl && modalVideoError ? (
                  <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-muted-foreground">Video preview unavailable on this device</p>
                    <Button variant="outline" size="sm" onClick={() => downloadVideo(viewingVideo)}>
                      Download Video
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                )}
              </div>

              {/* Details Sidebar */}
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Motion Description</h4>
                  <p className="text-muted-foreground">{viewingVideo.prompt}</p>
                </div>

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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} videos?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected videos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PageTransition>
  );
}
