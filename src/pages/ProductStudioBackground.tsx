import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { ProductStudioSettings } from "@/components/ProductStudioSettings";
import { PageTransition } from "@/components/PageTransition";

export type BackgroundType = "white" | "black" | "gradient" | "custom" | "scene";
export type ShadowStyle = "none" | "soft" | "hard" | "reflection";
export type LightingStyle = "neutral" | "warm" | "cool" | "dramatic";

export interface StudioSettings {
  backgroundType: BackgroundType;
  customColor?: string;
  shadowStyle: ShadowStyle;
  lighting: LightingStyle;
  outputFormat: "jpg" | "png" | "webp";
}

const ProductStudioBackground = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [settings, setSettings] = useState<StudioSettings>({
    backgroundType: "white",
    shadowStyle: "soft",
    lighting: "neutral",
    outputFormat: "png"
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
      description: "Product studio background generation will be available soon"
    });
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const canGenerate = productImage !== null;

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
              <ImageIcon className="h-8 w-8 text-orange-500" />
              Product Studio Background
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
            </h1>
            <p className="text-muted-foreground">
              Replace product backgrounds with professional studio quality
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
            {/* Step 1: Upload */}
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
                  Configure Background & Style
                </h2>
                <ProductStudioSettings
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
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Background:</strong> {settings.backgroundType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Shadow:</strong> {settings.shadowStyle}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Lighting:</strong> {settings.lighting}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Format:</strong> {settings.outputFormat.toUpperCase()}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Studio Background
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
              <p className="text-xs text-muted-foreground mt-1">Backend integration coming soon</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Use high-quality product images</li>
                <li>• Center the product in frame</li>
                <li>• Avoid cluttered backgrounds</li>
                <li>• Soft shadows work best for e-commerce</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default ProductStudioBackground;
