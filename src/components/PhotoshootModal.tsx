import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { photoshootApi, PhotoshootJob } from "@/api/photoshoot-api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import { Label } from "@/components/ui/label";

interface PhotoshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
  originalImageUrl: string;
}

export const PhotoshootModal = ({ isOpen, onClose, resultId, originalImageUrl }: PhotoshootModalProps) => {
  const [stage, setStage] = useState<'setup' | 'processing'>('setup');
  const [photoshoot, setPhotoshoot] = useState<PhotoshootJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleBackImageUpload = async (file: File | null) => {
    if (!file) {
      setBackImageFile(null);
      setBackImageUrl(null);
      return;
    }

    setBackImageFile(file);
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('outfit-user-models')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('outfit-user-models')
        .getPublicUrl(filePath);

      setBackImageUrl(publicUrl);
      toast.success("Back image uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload back image");
      setBackImageFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartPhotoshoot = async () => {
    setLoading(true);
    setStage('processing');

    try {
      const createdPhotoshoot = await photoshootApi.createPhotoshoot(resultId, backImageUrl || undefined);
      setPhotoshoot(createdPhotoshoot);

      // Subscribe to updates
      const unsubscribe = photoshootApi.subscribeToPhotoshoot(createdPhotoshoot.id, (updatedPhotoshoot) => {
        setPhotoshoot(updatedPhotoshoot);

        if (updatedPhotoshoot.status === "completed") {
          toast.success("Photoshoot completed!");
          
          // Delete the back image from storage if it was uploaded
          if (backImageUrl && backImageUrl.includes('outfit-user-models/temp/')) {
            const path = backImageUrl.split('outfit-user-models/')[1];
            supabase.storage.from('outfit-user-models').remove([path]).catch(console.error);
          }
        } else if (updatedPhotoshoot.status === "failed") {
          toast.error(updatedPhotoshoot.error || "Photoshoot failed");
        }
      });

      setLoading(false);

      // Cleanup subscription on unmount
      return unsubscribe;
    } catch (error) {
      console.error("Error starting photoshoot:", error);
      toast.error("Failed to start photoshoot");
      setStage('setup');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setStage('setup');
      setPhotoshoot(null);
      setBackImageFile(null);
      setBackImageUrl(null);
    }
  }, [isOpen]);

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
    if (!photoshoot?.id) return;
    
    try {
      await photoshootApi.cancelPhotoshoot(photoshoot.id);
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
          <DialogTitle>Professional Photoshoot</DialogTitle>
          <DialogDescription>
            Generate 4 professional product angles (4 credits)
          </DialogDescription>
        </DialogHeader>

        {stage === 'setup' ? (
          <div className="space-y-6">
            {/* Original Image Preview */}
            <div className="space-y-2">
              <Label>Original Image</Label>
              <img 
                src={originalImageUrl} 
                alt="Original outfit swap"
                className="w-full rounded-lg border max-h-64 object-contain"
              />
            </div>

            {/* Optional Back Image Uploader */}
            <div className="space-y-2">
              <Label>Product Back (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload a photo of the garment's back to improve back-view angles
              </p>
              <ImageUploader
                onImageSelect={handleBackImageUpload}
                selectedImage={backImageFile}
                isAnalyzing={isUploading}
                analyzingText="Uploading..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartPhotoshoot}
                disabled={isUploading || loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Photoshooting'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Section */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{photoshoot?.progress}%</span>
                </div>
                <Progress value={photoshoot?.progress} />
              </div>
            )}

            {/* Status Message */}
            {isFailed && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Generation Failed</p>
                  <p className="text-sm text-muted-foreground">{photoshoot?.error || "Unknown error occurred"}</p>
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Original Image</h3>
              <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                <img src={originalImageUrl} alt="Original" className="w-full h-full object-cover" />
              </div>
            </div>

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
                  const isCurrentlyGenerating = isProcessing && photoshoot && photoshoot.progress >= (index - 1) * 25 && photoshoot.progress < index * 25;

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
                  <X className="w-4 w-4 mr-2" />
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
