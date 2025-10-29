import { useState } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import { BaseModel } from "@/hooks/useBaseModels";
import { MultiGarmentUploader } from "@/components/MultiGarmentUploader";
import { BatchSwapPreview } from "@/components/BatchSwapPreview";
import { useOutfitSwapBatch } from "@/hooks/useOutfitSwapBatch";
import { useOutfitSwapLimit, OUTFIT_SWAP_COSTS } from "@/hooks/useOutfitSwapLimit";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Sparkles } from "lucide-react";
import { UploadModelDialog } from "@/components/UploadModelDialog";
import { AIModelGenerationForm } from "@/components/AIModelGenerationForm";
import { Button } from "@/components/ui/button";

const OutfitSwap = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { batch, jobs, loading, error, createBatch, cancelBatch, reset: resetBatch } = useOutfitSwapBatch();
  const { calculateBatchCost, canAffordBatch, getSavings } = useOutfitSwapLimit();
  const { uploadSourceImage } = useSourceImageUpload();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdminAuth();

  if (!isAdminLoading && !isAdmin) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to access this feature",
    });
    window.location.href = "/";
    return null;
  }

  const handleUploadModel = async (file: File, metadata: any) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { baseModelApi } = await import("@/api/base-model-api");
      const baseModel = await baseModelApi.uploadAndProcessModel(imageDataUrl, metadata);
      
      setSelectedModel(baseModel);
      setCurrentStep(2);
      toast({ title: "Model processed", description: "Your model has been processed (5 credits deducted)" });
      return baseModel;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to process model" });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAIModel = async (params: any) => {
    setIsProcessing(true);
    try {
      const { baseModelApi } = await import("@/api/base-model-api");
      const baseModel = await baseModelApi.generateModelWithAI(params);
      setSelectedModel(baseModel);
      setCurrentStep(2);
      toast({ title: "Model generated", description: "Your AI model has been generated (6 credits deducted)" });
      return baseModel;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to generate AI model" });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartBatch = async () => {
    if (!selectedModel || garmentFiles.length === 0) {
      toast({ variant: "destructive", title: "Missing information", description: "Please select a model and upload garments" });
      return;
    }

    try {
      const garmentIds: string[] = [];
      for (const file of garmentFiles) {
        const uploaded = await uploadSourceImage(file);
        garmentIds.push(uploaded.id);
      }
      await createBatch(selectedModel.id, garmentIds, { outputFormat: "jpg" });
      toast({ title: "Batch started", description: "Your outfit swap batch has been queued for processing" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to start batch" });
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedModel(null);
    setGarmentFiles([]);
    resetBatch();
  };

  if (isAdminLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {batch ? (
          <BatchSwapPreview batch={batch} jobs={jobs} onCancel={cancelBatch} onReset={handleReset} />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === step ? "bg-primary text-primary-foreground" : currentStep > step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{step}</div>
                  {step < 2 && <div className={`w-16 h-1 mx-2 ${currentStep > step ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            {currentStep === 1 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold mb-2">Step 1: Create or Upload Your Base Model</h2><p className="text-muted-foreground">Choose how you want to create your base model</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setShowUploadDialog(true)}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Upload Own Model</CardTitle><CardDescription>Upload your own image and we'll process it with AI</CardDescription></CardHeader>
                    <CardContent><div className="space-y-2"><p className="text-sm text-muted-foreground">• Background removal & replacement</p><p className="text-sm text-muted-foreground">• Professional studio lighting</p><p className="text-sm text-muted-foreground">• Ready for outfit swapping</p><Badge variant="secondary" className="mt-2">5 credits</Badge></div></CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setShowAIDialog(true)}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Create Model with AI</CardTitle><CardDescription>Generate a custom model using AI</CardDescription></CardHeader>
                    <CardContent><div className="space-y-2"><p className="text-sm text-muted-foreground">• Choose body type, age, features</p><p className="text-sm text-muted-foreground">• Photorealistic AI generation</p><p className="text-sm text-muted-foreground">• Fully customizable appearance</p><Badge variant="secondary" className="mt-2">6 credits</Badge></div></CardContent>
                  </Card>
                </div>
                {selectedModel && (<div className="p-4 border rounded-lg bg-card"><h3 className="font-semibold mb-2">Selected Model</h3><div className="flex items-center gap-4"><img src={selectedModel.public_url} alt={selectedModel.name} className="w-20 h-20 object-cover rounded" /><div><p className="font-medium">{selectedModel.name}</p><Button variant="outline" size="sm" className="mt-2" onClick={() => setCurrentStep(2)}>Continue to Upload Garments</Button></div></div></div>)}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div><h2 className="text-2xl font-bold mb-2">Step 2: Upload Garments</h2><p className="text-muted-foreground">Upload up to {OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE} garment images to swap</p></div>
                <MultiGarmentUploader garments={garmentFiles} onGarmentsChange={setGarmentFiles} maxGarments={OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE} />
                {garmentFiles.length > 0 && (<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-card"><div><p className="text-sm font-medium">{garmentFiles.length} garment{garmentFiles.length !== 1 ? "s" : ""} selected</p><p className="text-sm text-muted-foreground">Cost: {calculateBatchCost(garmentFiles.length)} credits{getSavings(garmentFiles.length) > 0 && (<Badge variant="secondary" className="ml-2">Save {getSavings(garmentFiles.length)} credits</Badge>)}</p></div></div>)}
                <div className="flex gap-2"><Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button><Button onClick={handleStartBatch} disabled={garmentFiles.length === 0 || !canAffordBatch(garmentFiles.length)}>Start Batch ({calculateBatchCost(garmentFiles.length)} credits)</Button></div>
              </div>
            )}
          </>
        )}
      </div>
      <UploadModelDialog isOpen={showUploadDialog} onClose={() => setShowUploadDialog(false)} onUpload={handleUploadModel} uploading={isProcessing} />
      <AIModelGenerationForm isOpen={showAIDialog} onClose={() => setShowAIDialog(false)} onGenerate={handleGenerateAIModel} isGenerating={isProcessing} />
    </div>
  );
};

export default OutfitSwap;
