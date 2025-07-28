import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ImageUploader from "@/components/ImageUploader";
import ImageGallery from "@/components/ImageGallery";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversationStorage } from "@/hooks/useConversationStorage";
import { startConversationAPI, converse, sendImageAndRun, generateImagesFromBase } from '@/api/OpenAiChatClient';
import { useSecureImageStorage } from "@/components/departments/ugc/SecureImageStorage";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  console.log('CreateUGC component rendering...');

  const { user } = useAuth();
  const { saveImages } = useSecureImageStorage();
  const [showAuthModal, setShowAuthModal] = useState(!user);
  
  // Add error boundary for useNavigate
  let navigate;
  try {
    navigate = useNavigate();
    console.log('useNavigate hook successful');
  } catch (error) {
    console.error('useNavigate hook failed:', error);
    console.log('Router context might be missing');
    // Fallback navigation function
    navigate = () => {
      console.error('Navigation attempted but useNavigate failed');
      window.location.href = '/create';
    };
  }
  const { toast } = useToast();
  
  const {
    saveConversation,
    saveMessage,
    getConversationByThreadId,
    updateConversationStatus,
    getConversationMessages,
    getActiveConversation,
  } = useConversationStorage();

  const [stage, setStage] = useState<'setup' | 'generating' | 'results'>('setup');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [orientation, setOrientation] = useState("square");
  const [timeOfDay, setTimeOfDay] = useState("natural");
  const [style, setStyle] = useState("lifestyle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // AI Generation states
  const [productImage, setProductImage] = useState<File | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // AI Configuration
  const ASSISTANT_ID = "asst_eYcm4g7V8I2RMQBaP3EFqLm4";

  useEffect(() => {
    const initializeThread = async () => {
      try {
        console.log('Creating new thread...');
        const result = await startConversationAPI(ASSISTANT_ID);
        console.log('Thread creation result:', result);
        
        if (result?.threadId) {
          setThreadId(result.threadId);
          console.log('Thread created successfully:', result.threadId);
          
          // Save conversation if user is authenticated
          if (user) {
            const conversation = await saveConversation({
              threadId: result.threadId,
              assistantId: ASSISTANT_ID,
            });
            console.log('Conversation saved:', conversation);
          }
        } else {
          console.error('No threadId in result:', result);
          throw new Error('Failed to get threadId from result');
        }
      } catch (error) {
        console.error('Failed to initialize thread:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to start conversation. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    if (!threadId) {
      initializeThread();
    }
  }, []);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleNicheAnalysis = async () => {
    if (!productImage || !niche.trim()) {
      toast({
        title: "Missing Information",
        description: "Please upload a product image and describe your niche.",
        variant: "destructive",
      });
      return;
    }

    if (!threadId) {
      toast({
        title: "System Not Ready",
        description: "Please wait for the system to initialize.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAiScenarios([]);
      
      const base64Image = await fileToDataUrl(productImage);
      
      const prompt = `Analyze this product image and the niche: "${niche}". 
      Generate 5 specific UGC scenario ideas that would work well for this product in this niche. 
      For each scenario, provide:
      1. A brief title/idea (max 4 words)
      2. A detailed description of the setting, context, and how the product would be featured
      
      Format your response as JSON:
      {
        "scenarios": [
          {"idea": "Brief Title", "description": "Detailed description of the scenario"},
          ...
        ]
      }`;

      console.log('Sending image analysis request...');
      const response = await sendImageAndRun(threadId, ASSISTANT_ID, base64Image, "product-image.jpg", prompt);
      console.log('Analysis response:', response);

      if (response) {
        try {
          // Try to parse JSON from the response
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
              setAiScenarios(parsed.scenarios);
              toast({
                title: "Analysis Complete",
                description: `Generated ${parsed.scenarios.length} scenario suggestions.`,
              });
            } else {
              throw new Error('Invalid response format');
            }
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          // Fallback: create generic scenarios
          const fallbackScenarios = [
            { idea: "Lifestyle Context", description: "Product naturally integrated into daily life setting" },
            { idea: "Professional Use", description: "Product demonstrated in professional environment" },
            { idea: "Casual Setting", description: "Product showcased in relaxed, informal context" },
          ];
          setAiScenarios(fallbackScenarios);
          toast({
            title: "Analysis Complete",
            description: "Generated scenario suggestions (using fallback).",
          });
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!productImage || !selectedScenario) {
      toast({
        title: 'Missing information',
        description: 'Please upload a product image and select a scenario.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);
      setStage('generating');
      setProgress(0);
      setGeneratedImages([]);

      // smooth‑scroll to progress area
      setTimeout(() => {
        document.getElementById('generating-images')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      const prompt =
      'Ultra‑detailed UGC photograph of my product positioned ' + selectedScenario.description +
      ', shot in natural ' + timeOfDay + ' light using a full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200. ' +
      'Center‑weighted autofocus locked on the product. True‑to‑life colors and surface texture with subtle, authentic imperfections. ' +
      'Composition: product fills about 70 percent of the frame, slight background bokeh for depth while preserving scenario context; camera at eye‑level angle—no wide‑angle distortion. ' +
      'Visual mood: ' + style + ' yet realistic. --negative "AI artifacts, text overlays, watermark, lens flare, distorted or rotated labels, invented branding, extra limbs, low resolution, out‑of‑focus product, over‑saturation" --ar ';
      
      // Generate all images in parallel
      const imagePromises = Array.from({ length: numImages }, async (_, i) => {
        try {
          const res = await generateImagesFromBase(
            productImage,
            prompt,
            {
              number: 1,
              size: orientation === 'square' ? '1024x1024' : orientation === 'portrait' ? '1024x1536' : '1536x1024',
              quality: 'high',
              output_format: 'png',
            }
          );

          const images = Array.isArray(res) ? res : (res && (res as any).images) ? (res as any).images : [];
          
          if (images && images.length > 0) {
            return {
              id: `${Date.now()}-${i}`,
              url: `data:image/png;base64,${images[0]}`,
              prompt,
              selected: false,
            };
          }
          return null;
        } catch (err) {
          console.error(`Image ${i + 1} failed:`, err);
          return null;
        }
      });

      // Wait for all images to complete
      const results = await Promise.all(imagePromises);
      const validImages = results.filter(Boolean) as GeneratedImage[];
      
      setGeneratedImages(validImages);
      setProgress(100);
      setStage('results');
      
      toast({ 
        title: 'Images generated!', 
        description: `Successfully created ${validImages.length} images.` 
      });
    } catch (err) {
      console.error('handleGenerate failed:', err);
      toast({ 
        title: 'Generation failed', 
        description: 'Something went wrong. Please try again.', 
        variant: 'destructive' 
      });
      setStage('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const selectedImages = generatedImages.filter(img => img.selected);

  const handleSaveImages = async () => {
    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64Images = selectedImages.map(img => 
        img.url.replace('data:image/png;base64,', '')
      );
      
      await saveImages({
        base64Images,
        prompt: selectedImages[0].prompt,
        settings: {
          numImages,
          orientation,
          timeOfDay,
          style,
          scenario: selectedScenario
        }
      });

      toast({
        title: "Images saved",
        description: `Successfully saved ${selectedImages.length} images to your library.`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAll = () => {
    const imagesToDownload = selectedImages.length > 0 ? selectedImages : generatedImages;
    
    imagesToDownload.forEach((img, index) => {
      const link = document.createElement('a');
      link.href = img.url;
      link.download = `ugc-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    toast({
      title: "Download started",
      description: `Downloading ${imagesToDownload.length} images.`,
    });
  };

  const handleGenerateMore = () => {
    setStage("setup");
    setGeneratedImages([]);
  };

  const handleNewCreation = () => {
    setStage("setup");
    setGeneratedImages([]);
    setProductImage(null);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario(null);
    setProgress(0);
  };

  // Block access if not authenticated
  useEffect(() => {
    setShowAuthModal(!user);
  }, [user]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          <AuthModal 
            onSuccess={() => setShowAuthModal(false)}
            onClose={() => setShowAuthModal(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Loading Overlay */}
      {!threadId && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold">Preparing system...</h2>
            <p className="text-muted-foreground">Just a moment</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">UGC Creator</h1>
                <p className="text-sm text-muted-foreground">Generate authentic product images</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Setup Stage */}
        {stage === 'setup' && (
          <div className="space-y-8">
            {/* Product Upload */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Product Image</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a clear image of your product
                </p>
              </div>
              <ImageUploader
                onImageSelect={setProductImage}
                selectedImage={productImage}
              />
            </div>

            {/* Niche Input */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Product Niche</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Describe your product category and target market
                </p>
              </div>
              <Textarea
                placeholder="e.g., sustainable skincare for millennials, tech accessories for remote workers, fitness supplements for athletes..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="min-h-[100px]"
              />
              <Button 
                onClick={handleNicheAnalysis}
                disabled={!productImage || !niche.trim() || !threadId}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze & Generate Scenarios
              </Button>
            </div>

            {/* AI Scenarios */}
            {aiScenarios.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Choose Scenario</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the scenario that best fits your vision
                  </p>
                </div>
                <div className="grid gap-3">
                  {aiScenarios.map((scenario, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedScenario?.idea === scenario.idea
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedScenario(scenario)}
                    >
                      <h3 className="font-medium text-sm mb-1">{scenario.idea}</h3>
                      <p className="text-xs text-muted-foreground">{scenario.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generation Settings */}
            {selectedScenario && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Generation Settings</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize your image generation
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="numImages">Number of Images</Label>
                    <select
                      id="numImages"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={numImages}
                      onChange={(e) => setNumImages(Number(e.target.value))}
                    >
                      <option value={1}>1 Image</option>
                      <option value={2}>2 Images</option>
                      <option value={3}>3 Images</option>
                      <option value={4}>4 Images</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orientation">Orientation</Label>
                    <select
                      id="orientation"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                    >
                      <option value="square">Square (1:1)</option>
                      <option value="portrait">Portrait (3:4)</option>
                      <option value="landscape">Landscape (4:3)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeOfDay">Lighting</Label>
                    <select
                      id="timeOfDay"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    >
                      <option value="natural">Natural Light</option>
                      <option value="golden hour">Golden Hour</option>
                      <option value="soft">Soft Light</option>
                      <option value="dramatic">Dramatic Light</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Style</Label>
                    <select
                      id="style"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                    >
                      <option value="lifestyle">Lifestyle</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="professional">Professional</option>
                      <option value="artistic">Artistic</option>
                    </select>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !threadId}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Images
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Generating Stage */}
        {stage === 'generating' && (
          <div id="generating-images" className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-2xl font-semibold">Generating Your Images</h2>
              <p className="text-muted-foreground">
                Creating {numImages} unique UGC image{numImages > 1 ? 's' : ''} based on your preferences...
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <GeneratingImagePlaceholders numberOfImages={numImages} />
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && generatedImages.length > 0 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Your Generated Images</h2>
              <p className="text-muted-foreground">
                Select the images you'd like to save or download
              </p>
            </div>

            <ImageGallery
              images={generatedImages}
              onImageSelect={toggleImageSelection}
            />

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {selectedImages.length > 0 
                    ? `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} selected`
                    : 'No images selected'
                  }
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="default" 
                  className="w-full"
                  disabled={selectedImages.length === 0}
                  onClick={handleSaveImages}
                >
                  Save to Library ({selectedImages.length})
                </Button>
                
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
                  <Button variant="outline" className="w-full" onClick={handleDownloadAll}>
                    Download {selectedImages.length > 0 ? 'Selected' : 'All'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleGenerateMore}>
                    Generate More
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleNewCreation}>
                    New Creation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateUGC;