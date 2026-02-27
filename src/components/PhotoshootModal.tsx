import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, X, Loader2, CheckCircle2, XCircle, Shirt, Footprints, Scissors } from "lucide-react";
import { photoshootApi, PhotoshootJob } from "@/api/photoshoot-api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

type GarmentCategory = 'TOP' | 'BOTTOM' | 'FOOTWEAR' | 'FULL_BODY';

const CATEGORY_OPTIONS: { id: GarmentCategory; iconName: string; labelKey: string; descKey: string }[] = [
  { id: 'TOP', iconName: 'shirt', labelKey: 'photoshootModal.categories.top.label', descKey: 'photoshootModal.categories.top.description' },
  { id: 'BOTTOM', iconName: 'scissors', labelKey: 'photoshootModal.categories.bottom.label', descKey: 'photoshootModal.categories.bottom.description' },
  { id: 'FOOTWEAR', iconName: 'footprints', labelKey: 'photoshootModal.categories.footwear.label', descKey: 'photoshootModal.categories.footwear.description' },
  { id: 'FULL_BODY', iconName: 'full', labelKey: 'photoshootModal.categories.fullBody.label', descKey: 'photoshootModal.categories.fullBody.description' },
];

const CATEGORY_ANGLES: Record<GarmentCategory, { id: string; labelKey: string; descKey: string }[]> = {
  TOP: [
    { id: 'three_quarter', labelKey: 'photoshootModal.angles.threeQuarter.label', descKey: 'photoshootModal.angles.threeQuarter.description' },
    { id: 'back', labelKey: 'photoshootModal.angles.back.label', descKey: 'photoshootModal.angles.back.description' },
    { id: 'side', labelKey: 'photoshootModal.angles.side.label', descKey: 'photoshootModal.angles.side.description' },
    { id: 'arms_crossed', labelKey: 'photoshootModal.angles.armsCrossed.label', descKey: 'photoshootModal.angles.armsCrossed.description' },
    { id: 'hand_on_hip', labelKey: 'photoshootModal.angles.handOnHip.label', descKey: 'photoshootModal.angles.handOnHip.description' },
    { id: 'detail', labelKey: 'photoshootModal.angles.detail.label', descKey: 'photoshootModal.angles.detail.description' },
  ],
  BOTTOM: [
    { id: 'lower_body_front', labelKey: 'photoshootModal.angles.lowerBodyFront.label', descKey: 'photoshootModal.angles.lowerBodyFront.description' },
    { id: 'back', labelKey: 'photoshootModal.angles.back.label', descKey: 'photoshootModal.angles.back.description' },
    { id: 'side', labelKey: 'photoshootModal.angles.side.label', descKey: 'photoshootModal.angles.side.description' },
    { id: 'walking_pose', labelKey: 'photoshootModal.angles.walkingPose.label', descKey: 'photoshootModal.angles.walkingPose.description' },
    { id: 'seated', labelKey: 'photoshootModal.angles.seated.label', descKey: 'photoshootModal.angles.seated.description' },
    { id: 'lower_body_detail', labelKey: 'photoshootModal.angles.lowerBodyDetail.label', descKey: 'photoshootModal.angles.lowerBodyDetail.description' },
  ],
  FOOTWEAR: [
    { id: 'shoe_front', labelKey: 'photoshootModal.angles.shoeFront.label', descKey: 'photoshootModal.angles.shoeFront.description' },
    { id: 'shoe_side', labelKey: 'photoshootModal.angles.shoeSide.label', descKey: 'photoshootModal.angles.shoeSide.description' },
    { id: 'shoe_back', labelKey: 'photoshootModal.angles.shoeBack.label', descKey: 'photoshootModal.angles.shoeBack.description' },
    { id: 'walking_pose', labelKey: 'photoshootModal.angles.walkingPose.label', descKey: 'photoshootModal.angles.walkingPose.description' },
    { id: 'cross_legged', labelKey: 'photoshootModal.angles.crossLegged.label', descKey: 'photoshootModal.angles.crossLegged.description' },
  ],
  FULL_BODY: [
    { id: 'three_quarter', labelKey: 'photoshootModal.angles.threeQuarter.label', descKey: 'photoshootModal.angles.threeQuarter.description' },
    { id: 'back', labelKey: 'photoshootModal.angles.back.label', descKey: 'photoshootModal.angles.back.description' },
    { id: 'side', labelKey: 'photoshootModal.angles.side.label', descKey: 'photoshootModal.angles.side.description' },
    { id: 'walking_pose', labelKey: 'photoshootModal.angles.walkingPose.label', descKey: 'photoshootModal.angles.walkingPose.description' },
    { id: 'hand_on_hip', labelKey: 'photoshootModal.angles.handOnHip.label', descKey: 'photoshootModal.angles.handOnHip.description' },
    { id: 'over_shoulder', labelKey: 'photoshootModal.angles.overShoulder.label', descKey: 'photoshootModal.angles.overShoulder.description' },
    { id: 'detail', labelKey: 'photoshootModal.angles.detail.label', descKey: 'photoshootModal.angles.detail.description' },
  ],
};

interface PhotoshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
  originalImageUrl: string;
}

export const PhotoshootModal = ({ isOpen, onClose, resultId, originalImageUrl }: PhotoshootModalProps) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'setup' | 'category-selection' | 'angle-selection' | 'processing'>('setup');
  const [photoshoot, setPhotoshoot] = useState<PhotoshootJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);

  const categoryAnglesConfig = selectedCategory ? CATEGORY_ANGLES[selectedCategory] : [];
  const AVAILABLE_ANGLES = categoryAnglesConfig.map(angle => ({
    id: angle.id,
    label: t(angle.labelKey, { defaultValue: angle.id.replace(/_/g, ' ') }),
    description: t(angle.descKey, { defaultValue: `${angle.id} view` })
  }));

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

  const handleContinueToCategorySelection = () => {
    setStage('category-selection');
  };

  const handleCategorySelected = (category: GarmentCategory) => {
    setSelectedCategory(category);
    const angles = CATEGORY_ANGLES[category].map(a => a.id);
    setSelectedAngles(angles);
    setStage('angle-selection');
  };

  const handleStartPhotoshoot = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    setStage('processing');

    try {
      const createdPhotoshoot = await photoshootApi.createPhotoshoot(resultId, selectedAngles, backImageUrl || undefined, selectedCategory);
      setPhotoshoot(createdPhotoshoot);

      const unsubscribe = photoshootApi.subscribeToPhotoshoot(createdPhotoshoot.id, (updatedPhotoshoot) => {
        setPhotoshoot(updatedPhotoshoot);

        if (updatedPhotoshoot.status === "completed") {
          toast.success(t('photoshootModal.photoshootCompleted'));
          
          if (backImageUrl && backImageUrl.includes('outfit-user-models/temp/')) {
            const path = backImageUrl.split('outfit-user-models/')[1];
            supabase.storage.from('outfit-user-models').remove([path]).catch(console.error);
          }
        } else if (updatedPhotoshoot.status === "failed") {
          toast.error(updatedPhotoshoot.error || t('photoshootModal.photoshootFailed'));
        }
      });

      setLoading(false);
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
      setStage('setup');
      setPhotoshoot(null);
      setBackImageFile(null);
      setBackImageUrl(null);
      setSelectedCategory(null);
      setSelectedAngles([]);
    }
  }, [isOpen]);

  const toggleAngle = (angleId: string) => {
    setSelectedAngles(prev => {
      if (prev.includes(angleId)) {
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
    if (AVAILABLE_ANGLES.length > 0) {
      setSelectedAngles([AVAILABLE_ANGLES[0].id]);
    }
  };

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

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'shirt': return <Shirt className="w-6 h-6" />;
      case 'scissors': return <Scissors className="w-6 h-6" />;
      case 'footprints': return <Footprints className="w-6 h-6" />;
      default: return <Shirt className="w-6 h-6" />;
    }
  };

  const getStepNumber = () => {
    switch (stage) {
      case 'setup': return 1;
      case 'category-selection': return 2;
      case 'angle-selection': return 3;
      case 'processing': return 4;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{t('photoshootModal.title')}</DialogTitle>
          <DialogDescription>
            {stage === 'setup' && t('photoshootModal.setupDescription')}
            {stage === 'category-selection' && t('photoshootModal.categorySelectionDescription')}
            {stage === 'angle-selection' && t('photoshootModal.angleSelectionDescription', { count: selectedAngles.length, plural: selectedAngles.length !== 1 ? 's' : '' })}
            {stage === 'processing' && t('photoshootModal.processingDescription')}
          </DialogDescription>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${step <= getStepNumber() ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </DialogHeader>

        {stage === 'setup' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
              <div className="space-y-2">
                <Label>{t('photoshootModal.originalImage')}</Label>
                <img 
                  src={originalImageUrl} 
                  alt="Original outfit swap"
                  className="w-full rounded-lg border max-h-40 sm:max-h-64 object-contain"
                />
              </div>

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
              <div className="sticky bottom-0 border-t bg-background p-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>
                  {t('photoshootModal.cancel')}
                </Button>
                <Button 
                  onClick={handleContinueToCategorySelection}
                  disabled={isUploading}
                  size="lg"
                >
                  {t('photoshootModal.continue')}
                </Button>
              </div>
            </div>
          </>
        ) : stage === 'category-selection' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
              <div className="space-y-2">
                <Label>{t('photoshootModal.originalImage')}</Label>
                <img
                  src={originalImageUrl} 
                  alt="Original outfit swap"
                  className="w-full rounded-lg border max-h-32 sm:max-h-48 object-contain"
                />
              </div>

              <div className="space-y-4">
                <Label>{t('photoshootModal.selectCategoryLabel')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center text-center gap-2"
                      onClick={() => handleCategorySelected(cat.id)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {getCategoryIcon(cat.iconName)}
                      </div>
                      <h4 className="font-semibold text-sm">
                        {t(cat.labelKey, { defaultValue: cat.id })}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t(cat.descKey, { defaultValue: '' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 border-t bg-background p-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStage('setup')}>
                  {t('photoshootModal.back')}
                </Button>
              </div>
            </div>
          </>
        ) : stage === 'angle-selection' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
              <div className="space-y-2">
                <Label>{t('photoshootModal.originalImage')}</Label>
                <img
                  src={originalImageUrl} 
                  alt="Original outfit swap"
                  className="w-full rounded-lg border max-h-32 sm:max-h-48 object-contain"
                />
              </div>

              <div className="space-y-4">
                <div className="flex-col items-center justify-between space-y-4">
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
            <div className="sticky bottom-0 border-t bg-background p-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStage('category-selection')}>
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

          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('photoshootModal.progress')}</span>
                    <span className="font-medium">{photoshoot?.progress}%</span>
                  </div>
                  <Progress value={photoshoot?.progress} />
                </div>
              )}

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

              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('photoshootModal.originalImage')}</h3>
                <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                  <img src={originalImageUrl} alt="Original" className="w-full h-full object-cover" />
                </div>
              </div>

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

                    const angleConfig = categoryAnglesConfig.find(a => a.id === angleId);
                    const angleLabel = angleConfig ? t(angleConfig.labelKey, { defaultValue: angleId }) : angleId;

                    return (
                      <div key={angleId} className="space-y-2">
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                          {isGenerated ? (
                            <img src={imageUrl} alt={angleLabel} className="w-full h-full object-cover" />
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
                          <span className="text-xs text-muted-foreground">{angleLabel}</span>
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
            <div className="sticky bottom-0 border-t bg-background p-4 flex justify-end gap-2">
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

          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
