import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { VideoAdsSettings } from "@/components/VideoAdsSettings";
import { PageTransition } from "@/components/PageTransition";

export type VideoDuration = 5 | 10 | 15 | 30;
export type VideoAspectRatio = "1:1" | "9:16" | "16:9";
export type VideoStyle = "showcase" | "lifestyle" | "text-focused" | "dynamic";
export type CameraMovement = "static" | "pan" | "zoom" | "rotate";

export interface VideoAdSettings {
  duration: VideoDuration;
  aspectRatio: VideoAspectRatio;
  style: VideoStyle;
  cameraMovement: CameraMovement;
  headlineText: string;
  subtitleText: string;
}

const VideoAds = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [step, setStep] = useState(1);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [settings, setSettings] = useState<VideoAdSettings>({
    duration: 10,
    aspectRatio: "1:1",
    style: "showcase",
    cameraMovement: "pan",
    headlineText: "",
    subtitleText: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "This module is only available for admins",
        variant: "destructive"
      });
      navigate("/create");
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleImageUpload = (file: File) => {
    setProductImage(file);
    setStep(2);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    toast({
      title: "Backend Integration Coming Soon",
      description: "Video ad generation will be available soon"
    });
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const canGenerate = productImage !== null && settings.headlineText.trim().length > 0;

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Video className="h-8 w-8 text-orange-500" />
              Video Ads Generator
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
            </h1>
            <p className="text-muted-foreground">
              Generate short video advertisements from product images
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                step >= s ? "bg-orange-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Product */}
            {step >= 1 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">1</span>
                  Upload Product Image
                </h2>
                <ImageUploader 
                  onImageSelect={handleImageUpload} 
                  selectedImage={productImage}
                />
                {productImage && (
                  <div className="mt-4">
                    <img
                      src={URL.createObjectURL(productImage)}
                      alt="Product"
                      className="w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </Card>
            )}

            {/* Step 2-3: Settings */}
            {step >= 2 && productImage && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">2</span>
                  Configure Video Settings
                </h2>
                <VideoAdsSettings
                  settings={settings}
                  onSettingsChange={(updates) => {
                    setSettings({ ...settings, ...updates });
                    if (step < 3) setStep(3);
                  }}
                />
              </Card>
            )}

            {/* Step 4: Generate */}
            {step >= 3 && canGenerate && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">4</span>
                  Review & Generate
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Duration:</strong> {settings.duration}s
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Aspect Ratio:</strong> {settings.aspectRatio}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Style:</strong> {settings.style}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Camera:</strong> {settings.cameraMovement}
                    </p>
                    {settings.headlineText && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Headline:</strong> "{settings.headlineText}"
                      </p>
                    )}
                    {settings.subtitleText && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Subtitle:</strong> "{settings.subtitleText}"
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating Video Ad...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Video Ad
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Credit Cost</h3>
              <p className="text-2xl font-bold text-orange-500">0 credits</p>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.duration}s video
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Platform Guide</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li><strong>1:1:</strong> Instagram feed posts</li>
                <li><strong>9:16:</strong> Stories, Reels, TikTok</li>
                <li><strong>16:9:</strong> YouTube, Facebook</li>
              </ul>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Best Practices</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Keep headline text short (5-7 words)</li>
                <li>• Use contrasting text colors</li>
                <li>• 10-15s ideal for social media</li>
                <li>• Test different camera movements</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default VideoAds;
