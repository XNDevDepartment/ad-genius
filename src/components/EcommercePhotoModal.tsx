import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Download, ExternalLink, Loader2, X } from "lucide-react";
import { ecommercePhotoApi, EcommercePhotoJob } from "@/api/ecommerce-photo-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface EcommercePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoId: string;
  originalImageUrl: string;
}

export const EcommercePhotoModal = ({ isOpen, onClose, photoId, originalImageUrl }: EcommercePhotoModalProps) => {
  const [photo, setPhoto] = useState<EcommercePhotoJob | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !photoId) return;

    setLoading(true);

    // Fetch initial photo data
    ecommercePhotoApi.getEcommercePhoto(photoId)
      .then(setPhoto)
      .catch((error) => {
        console.error("Error fetching ecommerce photo:", error);
        toast.error("Failed to load ecommerce photo");
      })
      .finally(() => setLoading(false));

    // Subscribe to updates
    const unsubscribe = ecommercePhotoApi.subscribeToEcommercePhoto(photoId, (updatedPhoto) => {
      setPhoto(updatedPhoto);

      if (updatedPhoto.status === "completed") {
        toast.success("E-commerce photo generated!");
      } else if (updatedPhoto.status === "failed") {
        toast.error(updatedPhoto.error || "Failed to generate e-commerce photo");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, photoId]);

  // Polling fallback for ecommerce photo status
  useEffect(() => {
    if (!photo?.id || photo.status === 'completed' || photo.status === 'failed' || photo.status === 'canceled') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updatedPhoto = await ecommercePhotoApi.getEcommercePhoto(photo.id);
        setPhoto(updatedPhoto);

        if (updatedPhoto.status === 'completed') {
          toast.success("E-commerce photo generated!");
        } else if (updatedPhoto.status === 'failed') {
          toast.error(updatedPhoto.error || "Failed to generate e-commerce photo");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [photo?.id, photo?.status]);

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ecommerce-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const handleAnimate = () => {
    if (photo?.public_url) {
      navigate(`/video-generator?sourceImage=${encodeURIComponent(photo.public_url)}`);
      onClose();
    }
  };

  const handleCancel = async () => {
    if (!photo?.id) return;
    
    try {
      await ecommercePhotoApi.cancelEcommercePhoto(photo.id);
      toast.success("E-commerce photo generation cancelled");
      onClose();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel generation");
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isProcessing = photo?.status === "processing" || photo?.status === "queued";
  const isComplete = photo?.status === "completed";
  const isFailed = photo?.status === "failed";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E-commerce Fashion Photo</DialogTitle>
          <DialogDescription>
            Transform your outfit into a professional e-commerce style photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Generating e-commerce photo...</span>
              </div>
              <Progress value={photo.progress} className="h-2" />
            </div>
          )}

          {isFailed && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Generation Failed</p>
                <p className="text-sm text-muted-foreground">{photo.error || "Unknown error occurred"}</p>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>E-commerce photo generated successfully!</span>
            </div>
          )}

          {/* Images */}
          <div className="grid grid-cols-2 gap-6">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Original</p>
              <img
                src={originalImageUrl}
                alt="Original"
                className="w-full rounded-lg border shadow-sm"
              />
            </div>

            {/* Generated */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">E-commerce Style</p>
              {isComplete && photo.public_url ? (
                <img
                  src={photo.public_url}
                  alt="E-commerce photo"
                  className="w-full rounded-lg border shadow-sm"
                />
              ) : (
                <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-sm text-muted-foreground">No image yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {isProcessing && (
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}

            {isComplete && photo.public_url && (
              <>
                <Button variant="outline" onClick={() => handleDownload(photo.public_url!)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => openInNewTab(photo.public_url!)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button onClick={handleAnimate}>
                  Animate
                </Button>
              </>
            )}

            <Button variant={isComplete ? "outline" : "default"} onClick={onClose}>
              {isComplete ? "Done" : "Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
