import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useOutfitSwapBatch } from "@/hooks/useOutfitSwapBatch";
import { useOutfitSwapLimit } from "@/hooks/useOutfitSwapLimit";
import { useToast } from "@/hooks/use-toast";
import { BaseModelSelector } from "@/components/BaseModelSelector";
import { MultiGarmentUploader } from "@/components/MultiGarmentUploader";
import { BatchSwapPreview } from "@/components/BatchSwapPreview";
import { OutfitSwapSettings } from "@/components/OutfitSwapSettings";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { BaseModel } from "@/hooks/useBaseModels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const OutfitSwap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  const { batch, jobs, loading, createBatch, cancelBatch, reset, refreshBatch } = useOutfitSwapBatch();
  const { calculateBatchCost, canAffordBatch, getSavings } = useOutfitSwapLimit();
  const { uploadSourceImage } = useSourceImageUpload();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    outputFormat: "both" as "jpg" | "png" | "both",
  });

  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate("/");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Admin access required for Outfit Swap module",
      });
    }
  }, [user, isAdmin, adminLoading, navigate, toast]);

  const handleStartBatch = async () => {
    if (!selectedModel || garmentFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing data",
        description: "Please select a model and upload garments",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload all garments
      const garmentIds: string[] = [];
      for (const file of garmentFiles) {
        const uploaded = await uploadSourceImage(file);
        garmentIds.push(uploaded.id);
      }

      // Create batch
      await createBatch(selectedModel.id, garmentIds, settings);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to start batch",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    reset();
    setCurrentStep(1);
    setSelectedModel(null);
    setGarmentFiles([]);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const cost = calculateBatchCost(garmentFiles.length);
  const savings = getSavings(garmentFiles.length);
  const canAfford = canAffordBatch(garmentFiles.length);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shirt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Outfit Swap</h1>
              <p className="text-sm text-muted-foreground">
                Process up to 10 garments at once
              </p>
            </div>
          </div>
        </div>

        {/* Show batch preview if processing/complete */}
        {batch ? (
          <BatchSwapPreview
            batch={batch}
            jobs={jobs}
            onCancel={cancelBatch}
            onReset={handleReset}
            onRefresh={refreshBatch}
            loading={loading}
          />
        ) : (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 2 && <div className="w-16 h-1 bg-muted mx-2" />}
                </div>
              ))}
            </div>

            {/* Step 1: Select Model */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Step 1: Select Base Model</h2>
                <BaseModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  showUpload={true}
                />
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedModel}
                  >
                    Continue to Upload Garments
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload Garments & Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Step 2: Upload Garments</h2>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Change Model
                  </Button>
                </div>
                
                <MultiGarmentUploader
                  garments={garmentFiles}
                  onGarmentsChange={setGarmentFiles}
                  maxGarments={10}
                />

                {/* Review & Settings - Shown inline when garments are uploaded */}
                {garmentFiles.length > 0 && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Review & Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Selected Model:</span>
                          <span>{selectedModel?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Garments:</span>
                          <span>{garmentFiles.length} garments</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Cost:</span>
                          <div className="text-right">
                            <span className="text-lg font-bold">{cost} credits</span>
                            {savings > 0 && (
                              <Badge variant="default" className="ml-2">
                                Save {savings} credits!
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <OutfitSwapSettings settings={settings} onChange={setSettings} />
                  </>
                )}

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartBatch}
                    disabled={garmentFiles.length === 0 || !canAfford || loading || uploading}
                    className="min-w-[200px]"
                  >
                    {uploading
                      ? "Uploading..."
                      : loading
                      ? "Starting..."
                      : `Start Batch (${cost} credits)`}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OutfitSwap;
