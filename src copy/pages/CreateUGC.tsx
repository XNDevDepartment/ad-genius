import { useState } from "react";
import { ArrowLeft, Upload, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ImageUploader from "@/components/ImageUploader";
import ScenarioChips from "@/components/ScenarioChips";
import ImageGallery from "@/components/ImageGallery";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}

const CreateUGC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<"setup" | "generating" | "results">("setup");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [audience, setAudience] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(["unboxing"]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numImages, setNumImages] = useState(3);
  const [orientation, setOrientation] = useState("square");
  const [timeOfDay, setTimeOfDay] = useState("natural");
  const [style, setStyle] = useState("lifestyle");
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const scenarios = [
    { id: "unboxing", label: "Unboxing", emoji: "📦" },
    { id: "flatlay", label: "Flat-lay", emoji: "🎨" },
    { id: "pov", label: "POV", emoji: "👀" },
    { id: "lifestyle", label: "Lifestyle", emoji: "✨" },
    { id: "review", label: "Review", emoji: "⭐" },
    { id: "tutorial", label: "Tutorial", emoji: "📚" },
  ];

  const handleGenerate = async () => {
    if (!productImage || !audience.trim()) {
      toast({
        title: "Missing Information",
        description: "Please upload a product image and describe your target audience.",
        variant: "destructive",
      });
      return;
    }

    setStage("generating");
    setProgress(0);

    // Simulate AI generation progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    // Simulate generation delay
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      
      // Mock generated images
      const mockImages: GeneratedImage[] = [
        {
          id: "1",
          url: "/api/placeholder/400/400",
          prompt: `${selectedScenarios.join(", ")} style UGC content for ${audience}`,
          selected: false,
        },
        {
          id: "2", 
          url: "/api/placeholder/400/400",
          prompt: `${selectedScenarios.join(", ")} style UGC content for ${audience}`,
          selected: false,
        },
        {
          id: "3",
          url: "/api/placeholder/400/400", 
          prompt: `${selectedScenarios.join(", ")} style UGC content for ${audience}`,
          selected: false,
        },
      ];
      
      setGeneratedImages(mockImages);
      setStage("results");
      
      toast({
        title: "Images Generated!",
        description: "Your UGC images are ready to review.",
      });
    }, 3000);
  };

  const handleImageSelect = (imageId: string) => {
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const selectedImages = generatedImages.filter(img => img.selected);

  if (stage === "generating") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container-mobile px-4 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">Generating...</h1>
            <p className="text-muted-foreground lg:text-lg">Creating your UGC images with AI</p>
          </div>
          
          <div className="space-y-2 max-w-md mx-auto">
            <Progress value={progress} className="h-3 lg:h-4" />
            <p className="text-sm lg:text-base text-muted-foreground">{Math.round(progress)}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "results") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-responsive px-4 py-8 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStage("setup")}
              className="lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold">Your Images</h1>
          </div>

          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <ImageGallery 
                images={generatedImages}
                onImageSelect={handleImageSelect}
              />
            </div>

            <div className="lg:col-span-1 mt-6 lg:mt-0">
              <div className="bg-card rounded-apple p-6 shadow-apple space-y-4 lg:sticky lg:top-8">
                <h3 className="font-semibold text-lg">Actions</h3>
                
                <Button 
                  variant="default" 
                  className="w-full"
                  disabled={selectedImages.length === 0}
                >
                  Save to Project ({selectedImages.length})
                </Button>
                
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
                  <Button variant="outline" className="w-full">
                    Download All
                  </Button>
                  <Button variant="outline" className="w-full">
                    Generate More
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setStage("setup")}>
                    New Creation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-responsive px-4 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Header */}
          <div className="lg:col-span-12 mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-bold">Create UGC Content</h1>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-7">
            <div className="bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6">
              <ImageUploader 
                onImageSelect={setProductImage}
                selectedImage={productImage}
              />

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Textarea
                  id="audience"
                  placeholder="Describe your target audience..."
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="rounded-apple-sm lg:min-h-[120px]"
                />
              </div>

              <ScenarioChips
                scenarios={scenarios}
                selected={selectedScenarios}
                onChange={setSelectedScenarios}
              />

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Advanced Settings {showAdvanced ? "▲" : "▼"}
              </button>

              {showAdvanced && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numImages"># Images</Label>
                      <Input
                        id="numImages"
                        type="number"
                        min="1"
                        max="6"
                        value={numImages}
                        onChange={(e) => setNumImages(parseInt(e.target.value))}
                        className="rounded-apple-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="orientation">Orientation</Label>
                      <select
                        id="orientation"
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm"
                      >
                        <option value="square">Square</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeOfDay">Time of Day</Label>
                      <select
                        id="timeOfDay"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm"
                      >
                        <option value="natural">Natural</option>
                        <option value="morning">Morning</option>
                        <option value="golden">Golden Hour</option>
                        <option value="studio">Studio</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="style">Style</Label>
                      <select
                        id="style"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm"
                      >
                        <option value="lifestyle">Lifestyle</option>
                        <option value="minimal">Minimal</option>
                        <option value="vibrant">Vibrant</option>
                        <option value="professional">Professional</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Settings & Preview */}
          <div className="lg:col-span-5 mt-6 lg:mt-0">
            <div className="bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 lg:sticky lg:top-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Images:</span>
                    <span className="font-medium">{numImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orientation:</span>
                    <span className="font-medium capitalize">{orientation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style:</span>
                    <span className="font-medium capitalize">{style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scenarios:</span>
                    <span className="font-medium">{selectedScenarios.length}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full"
                  onClick={handleGenerate}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Images
                </Button>
                
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Generation typically takes 30-60 seconds
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUGC;