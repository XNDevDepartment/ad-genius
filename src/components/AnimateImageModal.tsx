import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoSettingsPanel, VideoSettings } from "@/components/VideoSettings";
import { useKlingVideo } from "@/hooks/useKlingVideo";
import { supabase } from "@/integrations/supabase/client";
import { Video, Sparkles, Download, RefreshCw, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimateImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  imageId: string | null;
}

export default function AnimateImageModal({ open, onClose, imageUrl, imageId }: AnimateImageModalProps) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    cameraMovement: "none",
    motionIntensity: "moderate",
    animationStyle: "natural",
  });
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { job, loading, createVideoJob, clearJob } = useKlingVideo();

  // Auto-analyze image for motion prompt when modal opens
  useEffect(() => {
    if (!open || !imageUrl) return;
    // Reset state when opening with a new image
    setPrompt("");
    clearJob();
    setVideoError(false);
    analyzeImageForMotion();
  }, [open, imageUrl]);

  const analyzeImageForMotion = useCallback(async () => {
    if (!imageUrl) return;
    setAiPromptLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/analyze-image-for-motion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ imageUrl }),
        }
      );
      const data = await res.json();
      if (data?.prompt) setPrompt(data.prompt);
    } catch (err) {
      console.error("Failed to analyze image for motion:", err);
    } finally {
      setAiPromptLoading(false);
    }
  }, [imageUrl]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Build enhanced prompt with video settings
    let enhancedPrompt = prompt;
    if (videoSettings.cameraMovement !== "none") {
      enhancedPrompt += ` Camera: ${videoSettings.cameraMovement.replace("-", " ")}.`;
    }
    enhancedPrompt += ` Motion: ${videoSettings.motionIntensity}. Style: ${videoSettings.animationStyle}.`;

    await createVideoJob({
      ugc_image_id: imageId || undefined,
      prompt: enhancedPrompt,
      duration,
    });
  };

  const handleDownloadVideo = () => {
    if (!job?.video_url) return;
    const a = document.createElement("a");
    a.href = job.video_url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleClose = () => {
    onClose();
  };

  const isProcessing = job?.status === "queued" || job?.status === "processing";
  const isCompleted = job?.status === "completed";
  const isFailed = job?.status === "failed";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0",
          "w-full max-w-lg"
        )}
      >
        {/* Header */}
        <div className="p-4 pb-2 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Animate Image
            </DialogTitle>
            <DialogDescription>
              Generate a video from your image using AI
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image Preview */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden bg-muted/20 border border-border/50">
              <img
                src={imageUrl}
                alt="Source image"
                className="w-full h-auto max-h-48 object-contain"
              />
            </div>
          )}

          {/* Completed Video */}
          {isCompleted && job?.video_url && (
            <div className="rounded-xl overflow-hidden bg-black">
              {videoError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Video preview is not available on this device.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDownloadVideo}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                </div>
              ) : (
                <video
                  src={job.video_url}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-auto max-h-64"
                  onError={() => setVideoError(true)}
                />
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <Progress value={job?.status === "processing" ? 50 : 10} className="h-2 w-full max-w-xs" />
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Your video is generating. You may now continue your work. You can find it in your <span className="font-semibold text-foreground">Videos</span> tab.
              </p>
              <Button variant="outline" onClick={onClose} className="mt-2">
                Got it
              </Button>
            </div>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-destructive">
                Video generation failed. {typeof job?.error === 'object' && job?.error?.message ? job.error.message : "Please try again."}
              </p>
            </div>
          )}

          {/* Prompt */}
          {!isCompleted && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Motion Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={analyzeImageForMotion}
                    disabled={aiPromptLoading || isProcessing}
                    className="text-xs h-7"
                  >
                    {aiPromptLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    AI Suggest
                  </Button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the motion you want..."
                  rows={3}
                  disabled={isProcessing}
                  className="resize-none"
                />
              </div>

              {/* Duration & Settings Row */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={String(duration)}
                    onValueChange={(v) => setDuration(Number(v) as 5 | 10)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <VideoSettingsPanel
                  settings={videoSettings}
                  onSettingsChange={setVideoSettings}
                />
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="bottom-0 p-4 pt-3 border-t border-border/50 bg-background">
          {isCompleted ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownloadVideo}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  clearJob();
                  setPrompt("");
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                New Video
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading || isProcessing}
            >
              {loading || isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isProcessing ? "Generating..." : "Starting..."}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Generate Video ({duration}s)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
