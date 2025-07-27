import { useState } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ImageUploader from "@/components/ImageUploader";
import ImageGallery from "@/components/ImageGallery";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}

interface AIScenario {
  idea: string;
  description: string;
}

const CreateUGC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<"setup" | "generating" | "results">("setup");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numImages, setNumImages] = useState(3);
  const [orientation, setOrientation] = useState("square");
  const [timeOfDay, setTimeOfDay] = useState("natural");
  const [style, setStyle] = useState("lifestyle");
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const ASSISTANT_ID = "asst_zX2cHyZXHY1mj5CT4wzdJLU6";

  const handleImageUpload = async (file: File) => {
    setProductImage(file);
    
    // Start conversation with assistant to identify the product
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            action: 'converse',
            threadId: threadId,
            content: [
              { 
                type: 'text', 
                text: 'I have uploaded a product image. Please analyze it and tell me what product you see. Be specific about the product type, key features, and any details that would help with creating UGC content.' 
              },
              {
                type: 'image_file',
                image_file: { file_id: base64 }
              }
            ],
            assistantId: ASSISTANT_ID
          }
        });

        if (error) throw error;

        setThreadId(data.threadId);
        setProductIdentification(data.reply);
        
        toast({
          title: "Product Analyzed",
          description: "AI has identified your product. Now describe your niche to get scenario suggestions.",
        });
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error analyzing product image:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze the product image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNicheChange = async (nicheText: string) => {
    setNiche(nicheText);
    
    // If we have both image and niche, get scenarios automatically
    if (productImage && nicheText.trim() && threadId) {
      await getScenariosFromConversation(nicheText);
    }
  };

  const getScenariosFromConversation = async (nicheText: string) => {
    setIsLoadingScenarios(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          action: 'converse',
          threadId: threadId,
          content: [
            { 
              type: 'text', 
              text: `Product niche: ${nicheText}. Based on the product image I shared and this niche description, please provide 8 creative UGC scenario ideas. Return ONLY a JSON object with this exact structure: {"scenarios": [{"idea": "short idea name", "description": "detailed description"}]}` 
            }
          ],
          assistantId: ASSISTANT_ID
        }
      });

      if (error) throw error;

      const responseText = data.reply;
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scenarios = JSON.parse(jsonMatch[0]);
        setAiScenarios(scenarios.scenarios || []);
        
        toast({
          title: "Scenarios Generated",
          description: `Got ${scenarios.scenarios?.length || 0} UGC scenario ideas for your product.`,
        });
      }
    } catch (error) {
      console.error('Error getting scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to get scenario suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const getScenarios = async () => {
    if (!productImage || !niche.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please upload a product image and describe your niche.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingScenarios(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            action: 'converse',
            threadId: null,
            content: [
              { 
                type: 'text', 
                text: `Product niche: ${niche}. Please provide 8 creative UGC scenario ideas for this product. Return ONLY a JSON object with this exact structure: {"scenarios": [{"idea": "short idea name", "description": "detailed description"}]}` 
              },
              {
                type: 'image_file',
                image_file: { file_id: base64 }
              }
            ],
            assistantId: ASSISTANT_ID
          }
        });

        if (error) throw error;

        const responseText = data.reply;
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const scenarios = JSON.parse(jsonMatch[0]);
          setAiScenarios(scenarios.scenarios || []);
        }
      };
      reader.readAsDataURL(productImage);
      
    } catch (error) {
      console.error('Error getting scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to get scenario suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const generateMoreScenarios = async () => {
    await getScenarios();
  };

  const handleGenerate = async () => {
    if (!productImage || !selectedScenario) {
      toast({
        title: "Missing Information",
        description: "Please upload a product image and select a scenario.",
        variant: "destructive",
      });
      return;
    }

    setStage("generating");
    setProgress(0);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Build the prompt
        const prompt = `
[${selectedScenario.idea}] on/in/with [${selectedScenario.description}],
shot in [${timeOfDay} lighting], 
captured with [professional camera details],
showing [natural texture & imperfections], 
evoking a [${style}] vibe,
photorealistic, 8k detail, natural color grading,
--negative "AI artifacts, over-saturation, text, watermark, lens flare" --ar ${orientation === 'square' ? '1:1' : orientation === 'portrait' ? '4:5' : '16:9'}
        `.trim();

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            action: 'generateImages',
            baseFileData: base64,
            prompt,
            options: {
              number: numImages,
              size: orientation === 'square' ? '1024x1024' : orientation === 'portrait' ? '1024x1536' : '1536x1024',
              quality: 'high',
              output_format: 'png'
            }
          }
        });

        if (error) throw error;

        // Process generated images
        const images: GeneratedImage[] = data.images.map((base64Image: string, index: number) => ({
          id: `${Date.now()}-${index}`,
          url: `data:image/png;base64,${base64Image}`,
          prompt,
          selected: false,
        }));

        setGeneratedImages(images);
        setStage("results");
        
        toast({
          title: "Images Generated!",
          description: "Your UGC images are ready to review.",
        });
      };
      reader.readAsDataURL(productImage);
      
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate images. Please try again.",
        variant: "destructive",
      });
      setStage("setup");
    } finally {
      setProgress(100);
    }
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
                onImageSelect={handleImageUpload}
                selectedImage={productImage}
              />
              
              {productIdentification && (
                <div className="p-3 bg-muted rounded-apple-sm">
                  <p className="text-sm text-muted-foreground">AI Analysis:</p>
                  <p className="text-sm mt-1">{productIdentification}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="niche">Product Niche</Label>
                <Textarea
                  id="niche"
                  placeholder="Describe your product niche (e.g., skincare, tech accessories, home decor)..."
                  value={niche}
                  onChange={(e) => handleNicheChange(e.target.value)}
                  className="rounded-apple-sm lg:min-h-[120px]"
                />
                
                {isLoadingScenarios && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    AI is generating scenario ideas...
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>UGC Scenarios</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getScenarios}
                    disabled={isLoadingScenarios || !productImage || !niche.trim()}
                  >
                    {isLoadingScenarios ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Getting Ideas...
                      </>
                    ) : (
                      "Get AI Suggestions"
                    )}
                  </Button>
                </div>
                
                {aiScenarios.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      {aiScenarios.map((scenario, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-apple-sm cursor-pointer transition-all ${
                            selectedScenario?.idea === scenario.idea
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedScenario(scenario)}
                        >
                          <h4 className="font-medium text-sm">{scenario.idea}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateMoreScenarios}
                      disabled={isLoadingScenarios}
                      className="w-full"
                    >
                      Give More Options
                    </Button>
                  </div>
                )}
              </div>

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
                    <span className="text-muted-foreground">Scenario:</span>
                    <span className="font-medium">{selectedScenario ? "Selected" : "None"}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={!productImage || !selectedScenario}
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