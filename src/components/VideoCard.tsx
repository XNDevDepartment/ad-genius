import { useState, useRef } from "react";
import { Download, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { KlingJobRow } from "@/api/kling";
import { format } from "date-fns";
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

interface VideoCardProps {
  job: KlingJobRow;
  onDelete: (jobId: string) => void;
  onDownload: (job: KlingJobRow) => void;
  onView: (job: KlingJobRow) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "processing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "queued":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function VideoCard({ job, onDelete, onDownload, onView }: VideoCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (videoRef.current && isCompleted && videoUrl && !videoError) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const videoUrl = job.video_url || (job.video_path 
    ? supabase.storage.from("videos").getPublicUrl(job.video_path).data.publicUrl 
    : null);

  const isCompleted = job.status === "completed";
  const isProcessing = job.status === "processing" || job.status === "queued";

  return (
    <>
      <Card className="overflow-hidden transition-all duration-300 ease-out hover:shadow-card hover:border-primary/40 group">
        <CardContent className="p-0">
          {/* Video Preview or Placeholder */}
          <div
            className="relative aspect-[3/4] bg-muted overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isCompleted && videoUrl && !videoError ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setVideoError(true)}
              />
            ) : isProcessing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Video preview unavailable</p>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={getStatusColor(job.status)}>
                {job.status}
              </Badge>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <p className="text-sm font-medium line-clamp-2">{job.prompt}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{job.duration}s</span>
              <span>•</span>
              <span>{format(new Date(job.created_at), "MMM d, yyyy")}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2">
          {isCompleted && videoUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onView(job)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(job)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the video and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(job.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
