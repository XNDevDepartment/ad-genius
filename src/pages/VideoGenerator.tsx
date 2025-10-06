import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createVideoJob, getVideoJob, cancelVideoJob, subscribeVideoJob, KlingJobRow } from "@/api/kling";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Loader2, Video as VideoIcon, X, Copy, Upload, Link as LinkIcon, Images } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import MultiImageUploader from "@/components/MultiImageUploader";
import { SourceImagePicker } from "@/components/SourceImagePicker";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { SourceImage } from "@/hooks/useSourceImages";

/**
 * A robust, minimal front-end flow for Kling image-to-video:
 * - pick a source image (from your source_images table via useSourceImages)
 * - enter prompt + duration (5 or 10 seconds)
 * - create the job
 * - subscribe to realtime updates
 * - display video once URL is present (with a fallback fetch)
 */

type Duration = 5 | 10;

export default function VideoGenerator() {
  const location = useLocation();
  const { toast } = useToast();
  const { uploadSourceImage, uploading: sourceImageUploading } = useSourceImageUpload();
  
  const [selectedImage, setSelectedImage] = useState<SourceImage | null>(null);
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


  // Handle pre-selection from UGC
  useEffect(() => {
    const state = location.state as any;
    if (state?.ugc_image_id && state?.preselectedImageUrl) {
      setUgcImageId(state.ugc_image_id);
      setPreselectedImageUrl(state.preselectedImageUrl);
      
      toast({
        title: "Image Pre-selected",
        description: "UGC image loaded and ready to animate.",
      });
      
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

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
  const handleSourceImageSelect = (image: SourceImage) => {
    setSelectedImage(image);
    setUgcImageId(null);
    setPreselectedImageUrl(null);
    setSourceImagePickerOpen(false);
    toast({
      title: "Image selected",
      description: "Your image is ready to animate.",
    });
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

  const onCreate = async () => {
    try {
      setUiError(null);
      if (!selectedImage || !prompt.trim()) {
        setUiError("Please select an image and enter a prompt.");
        return;
      }
      // Only allow 5 or 10 (no 1s leaks)
      const safeDuration: Duration = duration === 10 ? 10 : 5;

      setCreating(true);

      const payload: any = {
        prompt: prompt.trim(),
        duration: safeDuration,
        model: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      };

      // Use ugc_image_id if coming from UGC, otherwise use source_image_id
      if (ugcImageId) {
        payload.ugc_image_id = ugcImageId;
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

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <VideoIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Image → Video (Kling 2.5 Turbo Pro)</h1>
        </div>

        {!job && (
          <Card>
            <CardHeader>
              <CardTitle>Create Video</CardTitle>
              <CardDescription>Select an image and prompt, then generate a 5s or 10s video.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Source Image Selection */}
              <div className="space-y-3">
                <Label>Source Image</Label>
                
                {!selectedImage && !preselectedImageUrl ? (
                  <div className="space-y-3">
                    {/* Upload Methods */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      <Dialog open={sourceImagePickerOpen} onOpenChange={setSourceImagePickerOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-full min-h-[120px] flex-col gap-2"
                          >
                            <Images className="h-8 w-8" />
                            <span className="text-sm">From Library</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Select Source Image</DialogTitle>
                          </DialogHeader>
                          <SourceImagePicker
                            open={sourceImagePickerOpen}
                            onClose={() => setSourceImagePickerOpen(false)}
                            onSelect={handleSourceImageSelect}
                          />
                        </DialogContent>
                      </Dialog>

                      {/* From URL */}
                      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-full min-h-[120px] flex-col gap-2"
                          >
                            <LinkIcon className="h-8 w-8" />
                            <span className="text-sm">Import from URL</span>
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

                    {ugcImageId && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          UGC image pre-selected. You can change it using the options above.
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
                          Pre-selected from UGC Generator
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
                      Change Image
                    </Button>
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the motion / behavior you want (e.g., 'person walking forward and smiling', 'camera slowly zooming in')"
                  rows={3}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(val) => setDuration((Number(val) === 10 ? 10 : 5) as Duration)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds (5 credits)</SelectItem>
                    <SelectItem value="10">10 seconds (10 credits)</SelectItem>
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

              {/* Create button */}
              <Button
                onClick={onCreate}
                className="w-full"
                size="lg"
                disabled={creating || (!selectedImage && !ugcImageId) || !prompt.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Job…
                  </>
                ) : (
                  <>
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
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
                  Status: <span className="capitalize">{job.status}</span>
                </CardTitle>
                <CardDescription>
                  {job.status === "queued" && "Your video is queued…"}
                  {job.status === "processing" && "Generating your video…"}
                  {job.status === "completed" && "Video generated successfully."}
                  {job.status === "failed" && "Video generation failed."}
                  {job.status === "canceled" && "Video generation was canceled."}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshJob} title="Refresh job data">
                  <Loader2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={copyDebug} title="Copy debug info">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  New Video
                </Button>
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
                  <span className="text-muted-foreground">Job ID</span>
                  <span className="font-mono">{job.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{job.duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs">{job.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prompt</span>
                  <span className="text-right max-w-[280px] truncate" title={job.prompt}>
                    {job.prompt}
                  </span>
                </div>
              </div>

              {/* Source image */}
              {job.image_url && (
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
                      Open in New Tab
                    </Button>
                    <a href={resolvedVideoUrl} download className="w-full">
                      <Button className="w-full" variant="secondary">Download</Button>
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
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
