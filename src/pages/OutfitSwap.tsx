import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { useTranslation } from "react-i18next";
import { OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { supabase } from "@/integrations/supabase/client";

const OutfitSwap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  const { batch, jobs, loading, createBatch, cancelBatch, reset, refreshBatch, retryJob, retryingJobs } = useOutfitSwapBatch();
  const { calculateBatchCost, canAffordBatch, getSavings } = useOutfitSwapLimit();
  const { uploadSourceImage } = useSourceImageUpload();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
  const [garmentDetails, setGarmentDetails] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({});
  
  // Replicate mode state
  const [replicateMode, setReplicateMode] = useState(false);
  const [replicatedJob, setReplicatedJob] = useState<OutfitSwapJob | null>(null);
  const [replicatedResult, setReplicatedResult] = useState<OutfitSwapResult | null>(null);

  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate("/");
      toast({
        variant: "destructive",
        title: t('outfitSwap.errors.accessDenied'),
        description: t('outfitSwap.errors.adminRequired'),
      });
    }
  }, [user, isAdmin, adminLoading, navigate, toast, t]);

  // Handle replicate mode from location state
  useEffect(() => {
    const state = location.state as any;
    if (state?.replicateMode && state?.jobId && state?.resultId) {
      const loadReplicateData = async () => {
        try {
          // Fetch the job
          const { data: jobData, error: jobError } = await supabase
            .from('outfit_swap_jobs')
            .select('*')
            .eq('id', state.jobId)
            .single();

          if (jobError) throw jobError;

          // Fetch the result
          const { data: resultData, error: resultError } = await supabase
            .from('outfit_swap_results')
            .select('*')
            .eq('id', state.resultId)
            .single();

          if (resultError) throw resultError;

          setReplicatedJob(jobData as OutfitSwapJob);
          setReplicatedResult(resultData as OutfitSwapResult);
          setReplicateMode(true);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Failed to Load Result",
            description: error.message,
          });
    navigate('/create/outfit-swap', { replace: true });
        }
      };

      loadReplicateData();
    }
  }, [location.state]);

  const handleStartBatch = async () => {
    if (!selectedModel || garmentFiles.length === 0) {
      toast({
        variant: "destructive",
        title: t('outfitSwap.errors.missingData'),
        description: t('outfitSwap.errors.selectModelAndGarments'),
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

      // Prepare garment details array
      const detailsArray = garmentFiles.map((_, index) => garmentDetails[index] || "");

      // Create batch with garment details
      await createBatch(selectedModel.id, garmentIds, { ...settings, garmentDetails: detailsArray });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('outfitSwap.errors.failedToStart'),
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
    setGarmentDetails({});
    setReplicateMode(false);
    setReplicatedJob(null);
    setReplicatedResult(null);
    navigate('/outfit-swap', { replace: true });
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
              <h1 className="text-2xl font-bold">{t('outfitSwap.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('outfitSwap.subtitle')}
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
            onRetryJob={retryJob}
            retryingJobs={retryingJobs}
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
                <h2 className="text-xl font-semibold">{t('outfitSwap.steps.step1Title')}</h2>
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
                    {t('outfitSwap.steps.continueToUpload')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload Garments & Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{t('outfitSwap.steps.step2Title')}</h2>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    {t('outfitSwap.steps.changeModel')}
                  </Button>
                </div>

                <MultiGarmentUploader
                  garments={garmentFiles}
                  garmentDetails={garmentDetails}
                  onGarmentsChange={(files, details) => {
                    setGarmentFiles(files);
                    setGarmentDetails(details);
                  }}
                  maxGarments={10}
                />

                {/* Review & Settings - Shown inline when garments are uploaded */}
                {garmentFiles.length > 0 && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">{t('outfitSwap.review.title')}</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{t('outfitSwap.review.selectedModel')}</span>
                          <span>{selectedModel?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{t('outfitSwap.review.garments')}</span>
                          <span>{t('outfitSwap.review.garmentsCount', { count: garmentFiles.length })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{t('outfitSwap.review.cost')}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold">{cost} {t('outfitSwap.review.credits')}</span>
                            {savings > 0 && (
                              <Badge variant="default" className="ml-2">
                                {t('outfitSwap.review.saveCredits', { savings })}
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
                    {t('outfitSwap.steps.back')}
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartBatch}
                    disabled={garmentFiles.length === 0 || !canAfford || loading || uploading}
                    className="min-w-[200px]"
                  >
                    {uploading
                      ? t('outfitSwap.actions.uploading')
                      : loading
                      ? t('outfitSwap.actions.starting')
                      : t('outfitSwap.actions.startBatch', { cost })}
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
