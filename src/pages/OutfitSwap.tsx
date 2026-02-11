import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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
  const { toast } = useToast();
  const { batch, jobs, loading: batchLoading, createBatch, cancelBatch, reset, refreshBatch, retryJob, retryingJobs } = useOutfitSwapBatch();
  const { calculateBatchCost, canAffordBatch, getSavings } = useOutfitSwapLimit();
  const { uploadSourceImage } = useSourceImageUpload();

  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
  const [garmentDetails, setGarmentDetails] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({});

  // Scroll refs for progressive disclosure
  const garmentRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const prevModelRef = useRef<BaseModel | null>(null);
  const prevGarmentCountRef = useRef<number>(0);
  
  // Replicate mode state
  const [replicateMode, setReplicateMode] = useState(false);
  const [replicatedJob, setReplicatedJob] = useState<OutfitSwapJob | null>(null);
  const [replicatedResult, setReplicatedResult] = useState<OutfitSwapResult | null>(null);


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

  // Smooth scroll when model is selected
  useEffect(() => {
    if (!prevModelRef.current && selectedModel && garmentRef.current) {
      setTimeout(() => {
        garmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevModelRef.current = selectedModel;
  }, [selectedModel]);

  // Smooth scroll when garments are added
  useEffect(() => {
    if (prevGarmentCountRef.current === 0 && garmentFiles.length > 0 && reviewRef.current) {
      setTimeout(() => {
        reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevGarmentCountRef.current = garmentFiles.length;
  }, [garmentFiles.length]);

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
    setSelectedModel(null);
    setGarmentFiles([]);
    setGarmentDetails({});
    setReplicateMode(false);
    setReplicatedJob(null);
    setReplicatedResult(null);
    navigate('/create/outfit-swap', { replace: true });
  };

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

        {/* Show batch preview if processing/complete or in replicate mode */}
        {batch || replicateMode ? (
          (() => {
            // If in replicate mode with a single result, construct a display batch
            const displayBatch = replicateMode && replicatedJob && replicatedResult
              ? {
                  id: replicatedJob.id,
                  user_id: replicatedJob.user_id,
                  base_model_id: replicatedJob.base_model_id || '',
                  total_jobs: 1,
                  completed_jobs: 1,
                  failed_jobs: 0,
                  status: 'completed' as const,
                  metadata: replicatedJob.metadata || {},
                  created_at: replicatedJob.created_at,
                  updated_at: replicatedJob.updated_at,
                  started_at: replicatedJob.started_at,
                  finished_at: replicatedJob.finished_at,
                }
              : batch;
              
            const displayJobs = replicateMode && replicatedJob
              ? [replicatedJob]
              : jobs;
              
            const initialResults = replicateMode && replicatedResult && replicatedJob
              ? { [replicatedJob.id]: replicatedResult }
              : undefined;

            return (
              <BatchSwapPreview
                batch={displayBatch!}
                jobs={displayJobs}
                onCancel={cancelBatch}
                onReset={handleReset}
                onRefresh={refreshBatch}
                onRetryJob={retryJob}
                retryingJobs={retryingJobs}
                loading={batchLoading}
                initialResults={initialResults}
              />
            );
          })()
        ) : (
          <div className="space-y-6">
            {/* Section 1: Select Model */}
            <Card className="rounded-apple shadow-lg scroll-mt-6 p-6 lg:p-8">
              <h2 className="text-xl font-semibold mb-4">{t('outfitSwap.steps.step1Title')}</h2>
              <BaseModelSelector
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                showUpload={true}
              />
            </Card>

            {/* Section 2: Upload Garments - visible when model selected */}
            {selectedModel && (
              <Card ref={garmentRef} className="rounded-apple shadow-lg scroll-mt-6 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{t('outfitSwap.steps.step2Title')}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedModel(null);
                      setGarmentFiles([]);
                      setGarmentDetails({});
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
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
              </Card>
            )}

            {/* Section 3: Review & Start - visible when garments uploaded */}
            {selectedModel && garmentFiles.length > 0 && (
              <div ref={reviewRef} className="scroll-mt-6 space-y-6">
                <Card className="rounded-apple shadow-lg p-6 lg:p-8">
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

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleStartBatch}
                    disabled={!canAfford || batchLoading || uploading}
                    className="min-w-[200px]"
                  >
                    {uploading
                      ? t('outfitSwap.actions.uploading')
                      : batchLoading
                      ? t('outfitSwap.actions.starting')
                      : t('outfitSwap.actions.startBatch', { cost })}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitSwap;
