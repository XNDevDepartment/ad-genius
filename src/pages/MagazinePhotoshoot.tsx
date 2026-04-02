import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { MagazineSettings } from "@/components/MagazineSettings";
import { PageTransition } from "@/components/PageTransition";

export type MagazineStyle = "vogue" | "street" | "luxury" | "avant-garde" | "classic" | "cinematic";
export type ColorGrading = "warm" | "cool" | "bw" | "vintage" | "vibrant";
export type Mood = "dramatic" | "elegant" | "playful" | "mysterious";
export type BackgroundStyle = "studio" | "urban" | "nature" | "abstract";

export interface MagazineSettings {
  style: MagazineStyle;
  colorGrading: ColorGrading;
  mood: Mood;
  background: BackgroundStyle;
  numVariations: number;
}

const MagazinePhotoshoot = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [step, setStep] = useState(1);
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [settings, setSettings] = useState<MagazineSettings>({
    style: "vogue",
    colorGrading: "warm",
    mood: "elegant",
    background: "studio",
    numVariations: 2
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
    setSourceImage(file);
    setStep(2);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    toast({
      title: "Backend Integration Coming Soon",
      description: "Magazine photoshoot generation will be available soon"
    });
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const canGenerate = sourceImage !== null;

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
              <Camera className="h-8 w-8 text-orange-500" />
              Magazine/Professional Photoshoot
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
            </h1>
            <p className="text-muted-foreground">
              Transform photos into high-fashion editorial magazine spreads
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
                  Upload Source Photo
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a portrait or full-body photo for transformation
                </p>
                <ImageUploader 
                  onImageSelect={handleImageUpload} 
                  selectedImage={sourceImage}
                />
                {sourceImage && (
                  <div className="mt-4">
                    <img
                      src={URL.createObjectURL(sourceImage)}
                      alt="Source"
                      className="w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </Card>
            )}

            {/* Step 2-3: Settings */}
            {step >= 2 && sourceImage && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">2</span>
                  Select Photoshoot Style
                </h2>
                <MagazineSettings
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
                      <strong>Style:</strong> {settings.style}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Color Grading:</strong> {settings.colorGrading}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Mood:</strong> {settings.mood}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Background:</strong> {settings.background}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Variations:</strong> {settings.numVariations}
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
                        Creating Photoshoot...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Magazine Photoshoot
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
                {settings.numVariations} variations
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Style Guide</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li><strong>Vogue:</strong> High-fashion, dramatic</li>
                <li><strong>Street:</strong> Urban, candid, vibrant</li>
                <li><strong>Luxury:</strong> Premium, sophisticated</li>
                <li><strong>Avant-Garde:</strong> Artistic, bold</li>
                <li><strong>Classic:</strong> Timeless, elegant</li>
                <li><strong>Cinematic:</strong> Film-like, moody</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default MagazinePhotoshoot;
