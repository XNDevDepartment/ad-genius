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
import { useTranslation } from "react-i18next";

interface PhotoshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
  originalImageUrl: string;
}

export const PhotoshootModal = ({ isOpen, onClose, resultId, originalImageUrl }: PhotoshootModalProps) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'setup' | 'angle-selection' | 'processing'>('setup');
  const [photoshoot, setPhotoshoot] = useState<PhotoshootJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['front', 'three_quarter', 'back', 'side']);

  const AVAILABLE_ANGLES = [
    { id: 'three_quarter', label: t('photoshootModal.angles.threeQuarter.label'), description: t('photoshootModal.angles.threeQuarter.description') },
    { id: 'back', label: t('photoshootModal.angles.back.label'), description: t('photoshootModal.angles.back.description') },
    { id: 'side', label: t('photoshootModal.angles.side.label'), description: t('photoshootModal.angles.side.description') },
    { id: 'detail', label: t('photoshootModal.angles.detail.label'), description: t('photoshootModal.angles.detail.description') },
  ];

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
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('outfit-user-models')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('outfit-user-models')
        .getPublicUrl(filePath);

      setBackImageUrl(publicUrl);
      toast.success(t('photoshootModal.backImageUploaded'));
    } catch (error: any) {
      console.error("Upload error details:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error
      });
      toast.error(t('photoshootModal.failedToUpload', { message: error.message || 'Unknown error' }));
      setBackImageFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinueToAngleSelection = () => {
    setStage('angle-selection');
  };

  const handleStartPhotoshoot = async () => {
    setLoading(true);
    setStage('processing');

    try {
      const createdPhotoshoot = await photoshootApi.createPhotoshoot(resultId, selectedAngles, backImageUrl || undefined);
      setPhotoshoot(createdPhotoshoot);

      // Subscribe to updates
      const unsubscribe = photoshootApi.subscribeToPhotoshoot(createdPhotoshoot.id, (updatedPhotoshoot) => {
        setPhotoshoot(updatedPhotoshoot);

        if (updatedPhotoshoot.status === "completed") {
          toast.success(t('photoshootModal.photoshootCompleted'));
          
          // Delete the back image from storage if it was uploaded
          if (backImageUrl && backImageUrl.includes('outfit-user-models/temp/')) {
            const path = backImageUrl.split('outfit-user-models/')[1];
            supabase.storage.from('outfit-user-models').remove([path]).catch(console.error);
          }
        } else if (updatedPhotoshoot.status === "failed") {
          toast.error(updatedPhotoshoot.error || t('photoshootModal.photoshootFailed'));
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
      setSelectedAngles(['front', 'three_quarter', 'back', 'side']);
    }
  }, [isOpen]);

  const toggleAngle = (angleId: string) => {
    setSelectedAngles(prev => {
      if (prev.includes(angleId)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== angleId);
      } else {
        return [...prev, angleId];
      }
    });
  };

  const selectAllAngles = () => {
    setSelectedAngles(AVAILABLE_ANGLES.map(a => a.id));
  };

  const deselectAllAngles = () => {
    setSelectedAngles([AVAILABLE_ANGLES[0].id]); // Keep at least one
  };

  // Polling fallback for photoshoot status updates
  useEffect(() => {
    if (!photoshoot?.id || photoshoot.status === 'completed' || photoshoot.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updatedPhotoshoot = await photoshootApi.getPhotoshoot(photoshoot.id);
        setPhotoshoot(updatedPhotoshoot);

        if (updatedPhotoshoot.status === 'completed') {
          toast.success(t('photoshootModal.photoshootCompleted'));
          
          // Delete the back image from storage if it was uploaded
          if (backImageUrl && backImageUrl.includes('outfit-user-models/temp/')) {
            const path = backImageUrl.split('outfit-user-models/')[1];
            supabase.storage.from('outfit-user-models').remove([path]).catch(console.error);
          }
        } else if (updatedPhotoshoot.status === 'failed') {
          toast.error(updatedPhotoshoot.error || t('photoshootModal.photoshootFailed'));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [photoshoot?.id, photoshoot?.status, backImageUrl]);

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

    toast.success(t('photoshootModal.downloading', { count: images.length }));
  };

  const handleCancel = async () => {
    if (!photoshoot?.id) return;
    
    try {
      await photoshootApi.cancelPhotoshoot(photoshoot.id);
      toast.success(t('photoshootModal.photoshootCanceled'));
      onClose();
    } catch (error: any) {
      toast.error(t('photoshootModal.failedToCancel', { message: error.message }));
    }
  };

  const isProcessing = photoshoot?.status === "queued" || photoshoot?.status === "processing";
  const isComplete = photoshoot?.status === "completed";
  const isFailed = photoshoot?.status === "failed";

  const angleLabelsMap: Record<string, string> = {
    'three_quarter': t('photoshootModal.angles.threeQuarter.label'),
    'back': t('photoshootModal.angles.back.label'),
    'side': t('photoshootModal.angles.side.label'),
    'detail': t('photoshootModal.angles.detail.label')
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('photoshootModal.title')}</DialogTitle>
          <DialogDescription>
            {stage === 'setup' && t('photoshootModal.setupDescription')}
            {stage === 'angle-selection' && t('photoshootModal.angleSelectionDescription', { count: selectedAngles.length, plural: selectedAngles.length !== 1 ? 's' : '' })}
            {stage === 'processing' && t('photoshootModal.processingDescription')}
          </DialogDescription>
        </DialogHeader>

        {stage === 'setup' ? (
          <div className="space-y-6">
            {/* Original Image Preview */}
            <div className="space-y-2">
              <Label>{t('photoshootModal.originalImage')}</Label>
              <img 
                src={originalImageUrl} 
                alt="Original outfit swap"
                className="w-full rounded-lg border max-h-64 object-contain"
              />
            </div>

            {/* Optional Back Image Uploader */}
            <div className="space-y-2">
              <Label>{t('photoshootModal.productBack')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('photoshootModal.backImageHelp')}
              </p>
              <ImageUploader
                onImageSelect={handleBackImageUpload}
                selectedImage={backImageFile}
                isAnalyzing={isUploading}
                analyzingText={t('photoshootModal.uploading')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                {t('photoshootModal.cancel')}
              </Button>
              <Button 
                onClick={handleContinueToAngleSelection}
                disabled={isUploading}
                size="lg"
              >
                {t('photoshootModal.continue')}
              </Button>
            </div>
          </div>
        ) : stage === 'angle-selection' ? (
          <div className="space-y-6">
            {/* Original Image Preview */}
            <div className="space-y-2">
              <Label>{t('photoshootModal.originalImage')}</Label>
              <img 
                src={originalImageUrl} 
                alt="Original outfit swap"
                className="w-full rounded-lg border max-h-48 object-contain"
              />
            </div>

            {/* Angle Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('photoshootModal.selectAnglesLabel')}</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllAngles}
                    disabled={selectedAngles.length === AVAILABLE_ANGLES.length}
                  >
                    {t('photoshootModal.selectAllAngles')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllAngles}
                    disabled={selectedAngles.length === 1}
                  >
                    {t('photoshootModal.deselectAllAngles')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {AVAILABLE_ANGLES.map((angle) => {
                  const isSelected = selectedAngles.includes(angle.id);
                  return (
                    <div
                      key={angle.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleAngle(angle.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {isSelected && (
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{angle.label}</h4>
                          <p className="text-sm text-muted-foreground">{angle.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('photoshootModal.costLabel')}:</strong> {selectedAngles.length} {t('common.credit', { count: selectedAngles.length })} • 
                  <strong className="ml-2">{t('photoshootModal.anglesLabel')}:</strong> {t('photoshootModal.anglesCount', { count: selectedAngles.length, total: AVAILABLE_ANGLES.length })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setStage('setup')}>
                {t('photoshootModal.back')}
              </Button>
              <Button 
                onClick={handleStartPhotoshoot}
                disabled={loading || selectedAngles.length === 0}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('photoshootModal.starting')}
                  </>
                ) : (
                  t('photoshootModal.startPhotoshoot', { count: selectedAngles.length, plural: selectedAngles.length !== 1 ? 's' : '' })
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
                  <span className="text-muted-foreground">{t('photoshootModal.progress')}</span>
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
                  <p className="font-medium text-destructive">{t('photoshootModal.generationFailed')}</p>
                  <p className="text-sm text-muted-foreground">{photoshoot?.error || t('photoshootModal.unknownError')}</p>
                </div>
              </div>
            )}

            {isComplete && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-600">{t('photoshootModal.allAnglesGenerated')}</p>
              </div>
            )}

            {/* Original Image Reference */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('photoshootModal.originalImage')}</h3>
              <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                <img src={originalImageUrl} alt="Original" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Generated Images Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t('photoshootModal.generatedAngles')}</h3>
                {isComplete && (
                  <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                    <Download className="w-3 h-3 mr-1" />
                    {t('photoshootModal.downloadAll')}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedAngles.map((angleId, index) => {
                  const imageUrl = photoshoot?.[`image_${index + 1}_url` as keyof PhotoshootJob] as string | null;
                  const isGenerated = !!imageUrl;
                  const progressPerAngle = 100 / selectedAngles.length;
                  const isCurrentlyGenerating = isProcessing && photoshoot && 
                    photoshoot.progress >= index * progressPerAngle && 
                    photoshoot.progress < (index + 1) * progressPerAngle;

                  return (
                    <div key={angleId} className="space-y-2">
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                        {isGenerated ? (
                          <img src={imageUrl} alt={`${angleLabelsMap[angleId]}`} className="w-full h-full object-cover" />
                        ) : isCurrentlyGenerating ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            {t('photoshootModal.pending')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{angleLabelsMap[angleId]}</span>
                        {isGenerated && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadImage(imageUrl, index + 1)}
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
                  {t('photoshootModal.cancel')}
                </Button>
              )}
              <Button variant={isComplete ? "default" : "outline"} onClick={onClose}>
                {isComplete ? t('photoshootModal.done') : t('photoshootModal.close')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
