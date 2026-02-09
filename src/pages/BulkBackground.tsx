import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Loader2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MultiImageUploader from "@/components/MultiImageUploader";
import BackgroundPicker from "@/components/bulk-background/BackgroundPicker";
import { backgroundPresets } from "@/data/background-presets";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useBulkBackgroundJob } from "@/hooks/useBulkBackgroundJob";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CREDITS_PER_IMAGE = 2;
const MAX_IMAGES = 20;

const BulkBackground = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getRemainingCredits, refreshCredits } = useCredits();
  const { toast } = useToast();
  const { uploadSourceImage, uploading: uploadingSource } = useSourceImageUpload();

  const {
    job,
    results,
    loading: jobLoading,
    error: jobError,
    createJob,
    cancelJob,
    downloadAll,
    clearJob,
    isProcessing,
    isComplete,
    isCanceled,
    isFailed,
    progress
  } = useBulkBackgroundJob();

  // Data state
  const [productImages, setProductImages] = useState<File[]>([]);
  const [customBackground, setCustomBackground] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStarted, setProcessingStarted] = useState(false);

  // Scroll refs
  const backgroundRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef<HTMLDivElement>(null);

  // Derived state
  const credits = getRemainingCredits();
  const totalCost = productImages.length * CREDITS_PER_IMAGE;
  const hasEnoughCredits = credits >= totalCost;
  const hasBackground = customBackground !== null || selectedPreset !== null;

  const selectedBackgroundName = useMemo(() => {
    if (customBackground) return customBackground.name;
    if (selectedPreset) {
      const preset = backgroundPresets.find(p => p.id === selectedPreset);
      return preset?.name || selectedPreset;
    }
    return null;
  }, [customBackground, selectedPreset]);

  // Smooth scroll when background section appears
  const prevImageCount = useRef(0);
  useEffect(() => {
    if (prevImageCount.current === 0 && productImages.length > 0) {
      setTimeout(() => {
        backgroundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    prevImageCount.current = productImages.length;
  }, [productImages.length]);

  // Smooth scroll when review section appears
  const prevHasBackground = useRef(false);
  useEffect(() => {
    if (!prevHasBackground.current && hasBackground) {
      setTimeout(() => {
        reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    prevHasBackground.current = hasBackground;
  }, [hasBackground]);

  // Smooth scroll when processing starts
  useEffect(() => {
    if (processingStarted) {
      setTimeout(() => {
        processingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [processingStarted]);

  const uploadBackgroundToStorage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const fileName = `${user.id}/${Date.now()}-custom-bg.${file.name.split('.').pop() || 'jpg'}`;
    const { data, error } = await supabase.storage
      .from('bulk-backgrounds')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error('Background upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('bulk-backgrounds')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleStartProcessing = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to process images.", variant: "destructive" });
      return;
    }

    setProcessingStarted(true);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedIds: string[] = [];
      for (let i = 0; i < productImages.length; i++) {
        const file = productImages[i];
        const uploaded = await uploadSourceImage(file);
        if (uploaded) uploadedIds.push(uploaded.id);
        setUploadProgress(Math.round(((i + 1) / productImages.length) * 100));
      }

      if (uploadedIds.length === 0) {
        toast({ title: "Upload Failed", description: "Failed to upload product images. Please try again.", variant: "destructive" });
        setProcessingStarted(false);
        setIsUploading(false);
        return;
      }

      setIsUploading(false);

      let customBgUrl: string | undefined;
      if (customBackground) {
        customBgUrl = await uploadBackgroundToStorage(customBackground) || undefined;
        if (!customBgUrl) {
          toast({ title: "Upload Failed", description: "Failed to upload custom background. Please try again.", variant: "destructive" });
          setProcessingStarted(false);
          return;
        }
      }

      const result = await createJob({
        sourceImageIds: uploadedIds,
        backgroundType: customBackground ? 'custom' : 'preset',
        backgroundPresetId: selectedPreset || undefined,
        backgroundImageUrl: customBgUrl,
        settings: { outputFormat: 'webp', quality: 'high' }
      });

      if (result) await refreshCredits();
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to start batch processing.",
        variant: "destructive",
      });
      setProcessingStarted(false);
      setIsUploading(false);
    }
  };

  const handleDownloadAll = async () => {
    const images = await downloadAll();
    if (!images?.length) return;
    for (const img of images) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-${img.index + 1}.webp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error('Download error:', e);
      }
    }
  };

  const handleNewBatch = () => {
    clearJob();
    setProcessingStarted(false);
    setProductImages([]);
    setCustomBackground(null);
    setSelectedPreset(null);
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
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

        {/* Section 1: Upload Products — always visible */}
        <Card className="bg-transparent scroll-mt-6">
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

        {/* Section 2: Select Background — appears when images uploaded */}
        {productImages.length > 0 && (
          <div ref={backgroundRef} className="scroll-mt-6">
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
          </div>
        )}

        {/* Section 3: Review & Start — appears when background selected */}
        {productImages.length > 0 && hasBackground && !processingStarted && (
          <div ref={reviewRef} className="scroll-mt-6">
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle>{t("bulkBackground.review.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <Button
                  onClick={handleStartProcessing}
                  disabled={!hasEnoughCredits || jobLoading}
                  className="w-full gap-2"
                >
                  {jobLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    t("bulkBackground.buttons.startProcessing")
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 4: Processing & Results — appears when processing starts */}
        {processingStarted && (
          <div ref={processingRef} className="scroll-mt-6">
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle>
                  {isUploading
                    ? "Uploading Images..."
                    : isProcessing
                      ? t("bulkBackground.processing.title")
                      : isComplete
                        ? t("bulkBackground.results.title")
                        : isCanceled
                          ? "Batch Canceled"
                          : isFailed
                            ? "Batch Failed"
                            : "Processing..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isUploading ? (
                  <>
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                    <p className="text-center text-sm text-muted-foreground">
                      Uploading images... {uploadProgress}%
                    </p>
                  </>
                ) : isProcessing ? (
                  <>
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-center text-sm text-muted-foreground">
                      {t("bulkBackground.processing.progress", {
                        current: job?.completed_images || 0,
                        total: job?.total_images || productImages.length
                      })}
                    </p>
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={cancelJob} className="gap-2">
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {(isFailed || jobError) && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-apple p-4 text-center">
                        <p className="text-destructive font-medium">
                          {jobError || job?.error || "Processing failed"}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {results.map((result, index) => (
                        <div
                          key={result.id || index}
                          className="aspect-square bg-muted rounded-apple overflow-hidden relative group"
                        >
                          {result.status === 'completed' && result.result_url ? (
                            <>
                              <img
                                src={result.result_url}
                                alt={`Result ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <a
                                href={result.result_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <ExternalLink className="h-6 w-6 text-white" />
                              </a>
                            </>
                          ) : result.status === 'failed' ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <X className="h-8 w-8 text-destructive" />
                            </div>
                          ) : result.status === 'processing' ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {results.length === 0 && productImages.map((_, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-muted rounded-apple flex items-center justify-center"
                        >
                          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
                        </div>
                      ))}
                    </div>

                    {job && (
                      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                        <span>Completed: {job.completed_images}</span>
                        {job.failed_images > 0 && (
                          <span className="text-destructive">Failed: {job.failed_images}</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        className="flex-1 gap-2"
                        onClick={handleDownloadAll}
                        disabled={!isComplete || (job?.completed_images || 0) === 0}
                      >
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
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkBackground;
