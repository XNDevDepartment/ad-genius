import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Loader2, Download, Video, Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useOutfitCreator } from "@/hooks/useOutfitCreator";
import { BaseModelSelector } from "@/components/BaseModelSelector";
import { OutfitCreatorSlots, SlotType, GarmentSlotData } from "@/components/OutfitCreatorSlots";
import { BaseModel } from "@/hooks/useBaseModels";
import { GarmentSlots } from "@/api/outfit-creator-api";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/PageTransition";

const OutfitCreator = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const {
    job,
    result,
    loading,
    createJob,
    cancelJob,
    reset,
    isProcessing,
    isComplete,
    isFailed,
    progress,
    currentPass,
    totalPasses,
  } = useOutfitCreator();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [slots, setSlots] = useState<Record<SlotType, GarmentSlotData | undefined>>({
    top: undefined,
    bottom: undefined,
    shoes: undefined,
    accessory_1: undefined,
    accessory_2: undefined,
  });

  // Calculate cost and validate
  const filledSlots = useMemo(() => 
    Object.entries(slots).filter(([_, data]) => data?.sourceImageId),
    [slots]
  );
  const hasRequiredSlots = slots.top?.sourceImageId || slots.bottom?.sourceImageId;
  const cost = 3; // Fixed cost per outfit

  const handleModelSelect = (model: BaseModel | null) => {
    setSelectedModel(model);
    if (model) {
      // Smooth transition to step 2
      setTimeout(() => setCurrentStep(2), 300);
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel || !hasRequiredSlots) return;

    const garments: GarmentSlots = {};
    if (slots.top?.sourceImageId) garments.top = slots.top.sourceImageId;
    if (slots.bottom?.sourceImageId) garments.bottom = slots.bottom.sourceImageId;
    if (slots.shoes?.sourceImageId) garments.shoes = slots.shoes.sourceImageId;
    if (slots.accessory_1?.sourceImageId) garments.accessory_1 = slots.accessory_1.sourceImageId;
    if (slots.accessory_2?.sourceImageId) garments.accessory_2 = slots.accessory_2.sourceImageId;

    await createJob(selectedModel.id, garments);
  };

  const handleReset = () => {
    reset();
    setCurrentStep(1);
    setSelectedModel(null);
    setSlots({
      top: undefined,
      bottom: undefined,
      shoes: undefined,
      accessory_1: undefined,
      accessory_2: undefined,
    });
  };

  const handleDownload = async () => {
    if (!result?.public_url) return;
    
    try {
      const response = await fetch(result.public_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outfit-${job?.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Render result view
  if (isComplete && result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('outfitCreator.resultTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('outfitCreator.resultSubtitle')}</p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] relative">
              <img
                src={result.public_url}
                alt="Generated outfit"
                className="w-full h-full object-cover"
              />
            </div>
            
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  {t('outfitCreator.download')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/create/video', { state: { imageUrl: result.public_url } })}
                  className="flex-1"
                >
                  <Video className="w-4 h-4 mr-2" />
                  {t('outfitCreator.createVideo')}
                </Button>
              </div>
              
              <div className="flex gap-3 mt-3">
                <Button variant="outline" className="flex-1" disabled>
                  <Camera className="w-4 h-4 mr-2" />
                  {t('outfitCreator.photoshoot')}
                  <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {t('outfitCreator.ecommerce')}
                  <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                </Button>
              </div>
              
              <Button variant="ghost" className="w-full mt-4" onClick={handleReset}>
                {t('outfitCreator.createAnother')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render processing view
  if (isProcessing || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 p-8">
          <div className="text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <Loader2 className="w-20 h-20 animate-spin text-primary" />
              <Palette className="w-8 h-8 absolute inset-0 m-auto text-primary" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold">{t('outfitCreator.generating')}</h2>
              <p className="text-muted-foreground mt-1">
                {t('outfitCreator.pass', { current: currentPass, total: totalPasses })}
              </p>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
            
            <Button variant="outline" onClick={cancelJob}>
              {t('outfitCreator.cancel')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Render failed view
  if (isFailed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 p-8 text-center">
          <div className="text-destructive mb-4">
            <span className="text-4xl">😔</span>
          </div>
          <h2 className="text-xl font-semibold">{t('outfitCreator.failed')}</h2>
          <p className="text-muted-foreground mt-2">{job?.error || t('outfitCreator.failedDesc')}</p>
          <Button className="mt-6" onClick={handleReset}>
            {t('outfitCreator.tryAgain')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('outfitCreator.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('outfitCreator.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                  currentStep >= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step}
              </div>
              {step < 2 && <div className="w-16 h-1 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Model Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold text-center">{t('outfitCreator.step1Title')}</h2>
            <BaseModelSelector
              selectedModel={selectedModel}
              onSelectModel={handleModelSelect}
              showUpload={true}
            />
          </div>
        )}

        {/* Step 2: Garment Slots */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('outfitCreator.step2Title')}</h2>
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                {t('outfitCreator.changeModel')}
              </Button>
            </div>

            {/* Selected model preview */}
            {selectedModel && (
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedModel.thumbnail_url || selectedModel.public_url}
                    alt={selectedModel.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-medium">{selectedModel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedModel.gender} • {selectedModel.body_type}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Garment slots */}
            <OutfitCreatorSlots
              slots={slots}
              onSlotsChange={setSlots}
              disabled={loading}
            />

            {/* Cost and Generate */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold">{t('outfitCreator.totalCost')}</p>
                  <p className="text-sm text-muted-foreground">
                    {filledSlots.length} {t('outfitCreator.garmentsSelected')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{cost}</p>
                  <p className="text-sm text-muted-foreground">{t('outfitCreator.credits')}</p>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={!hasRequiredSlots || loading}
              >
                {t('outfitCreator.generate')}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default OutfitCreator;
