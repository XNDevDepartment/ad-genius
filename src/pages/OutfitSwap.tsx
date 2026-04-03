import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Shirt, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOutfitSwapBatch } from "@/hooks/useOutfitSwapBatch";
import { useCredits } from "@/hooks/useCredits";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { BaseModelSelector } from "@/components/BaseModelSelector";
import { MultiGarmentUploader } from "@/components/MultiGarmentUploader";
import { BatchSwapPreview } from "@/components/BatchSwapPreview";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { BaseModel } from "@/hooks/useBaseModels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { supabase } from "@/integrations/supabase/client";
import OutfitSwapBackgroundPicker from "@/components/outfit-swap/OutfitSwapBackgroundPicker";
import { modelBackgroundPresets } from "@/data/background-presets";
import { PageTransition } from "@/components/PageTransition";

const OutfitSwap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { batch, jobs, loading: batchLoading, createBatch, cancelBatch, reset, refreshBatch, retryJob, retryingJobs } = useOutfitSwapBatch();
  const { getRemainingCredits, isFreeTier } = useCredits();
  const { isAdmin } = useAdminAuth();
  const { uploadSourceImage } = useSourceImageUpload();

  const [selectedModel, setSelectedModel] = useState<BaseModel | null>(null);
  const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
  const [garmentDetails, setGarmentDetails] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  // Background picker state
  const defaultPreset = modelBackgroundPresets.find(p => p.id === 'white-seamless');
  const [selectedPreset, setSelectedPreset] = useState<string | null>('white-seamless');
  const [customBackground, setCustomBackground] = useState<File | null>(null);
  const [backgroundPrompt, setBackgroundPrompt] = useState<string>(defaultPreset?.prompt || '');
  const backgroundRef = useRef<HTMLDivElement>(null);

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

      // Upload custom background if provided
      let backgroundImageUrl: string | undefined;
      if (customBackground) {
        const ext = customBackground.name.split('.').pop() || 'jpg';
        const path = `${user!.id}/bg-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('bulk-backgrounds')
          .upload(path, customBackground, { contentType: customBackground.type });
        if (uploadError) throw new Error('Failed to upload background image');
        const { data: urlData } = supabase.storage.from('bulk-backgrounds').getPublicUrl(path);
        backgroundImageUrl = urlData.publicUrl;
      }

      // Create batch with garment details, settings, and background
      await createBatch(selectedModel.id, garmentIds, {
        garmentDetails: detailsArray,
        imageSize,
        aspectRatio,
        backgroundPrompt: backgroundPrompt || undefined,
        backgroundImageUrl,
        backgroundPresetId: selectedPreset || undefined,
      });
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
    setSelectedPreset('white-seamless');
    setCustomBackground(null);
    setBackgroundPrompt(defaultPreset?.prompt || '');
    setReplicateMode(false);
    setReplicatedJob(null);
    setReplicatedResult(null);
    navigate('/create/outfit-swap', { replace: true });
  };

  const getCreditsPerImage = (size: string): number => {
    switch (size) {
      case '4K': return 3;
      case '2K': return 2;
      default: return 1;
    }
  };

  const credits = getRemainingCredits();
  const creditsPerImage = getCreditsPerImage(imageSize);
  const totalCost = garmentFiles.length * creditsPerImage;
  const canAfford = isAdmin || credits >= totalCost;

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

            {/* Section 3: Select Background - visible when garments uploaded */}
            {selectedModel && garmentFiles.length > 0 && (
              <Card ref={backgroundRef} className="rounded-apple shadow-lg scroll-mt-6 p-6 lg:p-8">
                <h2 className="text-xl font-semibold mb-4">{t('bulkBackground.selectBackground.title')}</h2>
                <OutfitSwapBackgroundPicker
                  selectedPreset={selectedPreset}
                  customBackground={customBackground}
                  promptValue={backgroundPrompt}
                  onPresetSelect={setSelectedPreset}
                  onCustomUpload={setCustomBackground}
                  onPromptChange={setBackgroundPrompt}
                />
              </Card>
            )}

            {/* Section 4: Review & Start - visible when garments uploaded */}
            {selectedModel && garmentFiles.length > 0 && (
              <div ref={reviewRef} className="scroll-mt-6">
                <Card className="rounded-apple shadow-lg">
                  <CardHeader>
                    <CardTitle>{t('bulkBackground.settings.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Image Size */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('bulkBackground.settings.imageSize')}</p>
                      <ToggleGroup
                        type="single"
                        value={imageSize}
                        onValueChange={(v) => {
                          if (v && !(isFreeTier() && (v === '2K' || v === '4K'))) {
                            setImageSize(v as '1K' | '2K' | '4K');
                          }
                        }}
                        className="justify-start"
                      >
                        {(['1K', '2K', '4K'] as const).map((size) => {
                          const locked = isFreeTier() && (size === '2K' || size === '4K');
                          return (
                            <ToggleGroupItem key={size} value={size} size="sm" className={`px-4 bg-muted ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
                              {size}
                              {locked && <Crown className="h-3 w-3 ml-1 text-primary" />}
                            </ToggleGroupItem>
                          );
                        })}
                      </ToggleGroup>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('bulkBackground.settings.aspectRatio')}</p>
                      <Select value={aspectRatio} onValueChange={(v) => {
                        if (!(isFreeTier() && (v === '9:16' || v === '4:5'))) {
                          setAspectRatio(v);
                        }
                      }}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'].map((ratio) => {
                            const [w, h] = ratio.split(':').map(Number);
                            const scale = 16 / Math.max(w, h);
                            const boxW = Math.round(w * scale);
                            const boxH = Math.round(h * scale);
                            const locked = isFreeTier() && (ratio === '9:16' || ratio === '4:5');
                            return (
                              <SelectItem key={ratio} value={ratio} disabled={locked}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="border border-foreground/50 shrink-0 inline-block"
                                    style={{ width: `${boxW}px`, height: `${boxH}px` }}
                                  />
                                  {ratio}
                                  {locked && <Crown className="h-3 w-3 ml-1 text-primary" />}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Button */}
                    <div className="w-full flex justify-center">
                      <Button
                        onClick={handleStartBatch}
                        disabled={!canAfford || batchLoading || uploading}
                        className="gap-2 w-full"
                        variant="alternative"
                      >
                        {uploading
                          ? t('outfitSwap.actions.uploading')
                          : batchLoading
                          ? t('outfitSwap.actions.starting')
                          : <>{t('outfitSwap.actions.startBatch', { cost: totalCost })} — {totalCost} {t('outfitSwap.review.credits')}</>}
                      </Button>
                    </div>
                    {!canAfford && !isAdmin && (
                      <p className="text-xs text-destructive text-center">
                        {t('bulkBackground.review.insufficientCredits', { available: credits, needed: totalCost - credits })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default OutfitSwap;
