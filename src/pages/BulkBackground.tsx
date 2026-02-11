import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Loader2, X, Eye, Camera, Sparkles } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
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
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStarted, setProcessingStarted] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Scroll refs
  const backgroundRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
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

  const handlePresetSelect = (presetId: string | null) => {
    setSelectedPreset(presetId);
    if (presetId) {
      const preset = backgroundPresets.find(p => p.id === presetId);
      if (preset?.promptKey) setBackgroundPrompt(t(preset.promptKey));
    } else {
      setBackgroundPrompt("");
    }
  };

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

  // Smooth scroll when settings section appears
  const prevHasBackground = useRef(false);
  useEffect(() => {
    if (!prevHasBackground.current && hasBackground) {
      setTimeout(() => {
        settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      toast({ title: t("bulkBackground.errors.signIn"), description: t("bulkBackground.errors.signInDesc"), variant: "destructive" });
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
        toast({ title: t("bulkBackground.errors.uploadFailed"), description: t("bulkBackground.errors.uploadFailedDesc"), variant: "destructive" });
        setProcessingStarted(false);
        setIsUploading(false);
        return;
      }

      setIsUploading(false);

      let customBgUrl: string | undefined;
      if (customBackground) {
        customBgUrl = await uploadBackgroundToStorage(customBackground) || undefined;
        if (!customBgUrl) {
          toast({ title: t("bulkBackground.errors.uploadFailed"), description: t("bulkBackground.errors.bgUploadFailedDesc"), variant: "destructive" });
          setProcessingStarted(false);
          return;
        }
      }

      const result = await createJob({
        sourceImageIds: uploadedIds,
        backgroundType: customBackground ? 'custom' : 'preset',
        backgroundPresetId: selectedPreset || undefined,
        backgroundImageUrl: customBgUrl,
        settings: { outputFormat: 'webp', quality: 'high', customPrompt: backgroundPrompt || undefined, imageSize, aspectRatio }
      });

      if (result) await refreshCredits();
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: t("bulkBackground.errors.processingFailed"),
        description: error instanceof Error ? error.message : t("bulkBackground.errors.processingFailedDesc"),
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
    setBackgroundPrompt("");
    setUploadProgress(0);
    setImageSize('1K');
    setAspectRatio('1:1');
  };

  const handleChangeBackground = () => {
    clearJob();
    setProcessingStarted(false);
    setCustomBackground(null);
    setSelectedPreset(null);
    setBackgroundPrompt("");
    setUploadProgress(0);
    // Scroll back to background picker
    setTimeout(() => {
      backgroundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl lg:max-w-7xl mx-auto space-y-6">
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
        <Card className="rounded-apple shadow-lg scroll-mt-6">
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
            <Card className="rounded-apple shadow-lg">
              <CardHeader>
                <CardTitle>{t("bulkBackground.selectBackground.title")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <BackgroundPicker
                  customBackground={customBackground}
                  selectedPreset={selectedPreset}
                  onCustomUpload={setCustomBackground}
                  onPresetSelect={handlePresetSelect}
                  promptValue={backgroundPrompt}
                  onPromptChange={setBackgroundPrompt}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3: Settings — appears when background selected */}
        {productImages.length > 0 && hasBackground && !processingStarted && (
          <div ref={settingsRef} className="scroll-mt-6">
            <Card className="rounded-apple shadow-lg">
              <CardHeader>
                <CardTitle>{t("bulkBackground.settings.title")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Image Size */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("bulkBackground.settings.imageSize")}</p>
                  <ToggleGroup
                    type="single"
                    value={imageSize}
                    onValueChange={(v) => v && setImageSize(v as '1K' | '2K' | '4K')}
                    className="justify-start"
                  >
                    {(['1K', '2K', '4K'] as const).map((size) => (
                      <ToggleGroupItem key={size} value={size} size="sm" className="px-4 bg-muted">
                        {size}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("bulkBackground.settings.aspectRatio")}</p>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'].map((ratio) => {
                        const [w, h] = ratio.split(':').map(Number);
                        const scale = 16 / Math.max(w, h);
                        const boxW = Math.round(w * scale);
                        const boxH = Math.round(h * scale);
                        return (
                          <SelectItem key={ratio} value={ratio}>
                            <span className="flex items-center gap-2">
                              <span
                                className="border border-foreground/50 shrink-0 inline-block"
                                style={{ width: `${boxW}px`, height: `${boxH}px` }}
                              />
                              {ratio}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleStartProcessing}
                  disabled={!hasEnoughCredits || jobLoading}
                  className="w-full gap-2"
                >
                  {jobLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("bulkBackground.processing.starting")}
                    </>
                  ) : (
                    <>
                      {t("bulkBackground.buttons.startProcessing")} — {totalCost} {t("bulkBackground.review.credits", "credits")}
                    </>
                  )}
                </Button>
                {!hasEnoughCredits && (
                  <p className="text-xs text-destructive text-center">
                    {t("bulkBackground.review.insufficientCredits", { available: credits, needed: totalCost - credits })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 4: Processing & Results — appears when processing starts */}
        {processingStarted && (
          <div ref={processingRef} className="scroll-mt-6">
            <Card className="rounded-apple shadow-lg">
              <CardHeader>
                <CardTitle>
                  {isUploading
                    ? t("bulkBackground.processing.uploading")
                    : isProcessing
                      ? t("bulkBackground.processing.title")
                      : isComplete
                        ? t("bulkBackground.results.title")
                        : isCanceled
                          ? t("bulkBackground.processing.canceled")
                          : isFailed
                            ? t("bulkBackground.processing.failed")
                            : t("bulkBackground.processing.processingFallback")}
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
                      {t("bulkBackground.processing.uploadingProgress", { progress: uploadProgress })}
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
                        {t("bulkBackground.processing.cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {(isFailed || jobError) && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-apple p-4 text-center">
                        <p className="text-destructive font-medium">
                          {jobError || job?.error || t("bulkBackground.processing.failed")}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.map((result, index) => (
                        <Card key={result.id || index} className="overflow-hidden">
                          <div className="aspect-square bg-muted relative">
                            {result.status === 'completed' && result.result_url ? (
                              <img
                                src={result.result_url}
                                alt={`Result ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
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
                          {result.status === 'completed' && result.result_url && (
                            <div className="p-3 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                                  onClick={() => navigate('/create/product-studio', { state: { imageUrl: result.result_url } })}
                                >
                                  <Sparkles className="h-4 w-4" />
                                  {t("bulkBackground.buttons.detailedImage")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setPreviewImage(result.result_url!)}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline">{t("bulkBackground.buttons.preview")}</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => navigate('/create/ugc', { state: { imageUrl: result.result_url } })}
                                >
                                  <Camera className="h-4 w-4" />
                                  <span className="hidden sm:inline">{t("bulkBackground.buttons.ugcImage")}</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(result.result_url!);
                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `product-${index + 1}.webp`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    } catch (e) {
                                      console.error('Download error:', e);
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="hidden sm:inline">{t("bulkBackground.buttons.download")}</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                      {results.length === 0 && productImages.map((_, index) => (
                        <Card key={index} className="overflow-hidden">
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
                          </div>
                        </Card>
                      ))}
                    </div>

                    {job && (
                      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                        <span>{t("bulkBackground.processing.completed", { count: job.completed_images })}</span>
                        {job.failed_images > 0 && (
                          <span className="text-destructive">{t("bulkBackground.processing.failedCount", { count: job.failed_images })}</span>
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
                      <Button variant="outline" onClick={handleChangeBackground}>
                        {t("bulkBackground.buttons.changeBackground")}
                      </Button>
                      <Button variant="ghost" onClick={handleNewBatch}>
                        {t("bulkBackground.buttons.newBatch")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Image Preview Modal */}
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage || ''}
          imageName="Result Image"
          onOpenInNewTab={() => previewImage && window.open(previewImage, '_blank')}
        />
      </div>
    </div>
  );
};

export default BulkBackground;
