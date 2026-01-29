import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MultiImageUploader from "@/components/MultiImageUploader";
import BackgroundPicker from "@/components/bulk-background/BackgroundPicker";
import { backgroundPresets } from "@/data/background-presets";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";

type Step = 1 | 2 | 3 | 4;

const CREDITS_PER_IMAGE = 2;
const MAX_IMAGES = 20;

const BulkBackground = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits } = useCredits();

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  
  // Step 1: Product images
  const [productImages, setProductImages] = useState<File[]>([]);
  
  // Step 2: Background selection
  const [customBackground, setCustomBackground] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  // Step 4: Processing & results
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processedResults, setProcessedResults] = useState<string[]>([]);

  // Calculate total cost
  const totalCost = productImages.length * CREDITS_PER_IMAGE;
  const hasEnoughCredits = credits >= totalCost;

  // Get selected background name
  const selectedBackgroundName = useMemo(() => {
    if (customBackground) return customBackground.name;
    if (selectedPreset) {
      const preset = backgroundPresets.find(p => p.id === selectedPreset);
      return preset?.name || selectedPreset;
    }
    return null;
  }, [customBackground, selectedPreset]);

  // Navigation helpers
  const canProceedStep1 = productImages.length > 0;
  const canProceedStep2 = customBackground !== null || selectedPreset !== null;
  const canProceedStep3 = hasEnoughCredits && canProceedStep1 && canProceedStep2;

  const goToStep = (newStep: Step) => {
    setStep(newStep);
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    setStep(4);
    
    // TODO: Implement actual API call for batch processing
    // This is a placeholder for the processing logic
    for (let i = 0; i < productImages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
      setProcessedCount(i + 1);
      // setProcessedResults(prev => [...prev, `https://placeholder.com/result-${i}.jpg`]);
    }
    
    setIsProcessing(false);
  };

  const handleNewBatch = () => {
    setStep(1);
    setProductImages([]);
    setCustomBackground(null);
    setSelectedPreset(null);
    setProcessedCount(0);
    setProcessedResults([]);
  };

  const stepTitles = [
    t("bulkBackground.steps.upload"),
    t("bulkBackground.steps.background"),
    t("bulkBackground.steps.review"),
    t("bulkBackground.steps.results")
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {t("bulkBackground.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("bulkBackground.description")}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center gap-2 ${s <= step ? "text-primary" : "text-muted-foreground"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                    s < step
                      ? "bg-primary border-primary text-primary-foreground"
                      : s === step
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className="hidden md:block text-sm">{stepTitles[s - 1]}</span>
              </div>
            ))}
          </div>
          <Progress value={(step / 4) * 100} className="h-2" />
        </div>

        {/* Step 1: Upload Products */}
        {step === 1 && (
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>{t("bulkBackground.uploadProducts.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("bulkBackground.uploadProducts.subtitle", { max: MAX_IMAGES })}
              </p>
            </CardHeader>
            <CardContent>
              <MultiImageUploader
                selectedImages={productImages}
                onImagesSelect={setProductImages}
                maxImages={MAX_IMAGES}
              />
              
              {productImages.length > 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("bulkBackground.uploadProducts.imagesUploaded", { count: productImages.length })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Background */}
        {step === 2 && (
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>{t("bulkBackground.selectBackground.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BackgroundPicker
                customBackground={customBackground}
                selectedPreset={selectedPreset}
                onCustomUpload={setCustomBackground}
                onPresetSelect={setSelectedPreset}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>{t("bulkBackground.review.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-apple p-4">
                  <p className="text-sm text-muted-foreground">{t("bulkBackground.review.products")}</p>
                  <p className="text-2xl font-bold">{productImages.length}</p>
                </div>
                <div className="bg-muted/30 rounded-apple p-4">
                  <p className="text-sm text-muted-foreground">{t("bulkBackground.review.background")}</p>
                  <p className="text-lg font-medium truncate">{selectedBackgroundName}</p>
                </div>
              </div>

              {/* Cost Calculation */}
              <div className="bg-primary/10 rounded-apple p-4 border border-primary/20">
                <p className="text-sm text-muted-foreground">{t("bulkBackground.review.totalCost")}</p>
                <p className="text-2xl font-bold text-primary">{totalCost} credits</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("bulkBackground.review.creditsPerImage", { credits: CREDITS_PER_IMAGE, count: productImages.length })}
                </p>
                {!hasEnoughCredits && (
                  <p className="text-xs text-destructive mt-2">
                    You have {credits} credits. You need {totalCost - credits} more.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Processing & Results */}
        {step === 4 && (
          <Card className="bg-transparent">
            <CardHeader>
              <CardTitle>
                {isProcessing 
                  ? t("bulkBackground.processing.title") 
                  : t("bulkBackground.results.title")
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isProcessing ? (
                <>
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                  <Progress value={(processedCount / productImages.length) * 100} className="h-3" />
                  <p className="text-center text-sm text-muted-foreground">
                    {t("bulkBackground.processing.progress", { 
                      current: processedCount, 
                      total: productImages.length 
                    })}
                  </p>
                </>
              ) : (
                <>
                  {/* Results grid - placeholder for now */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {productImages.map((_, index) => (
                      <div 
                        key={index}
                        className="aspect-square bg-muted rounded-apple flex items-center justify-center"
                      >
                        <Check className="h-8 w-8 text-primary" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1 gap-2" disabled>
                      <Download className="h-4 w-4" />
                      {t("bulkBackground.results.downloadAll")}
                    </Button>
                    <Button variant="outline" onClick={handleNewBatch}>
                      {t("bulkBackground.buttons.newBatch")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => goToStep((step - 1) as Step)}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("bulkBackground.buttons.back")}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => goToStep((step + 1) as Step)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="gap-2"
              >
                {t("bulkBackground.buttons.next")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleStartProcessing}
                disabled={!canProceedStep3}
                className="gap-2"
              >
                {t("bulkBackground.buttons.startProcessing")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkBackground;
