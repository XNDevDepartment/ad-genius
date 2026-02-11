import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Download, ExternalLink, Loader2, X } from "lucide-react";
import { ecommercePhotoApi, EcommercePhotoJob } from "@/api/ecommerce-photo-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface EcommercePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoId: string;
  originalImageUrl: string;
}

export const EcommercePhotoModal = ({ isOpen, onClose, photoId, originalImageUrl }: EcommercePhotoModalProps) => {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<EcommercePhotoJob | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !photoId) return;

    setLoading(true);

    ecommercePhotoApi.getEcommercePhoto(photoId)
      .then(setPhoto)
      .catch((error) => {
        console.error("Error fetching ecommerce photo:", error);
        toast.error(t('ecommercePhotoModal.failedToLoad'));
      })
      .finally(() => setLoading(false));

    const unsubscribe = ecommercePhotoApi.subscribeToEcommercePhoto(photoId, (updatedPhoto) => {
      setPhoto(updatedPhoto);

      if (updatedPhoto.status === "completed") {
        toast.success(t('ecommercePhotoModal.generatedSuccessfully'));
      } else if (updatedPhoto.status === "failed") {
        toast.error(updatedPhoto.error || t('ecommercePhotoModal.generationFailed'));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, photoId]);

  useEffect(() => {
    if (!photo?.id || photo.status === 'completed' || photo.status === 'failed' || photo.status === 'canceled') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updatedPhoto = await ecommercePhotoApi.getEcommercePhoto(photo.id);
        setPhoto(updatedPhoto);

        if (updatedPhoto.status === 'completed') {
          toast.success(t('ecommercePhotoModal.generatedSuccessfully'));
        } else if (updatedPhoto.status === 'failed') {
          toast.error(updatedPhoto.error || t('ecommercePhotoModal.generationFailed'));
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
      toast.success(t('ecommercePhotoModal.imageDownloaded'));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t('ecommercePhotoModal.downloadFailed'));
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
      toast.success(t('ecommercePhotoModal.generationCancelled'));
      onClose();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error(t('ecommercePhotoModal.cancelFailed'));
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
      <DialogContent className="max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{t('ecommercePhotoModal.title')}</DialogTitle>
          <DialogDescription>
            {t('ecommercePhotoModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{t('ecommercePhotoModal.generating')}</span>
              </div>
              <Progress value={photo.progress} className="h-2" />
            </div>
          )}

          {isFailed && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">{t('ecommercePhotoModal.generationFailed')}</p>
                <p className="text-sm text-muted-foreground">{photo.error || t('ecommercePhotoModal.unknownError')}</p>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('ecommercePhotoModal.generatedSuccessfully')}</span>
            </div>
          )}

          {/* Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('ecommercePhotoModal.original')}</p>
              <img
                src={originalImageUrl}
                alt="Original"
                className="w-full rounded-lg border shadow-sm"
              />
            </div>

            {/* Generated */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('ecommercePhotoModal.ecommerceStyle')}</p>
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
                    <span className="text-sm text-muted-foreground">{t('ecommercePhotoModal.noImageYet')}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t bg-background p-4 flex gap-2 justify-end">
          {isProcessing && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              {t('ecommercePhotoModal.cancel')}
            </Button>
          )}

          {isComplete && photo.public_url && (
            <>
              <Button variant="outline" onClick={() => handleDownload(photo.public_url!)}>
                <Download className="h-4 w-4 mr-2" />
                {t('ecommercePhotoModal.download')}
              </Button>
              <Button variant="outline" onClick={() => openInNewTab(photo.public_url!)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('ecommercePhotoModal.open')}
              </Button>
            </>
          )}

          <Button variant={isComplete ? "outline" : "default"} onClick={onClose}>
            {isComplete ? t('ecommercePhotoModal.done') : t('ecommercePhotoModal.close')}
          </Button>
        </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};
