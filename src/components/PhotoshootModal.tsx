import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { photoshootApi, PhotoshootJob } from "@/api/photoshoot-api";
import { toast } from "sonner";

interface PhotoshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoshootId: string | null;
  originalImageUrl?: string;
}

export const PhotoshootModal = ({ isOpen, onClose, photoshootId, originalImageUrl }: PhotoshootModalProps) => {
  const [photoshoot, setPhotoshoot] = useState<PhotoshootJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photoshootId || !isOpen) return;

    setLoading(true);

    // Initial fetch
    photoshootApi.getPhotoshoot(photoshootId)
      .then(setPhotoshoot)
      .catch((error) => {
        console.error("Failed to fetch photoshoot:", error);
        toast.error("Failed to load photoshoot");
      })
      .finally(() => setLoading(false));

    // Subscribe to real-time updates
    const unsubscribe = photoshootApi.subscribeToPhotoshoot(photoshootId, (updatedPhotoshoot) => {
      setPhotoshoot(updatedPhotoshoot);
      
      if (updatedPhotoshoot.status === "completed") {
        toast.success("Photoshoot completed!");
      } else if (updatedPhotoshoot.status === "failed") {
        toast.error("Photoshoot failed: " + (updatedPhotoshoot.error || "Unknown error"));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [photoshootId, isOpen]);

  const handleDownloadImage = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `photoshoot-angle-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    if (!photoshoot) return;
    
    const images = [
      photoshoot.image_1_url,
      photoshoot.image_2_url,
      photoshoot.image_3_url,
      photoshoot.image_4_url,
    ].filter(Boolean);

    images.forEach((url, index) => {
      if (url) {
        setTimeout(() => handleDownloadImage(url, index + 1), index * 200);
      }
    });

    toast.success(`Downloading ${images.length} images...`);
  };

  const handleCancel = async () => {
    if (!photoshootId) return;
    
    try {
      await photoshootApi.cancelPhotoshoot(photoshootId);
      toast.success("Photoshoot canceled");
      onClose();
    } catch (error: any) {
      toast.error("Failed to cancel: " + error.message);
    }
  };

  const isProcessing = photoshoot?.status === "queued" || photoshoot?.status === "processing";
  const isComplete = photoshoot?.status === "completed";
  const isFailed = photoshoot?.status === "failed";

  const angleLabels = [
    "Three-Quarter View",
    "Back View",
    "Side Profile",
    "Detail Close-Up"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Photoshoot Generation</DialogTitle>
          <DialogDescription>
            Creating 4 professional product photography angles (4 credits)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Section */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{photoshoot.progress}%</span>
                </div>
                <Progress value={photoshoot.progress} />
              </div>
            )}

            {/* Status Message */}
            {isFailed && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Generation Failed</p>
                  <p className="text-sm text-muted-foreground">{photoshoot.error || "Unknown error occurred"}</p>
                </div>
              </div>
            )}

            {isComplete && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-600">All angles generated successfully!</p>
              </div>
            )}

            {/* Original Image Reference */}
            {originalImageUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Original Image</h3>
                <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                  <img src={originalImageUrl} alt="Original" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Generated Images Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Generated Angles</h3>
                {isComplete && (
                  <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                    <Download className="w-3 h-3 mr-1" />
                    Download All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((index) => {
                  const imageUrl = photoshoot?.[`image_${index}_url` as keyof PhotoshootJob] as string | null;
                  const isGenerated = !!imageUrl;
                  const isCurrentlyGenerating = isProcessing && photoshoot.progress >= (index - 1) * 25 && photoshoot.progress < index * 25;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                        {isGenerated ? (
                          <img src={imageUrl} alt={`Angle ${index}`} className="w-full h-full object-cover" />
                        ) : isCurrentlyGenerating ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            Pending
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{angleLabels[index - 1]}</span>
                        {isGenerated && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadImage(imageUrl, index)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {isProcessing && (
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button variant={isComplete ? "default" : "outline"} onClick={onClose}>
                {isComplete ? "Done" : "Close"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
