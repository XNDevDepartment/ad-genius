import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createVideoJob, getVideoJob, cancelVideoJob, subscribeVideoJob, KlingJobRow } from "@/api/kling";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Loader2, Video as VideoIcon, X, Copy, Link as LinkIcon, Images, Sparkles, Info, RefreshCcwIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import MultiImageUploader from "@/components/MultiImageUploader";
import { UgcImagePicker } from "@/components/UgcImagePicker";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { SourceImage } from "@/hooks/useSourceImages";
import type { UgcImage } from "@/hooks/useUgcImages";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTranslation } from "react-i18next";
import { VideoSettingsPanel, VideoSettings } from "@/components/VideoSettings";
import { useLanguage } from "@/contexts/LanguageContext";



type Duration = 5 | 10;

export default function VideoGenerator() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccessVideos, getVideoAccessMessage } = useCredits();
  const { isAdmin, loading: isAdminLoading } = useAdminAuth();
  const { t } = useTranslation();

  const { toast } = useToast();
  const { uploadSourceImage, uploading: sourceImageUploading } = useSourceImageUpload();

  const [selectedImage, setSelectedImage] = useState<UgcImage | SourceImage | null>(null);
  const [preselectedImageUrl, setPreselectedImageUrl] = useState<string | null>(null);
  const [ugcImageId, setUgcImageId] = useState<string | null>(null);
  const [sourceImagePickerOpen, setSourceImagePickerOpen] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importingFromUrl, setImportingFromUrl] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<Duration>(5);
  const [creating, setCreating] = useState(false);
  const [job, setJob] = useState<KlingJobRow | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  // AI analysis state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const { language } = useLanguage();

  // Video settings state
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    cameraMovement: 'none',
    motionIntensity: 'moderate',
    animationStyle: 'natural',
  });

  // Check access on mount (AuthGuard handles authentication check)
  useEffect(() => {
    if (!user) return;

    // Skip access checks for admins
    if (isAdminLoading) return;
    if (isAdmin) return;

    // Regular users still get checked
    if (!canAccessVideos()) {
      toast({
        title: "Upgrade Required",
        description: getVideoAccessMessage(),
        variant: "destructive",
      });
      setTimeout(() => {
        navigate('/pricing');
      }, 2000);
    }
  }, [user, isAdmin, isAdminLoading, canAccessVideos, navigate, toast, getVideoAccessMessage]);

  // AI image analysis function
  const analyzeImageForMotion = async (imageUrl: string) => {
    console.log('[VideoGenerator] Starting image analysis for URL:', imageUrl);
    setAnalyzingImage(true);
    setSuggestedPrompt(null);

    try {
      console.log('[VideoGenerator] Invoking analyze-image-for-motion edge function...');
      const { data, error } = await supabase.functions.invoke('analyze-image-for-motion', {
        body: { imageUrl, language }
      });

      console.log('[VideoGenerator] Edge function response:', { data, error });

      if (error) {
        console.error('[VideoGenerator] Edge function error:', error);
        throw error;
      }

      if (data?.suggestedPrompt) {
        console.log('[VideoGenerator] AI suggestion received:', data.suggestedPrompt);
        setSuggestedPrompt(data.suggestedPrompt);
        setShowSuggestion(true);

        toast({
          title: "AI Suggestion Ready",
          description: "A motion prompt has been suggested based on your image.",
        });
      } else {
        console.warn('[VideoGenerator] No suggestion in response:', data);
      }
    } catch (error) {
      console.error('[VideoGenerator] Failed to analyze image:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Could not generate motion suggestion. You can still enter your own prompt.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Handle pre-selection from UGC or Outfit Swap
  useEffect(() => {
    const state = location.state as any;

    if (state?.source === 'outfit_swap' && state?.preselectedImageUrl) {
      // Handle outfit swap source
      setPreselectedImageUrl(state.preselectedImageUrl);

      toast({
        title: "Outfit Swap Loaded",
        description: "Outfit swap result ready to animate.",
      });

      // Analyze image for motion
      analyzeImageForMotion(state.preselectedImageUrl);

      // Clear location state
      window.history.replaceState({}, document.title);
    } else if (state?.ugc_image_id && state?.preselectedImageUrl) {
      // Handle UGC source
      setUgcImageId(state.ugc_image_id);
      setPreselectedImageUrl(state.preselectedImageUrl);

      toast({
        title: "Image Pre-selected",
        description: "UGC image loaded and ready to animate.",
      });

      // Analyze image for motion
      analyzeImageForMotion(state.preselectedImageUrl);

      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  // Fetch complete UGC image record when navigating from UGC generator
  useEffect(() => {
    if (ugcImageId && preselectedImageUrl && !selectedImage) {
      const fetchUgcImage = async () => {
        const { data, error } = await supabase
          .from('ugc_images')
          .select('id, prompt, public_url, storage_path, created_at')
          .eq('id', ugcImageId)
          .single();
        
        if (data && !error) {
          const ugcImage: UgcImage = {
            id: data.id,
            prompt: data.prompt || '',
            signedUrl: data.public_url,
            fileName: '',
            createdAt: data.created_at,
            storage_path: data.storage_path,
          };
          setSelectedImage(ugcImage);
        } else if (error) {
          console.error('[VideoGenerator] Failed to fetch UGC image:', error);
        }
      };
      fetchUgcImage();
    }
  }, [ugcImageId, preselectedImageUrl, selectedImage]);

  // Handle uploaded files
  const handleImagesSelect = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadedFiles(files);

    try {
      const file = files[0]; // Only use first file
      const result = await uploadSourceImage(file);

      if (result) {
        // Fetch the full source image record from DB to get storage_path
        const { data: sourceImageData } = await supabase
          .from('source_images')
          .select('id, file_name, created_at, storage_path, public_url')
          .eq('id', result.id)
          .single();

        if (sourceImageData) {
          // Get signed URL
          const { data: signedUrlData } = await supabase.storage
            .from('ugc-inputs')
            .createSignedUrl(sourceImageData.storage_path, 3600);

          const sourceImage: SourceImage = {
            id: sourceImageData.id,
            fileName: sourceImageData.file_name,
            signedUrl: signedUrlData?.signedUrl || sourceImageData.public_url,
            storage_path: sourceImageData.storage_path,
            createdAt: sourceImageData.created_at,
          };

          setSelectedImage(sourceImage);
          setUgcImageId(null);
          setPreselectedImageUrl(null);
          toast({
            title: "Image uploaded",
            description: "Your image is ready to animate.",
          });

          // Analyze image for motion
          await analyzeImageForMotion(sourceImage.signedUrl);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle source image selection from picker
  const handleSourceImageSelect = (image: UgcImage) => {
    setSelectedImage(image);
    setUgcImageId(null);
    setPreselectedImageUrl(null);
    setSourceImagePickerOpen(false);
    toast({
      title: "Image selected",
      description: "Your image is ready to animate.",
    });

    // Analyze image for motion
    analyzeImageForMotion(image.signedUrl);
  };

  // Handle URL import
  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;

    setImportingFromUrl(true);
    try {
      const response = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: importUrl.trim() }
      });

      if (response.error) throw response.error;
      if (!response.data?.sourceImage) throw new Error('No source image returned');

      setSelectedImage(response.data.sourceImage);
      setImportUrl("");
      setUrlImportOpen(false);
      toast({
        title: "Image imported",
        description: "URL image loaded and ready to animate.",
      });

      // Analyze image for motion
      await analyzeImageForMotion(response.data.sourceImage.signedUrl);
    } catch (error: any) {
      console.error('URL import failed:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import image from URL.",
        variant: "destructive",
      });
    } finally {
      setImportingFromUrl(false);
    }
  };

  // Subscribe to changes once we have a job
  useEffect(() => {
    if (!job?.id) return;
    console.log("[VideoGenerator] Setting up realtime subscription for job:", job.id);

    const sub = subscribeVideoJob(job.id, (updated) => {
      console.log("[VideoGenerator] Realtime update received:", {
        id: updated.id,
        status: updated.status,
        video_url: updated.video_url,
        video_path: updated.video_path,
        updated_at: updated.updated_at,
      });

      // Force new object reference to trigger React re-render
      setJob({ ...updated });
      console.log("[VideoGenerator] setJob() called with new data");
    });

    return () => {
      console.log("[VideoGenerator] Cleaning up realtime subscription for job:", job.id);
      sub.unsubscribe();
    };
  }, [job?.id]);

  // Helper: resolve a playable URL even if row only has video_path
  const resolvedVideoUrl = useMemo(() => {
    if (!job) {
      console.log("[VideoGenerator] resolvedVideoUrl: no job");
      return null;
    }

    if (job.video_url) {
      console.log("[VideoGenerator] resolvedVideoUrl: using video_url:", job.video_url);
      return job.video_url;
    }

    if (job.video_path) {
      const { data } = supabase.storage.from("videos").getPublicUrl(job.video_path);
      const url = data?.publicUrl ?? null;
      console.log("[VideoGenerator] resolvedVideoUrl: generated from video_path:", url);
      return url;
    }

    console.log("[VideoGenerator] resolvedVideoUrl: no URL or path available");
    return null;
  }, [job]);

  // Build enhanced prompt with settings
  const buildEnhancedPrompt = (basePrompt: string, settings: VideoSettings): string => {
    let enhanced = basePrompt;
    
    // Add camera movement
    if (settings.cameraMovement !== 'none') {
      const cameraInstructions = {
        'zoom-in': 'slowly zoom in on the subject',
        'zoom-out': 'slowly zoom out to reveal more context',
        'pan-left': 'pan the camera left',
        'pan-right': 'pan the camera right',
        'pan-up': 'tilt the camera up',
        'pan-down': 'tilt the camera down',
      };
      enhanced += `. Camera: ${cameraInstructions[settings.cameraMovement]}`;
    }
    
    // Add motion intensity
    const intensityWords = {
      'subtle': 'gentle and minimal',
      'moderate': 'natural and balanced',
      'dynamic': 'energetic and pronounced',
    };
    enhanced += `. Motion should be ${intensityWords[settings.motionIntensity]}`;
    
    // Add animation style
    const styleWords = {
      'natural': 'realistic and lifelike',
      'cinematic': 'dramatic with film-like quality',
      'smooth': 'fluid and seamless',
    };
    enhanced += `. Style: ${styleWords[settings.animationStyle]}`;
    
    return enhanced;
  };

  const onCreate = async () => {
    try {
      setUiError(null);
      if (!selectedImage || !prompt.trim()) {
        setUiError(t('videoGenerator.errors.selectImageAndPrompt'));
        return;
      }
      // Only allow 5 or 10 (no 1s leaks)
      const safeDuration: Duration = duration === 10 ? 10 : 5;

      setCreating(true);

      // Build enhanced prompt with settings
      const enhancedPrompt = buildEnhancedPrompt(prompt.trim(), videoSettings);

      const payload: any = {
        prompt: enhancedPrompt,
        duration: safeDuration,
        model: "fal-ai/kling-video/v2.6/pro/image-to-video",
      };

      // Detect if selectedImage is a UGC image (has prompt field) or source image
      const isUgcImage = ugcImageId || 'prompt' in selectedImage;

      if (isUgcImage) {
        payload.ugc_image_id = ugcImageId || selectedImage.id;
      } else {
        payload.source_image_id = selectedImage.id;
      }

      const res = await createVideoJob(payload);

      if (!res?.success || !res?.jobId) {
        throw new Error(res?.error || "Failed to create video job.");
      }

      const j = await getVideoJob(res.jobId);
      if (j.success && j.job) {
        setJob(j.job);
      } else {
        setUiError("Job created but could not load it. Try again.");
      }
    } catch (e: any) {
      setUiError(e?.message || "Failed to create job.");
    } finally {
      setCreating(false);
    }
  };

  const onCancel = async () => {
    if (!job?.id) return;
    try {
      const res = await cancelVideoJob(job.id);
      if (!res.success) {
        setUiError(res.error || "Failed to cancel.");
      } else {
        const j = await getVideoJob(job.id);
        if (j.success && j.job) setJob(j.job);
      }
    } catch (e: any) {
      setUiError(e?.message || "Failed to cancel.");
    }
  };

  const clearAll = () => {
    setJob(null);
    setUiError(null);
    setPrompt("");
    setSelectedImage(null);
    setUgcImageId(null);
    setPreselectedImageUrl(null);
    setUploadedFiles([]);
  };

  const refreshJob = async () => {
    if (!job?.id) return;
    try {
      console.log("[VideoGenerator] Manual refresh triggered for job:", job.id);
      const res = await getVideoJob(job.id);
      if (res.success && res.job) {
        console.log("[VideoGenerator] Manual refresh got job:", res.job);
        setJob({ ...res.job });
      } else {
        setUiError("Failed to refresh job data.");
      }
    } catch (e: any) {
      setUiError(e?.message || "Failed to refresh.");
    }
  };

  const statusIcon = useMemo(() => {
    switch (job?.status) {
      case "queued":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "canceled":
        return <X className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  }, [job?.status]);

  const copyDebug = async () => {
    try {
      const minimal = {
        id: job?.id,
        status: job?.status,
        request_id: job?.request_id,
        model: job?.model,
        duration: job?.duration,
        video_url: job?.video_url,
        video_path: job?.video_path,
        updated_at: job?.updated_at,
        finished_at: job?.finished_at,
        error: job?.error,
      };
      await navigator.clipboard.writeText(JSON.stringify(minimal, null, 2));
    } catch {}
  };

  // Show access denied UI if no access (but not for admins)
  if (!user || (!isAdminLoading && !isAdmin && !canAccessVideos())) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-background">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                Upgrade Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{getVideoAccessMessage()}</p>
              <Button onClick={() => navigate('/pricing')} className="w-full">
                View Pricing Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <VideoIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('videoGenerator.title')}</h1>
        </div>

        {!job && (
          <Card>
            <CardHeader>
              <CardTitle>{t('videoGenerator.createVideo')}</CardTitle>
              <CardDescription>{t('videoGenerator.description')}</CardDescription>
              <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong>{t('videoGenerator.infoBox.title')}:</strong>{' '}
                  {t('videoGenerator.infoBox.description')}
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Source Image Selection */}
              <div className="space-y-3">
                <Label>{t('videoGenerator.sourceImage.label')}</Label>

                {!selectedImage && !preselectedImageUrl ? (
                  <div className="space-y-3 w-full">
                    {/* Upload Methods */}
                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> */}
                      {/* Drag & Drop */}
                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                        <MultiImageUploader
                          onImagesSelect={handleImagesSelect}
                          selectedImages={uploadedFiles}
                          maxImages={1}
                          isAnalyzing={[sourceImageUploading]}
                        />
                      </div>

                      {/* From Library */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-full min-h-[60px] flex-col gap-2 w-full"
                        onClick={() => setSourceImagePickerOpen(true)}
                      >
                        <Images className="h-8 w-8" />
                        <span className="text-sm">{t('videoGenerator.sourceImage.fromLibrary')}</span>
                      </Button>

                      {/* From URL */}
                      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-full min-h-[60px] flex-col gap-2 w-full"
                          >
                            <LinkIcon className="h-8 w-8" />
                            <span className="text-sm">{t('videoGenerator.sourceImage.importFromUrl')}</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Import Image from URL</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={importUrl}
                              onChange={(e) => setImportUrl(e.target.value)}
                            />
                            <Button
                              onClick={handleUrlImport}
                              disabled={!importUrl.trim() || importingFromUrl}
                              className="w-full"
                            >
                              {importingFromUrl ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                'Import Image'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      </div>
                    {/* </div> */}

                    {ugcImageId && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('videoGenerator.sourceImage.ugcPreselected')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg border overflow-hidden">
                      <img
                        src={selectedImage?.signedUrl || preselectedImageUrl || ''}
                        alt="Selected source"
                        className="w-full max-w-md mx-auto"
                      />
                    </div>
                    {ugcImageId && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('videoGenerator.sourceImage.preselectedFromUGC')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedImage(null);
                        setUgcImageId(null);
                        setPreselectedImageUrl(null);
                        setUploadedFiles([]);
                      }}
                    >
                      {t('videoGenerator.sourceImage.changeImage')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>{t('videoGenerator.instructions.label')}</Label>

                {/* AI Suggestion Section */}
                {analyzingImage && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      {t('videoGenerator.instructions.aiSuggestion.analyzing')}
                    </AlertDescription>
                  </Alert>
                )}

                {suggestedPrompt && showSuggestion && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        {t('videoGenerator.instructions.aiSuggestion.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{suggestedPrompt}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setPrompt(suggestedPrompt);
                            setShowSuggestion(false);
                            toast({
                              title: t('videoGenerator.instructions.aiSuggestion.applied'),
                              description: t('videoGenerator.instructions.aiSuggestion.appliedDescription'),
                            });
                          }}
                        >
                          {t('videoGenerator.instructions.aiSuggestion.usePrompt')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowSuggestion(false)}
                        >
                          {t('videoGenerator.instructions.aiSuggestion.dismiss')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('videoGenerator.instructions.placeholder')}
                  rows={3}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>{t('videoGenerator.settings.duration')}</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(val) => setDuration((Number(val) === 10 ? 10 : 5) as Duration)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t('videoGenerator.duration5')}</SelectItem>
                    <SelectItem value="10">{t('videoGenerator.duration10')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error */}
              {uiError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uiError}</AlertDescription>
                </Alert>
              )}

              {/* Create button with Settings */}
              <div className="flex gap-2">
                <VideoSettingsPanel 
                  settings={videoSettings}
                  onSettingsChange={setVideoSettings}
                />
                <Button
                  onClick={onCreate}
                  className="flex-1"
                  size="lg"
                  disabled={creating || (!selectedImage && !ugcImageId && !preselectedImageUrl) || !prompt.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('videoGenerator.creatingJob')}
                    </>
                  ) : (
                    <>
                      <VideoIcon className="mr-2 h-4 w-4" />
                      {t('videoGenerator.generateVideo')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job card */}
        {job && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {statusIcon}
                  {t('videoGenerator.status.label')}: <span className="capitalize">{job.status}</span>
                </CardTitle>
                <CardDescription>
                  {job.status === "queued" && t('videoGenerator.status.queued')}
                  {job.status === "processing" && t('videoGenerator.status.processing')}
                  {job.status === "completed" && t('videoGenerator.status.completed')}
                  {job.status === "failed" && t('videoGenerator.status.failed')}
                  {job.status === "canceled" && t('videoGenerator.status.canceled')}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshJob} title={t('videoGenerator.actions.refresh')}>
                  <RefreshCcwIcon className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  {t('videoGenerator.actions.newVideo')}
                </Button>              {/* Cancel */}
              {(job.status === "queued" || job.status === "processing") && (
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  {t('videoGenerator.actions.cancel')}
                </Button>
              )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress */}
              {(job.status === "queued" || job.status === "processing") && (
                <div className="space-y-2">
                  <Progress value={job.status === "queued" ? 10 : 60} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {job.status === "queued" ? "Waiting in queue…" : "Processing…"}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{job.duration}s</span>
                </div>
              </div>

              {/* Source image */}
              {job.image_url && !resolvedVideoUrl && (
                <div className="space-y-2">
                  <Label>Source Image</Label>
                  <img src={job.image_url} alt="Source" className="w-full max-w-md rounded-lg border" />
                </div>
              )}

              {/* Video (render whenever a URL exists) */}
              {resolvedVideoUrl && (
                <div className="space-y-2">
                  <Label>Generated Video</Label>
                  <video
                    key={`${job.id}-${job.updated_at}`} 
                    src={resolvedVideoUrl} 
                    controls 
                    className="w-full rounded-lg border"
                    onLoadStart={() => console.log("[VideoGenerator] Video loading started:", resolvedVideoUrl)}
                    onError={(e) => {
                      console.error("[VideoGenerator] Video loading error:", e);
                      console.error("[VideoGenerator] Failed URL:", resolvedVideoUrl);
                      setUiError("Failed to load video. Check console for details.");
                    }}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full" onClick={() => window.open(resolvedVideoUrl!, "_blank")}>
                      {t('videoGenerator.actions.openNewTab')}
                    </Button>
                    <a href={resolvedVideoUrl} download className="w-full">
                      <Button className="w-full" variant="secondary">{t('videoGenerator.actions.download')}</Button>
                    </a>
                  </div>
                </div>
              )}

              {/* Error */}
              {job.status === "failed" && job.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{job.error?.message || "An error occurred."}</AlertDescription>
                </Alert>
              )}

              {/* Cancel */}
              {(job.status === "queued" || job.status === "processing") && (
                <Button variant="destructive" className="w-full" onClick={onCancel}>
                  {t('videoGenerator.actions.cancel')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* UGC Image Picker Modal */}
      <UgcImagePicker
        open={sourceImagePickerOpen}
        onClose={() => setSourceImagePickerOpen(false)}
        onSelect={handleSourceImageSelect}
      />
    </div>
  );
}
