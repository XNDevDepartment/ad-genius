import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw, Loader2 } from "lucide-react";
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
import { useCredits } from "@/hooks/useCredits";
import { useImageLimit } from "@/hooks/useImageLimit";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Description } from "@radix-ui/react-dialog";
import OrientationSelector from "@/components/OrientationSelector";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}


interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
}

const CreateUGC = () => {
  console.log('CreateUGC component rendering...');

  const { user, subscriptionData } = useAuth();
  const { credits, canAfford, deductCredits, getRemainingCredits } = useCredits();
  const { saveImages } = useSecureImageStorage();
  const [showAuthModal, setShowAuthModal] = useState(!user);
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('high');
  const { remainingCredits, canGenerateImages, isAtLimit, refreshCount, calculateImageCost } = useImageLimit(imageQuality);
  
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
  const { saveConversation, saveMessage, getActiveConversation } = useConversationStorage();
  const [stage, setStage] = useState<"setup" | "generating" | "results">("setup");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [imageOrientation, setImageOrientation] = useState("1:1");
  const [timeOfDay, setTimeOfDay] = useState("natural");
  const [style, setStyle] = useState("lifestyle");
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);


  // Move all refs and effects to the top, before any conditional returns
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Block access if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/account');
    }
  }, [user, navigate]);

  // On every render where `niche` changed, shrink then grow to fit
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return

    // reset to let it shrink when lines are removed
    el.style.height = 'auto'
    // expand to fit current content
    el.style.height = el.scrollHeight + 'px'
  }, [niche]);
 

  const ASSISTANT_ID = "asst_zX2cHyZXHY1mj5CT4wzdJLU6";

  // Initialize a new OpenAI thread when component mounts
  const initializeThread = async () => {
    try {
      const result = await startConversationAPI(ASSISTANT_ID);

      setThreadId(result.threadId);
      console.log('New thread created with new-openai-chat:', result.threadId);
      
      // Save conversation to database
      const conversation = await saveConversation({
        threadId: result.threadId,
        assistantId: ASSISTANT_ID
      });
      
      if (conversation) {
        setConversationId(conversation.id);
      }
      
    } catch (error) {
      console.error('Error initializing thread:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to start conversation with AI assistant. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Initialize thread on component mount
  useEffect(() => {
    initializeThread();
  }, []);

  const handleImageUpload = async (file: File) => {
    setProductImage(file);
    
    // Start conversation with assistant to identify the product
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const reply = await sendImageAndRun(
          threadId!,
          ASSISTANT_ID,
          base64,
          file.name,
          'I have uploaded a product image. Please analyze it. Dont answer this message.'
        );

        setProductIdentification(reply);

        // Save user message and assistant response (only if user is authenticated)
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: 'I have uploaded a product image. Please analyze it. Dont answer this message',
            metadata: { hasImage: true }
          });

          await saveMessage({
            conversationId,
            role: 'assistant',
            content: reply,
            metadata: { analysisType: 'product_identification' }
          });
        }

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

  const handleNicheChange = (nicheText: string) => {
    setNiche(nicheText);
  };

  const getScenariosFromConversation = async (nicheText?: string) => {
    const targetNiche = nicheText || niche;
    setIsLoadingScenarios(true);
    try {
      const responseText = await converse(
        threadId!,
        `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide 6 creative UGC scenario ideas.`,
        ASSISTANT_ID
      );
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scenarios = JSON.parse(jsonMatch[0]);
        setAiScenarios(scenarios.scenarios || []);

        // Save user message and assistant response
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide 6 creative UGC scenario ideas.`,
            metadata: { requestType: 'scenario_generation' }
          });

          await saveMessage({
            conversationId,
            role: 'assistant',
            content: responseText,
            metadata: { scenarioCount: scenarios.scenarios?.length || 0 }
          });
        }
        
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
    setProgress(0);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const response = await sendImageAndRun(
          threadId,
          ASSISTANT_ID,
          base64,
          'product-image.jpg',
          `Product niche: ${niche}. Please provide 6 creative UGC scenario ideas for this product. Return ONLY a JSON object.`
        );

        const responseText = response;
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
    setAiScenarios([]); // Clear existing scenarios
    setIsLoadingScenarios(true);
    await getScenarios();
  };

  // handleGenerate.ts – final version aligned with Supabase contract
  // Generates UGC images by sending a **Data‑URL string** to the edge function.

  // helper: File → Data‑URL (base64)
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    if (!productImage || !selectedScenario) {
      toast({
        title: 'Missing information',
        description: 'Please upload a product image and select a scenario.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user can generate the requested number of images
    if (!canGenerateImages(numImages)) {
      const creditsNeeded = calculateImageCost(imageQuality, numImages);
      toast({
        title: 'Insufficient credits',
        description: `You need ${creditsNeeded} credits to generate ${numImages} ${imageQuality}-quality image(s). You have ${remainingCredits} credits remaining.`,
        variant: 'destructive',
      });
      return;
    }

    // Prepare for generation
    const creditsNeeded = calculateImageCost(imageQuality, numImages);

    try {
      // Deduct credits before generation
      const success = await deductCredits(creditsNeeded);
      if (!success) {
        toast({
          title: 'Credit deduction failed',
          description: 'Unable to deduct credits. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setIsGenerating(true);
      setStage('generating');
      setProgress(0);
      setGeneratedImages([]);

      // smooth‑scroll to progress area
      setTimeout(() => {
        document.getElementById('generating-images')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      /* ------------------------------------------------------------------
        1️⃣  Prepare payloads once (Data‑URL + prompt)
      ------------------------------------------------------------------*/
      const baseFileData = await fileToDataUrl(productImage); // Data URL with prefix

      const prompt =
      'Ultra‑detailed UGC photograph of my product positioned ' + selectedScenario.description +
      ', shot in ' + timeOfDay + ' light using a full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200. ' +
      'Center‑weighted autofocus locked on the product. True‑to‑life colors and surface texture with subtle, authentic imperfections. ' +
      'Composition: product fills about 70 percent of the frame, slight background bokeh for depth while preserving scenario context; camera at eye‑level angle—no wide‑angle distortion. The product must have maximum quality and all the details of the original image must be preserved at all costs. ' +
      'Visual mood: ' + style + ' yet ultra-realistic. --negative "AI artifacts, text overlays, watermark, lens flare, distorted or rotated labels, invented branding, extra limbs, low resolution, out‑of‑focus product, over‑saturation" --ar ';

      const imageObjects: GeneratedImage[] = [];

      /* ------------------------------------------------------------------
        2️⃣  // Generate all images in parallel
      ------------------------------------------------------------------*/
      const imagePromises = Array.from({ length: numImages }, async (_, i) => {
        try {
          const res = await generateImagesFromBase(
            baseFileData,
            prompt,
            {
              number: 1,
              size: imageOrientation === '1:1' ? '1024x1024' : imageOrientation === '4:3' ? '1024x768' : '768x1024',
              quality: imageQuality,
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

      /* ------------------------------------------------------------------
        3️⃣  Wrap‑up
      ------------------------------------------------------------------*/
      setGeneratedImages(validImages);
      setProgress(100);
      setStage('results');

      await handleSaveImages(validImages);
      
      // Refresh image count after saving
      await refreshCount();

      toast({
        title: 'Images generated!',
        description: `Successfully created ${validImages.length} images.`
      });

    } catch (err) {
      console.error('handleGenerate failed:', err);
      toast({ title: 'Generation failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      setStage('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (imageId: string) => {
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const toggleImageSelection = (imageId: string) => {
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const selectedImages = generatedImages.filter(img => img.selected);

  const handleSaveImages = async (validImages: GeneratedImage[]) => {
    if (validImages.length === 0) {
      toast({
        title: "No images to save",
        description: "No generated images to save to your library.",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64Images = validImages.map(img =>
        img.url.replace('data:image/png;base64,', '')
      );

      await saveImages({
        base64Images,
        prompt: validImages[0].prompt,
        settings: {
          numImages,
          orientation: imageOrientation,
          timeOfDay,
          style,
          scenario: selectedScenario
        }
      });

      toast({
        title: "Images auto-saved!",
        description: `Successfully saved ${validImages.length} images to your library.`,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast({
        title: "Auto-save failed",
        description: "Failed to automatically save images. You can still download them.",
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



  if (stage === "results") {
    return (
      <div className="min-h-screen bg-background">
      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          <AuthModal 
            onSuccess={() => setShowAuthModal(false)}
            onClose={() => setShowAuthModal(false)}
          />
        </DialogContent>
      </Dialog>
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
            <p className="text-muted-foreground">
              Select the images you'd like to download
            </p>
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

                {/* <Button
                  variant="default"
                  className="w-full"
                  disabled={selectedImages.length === 0 || isGenerating}
                  onClick={handleSaveImages}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    `Save to Project (${selectedImages.length})`
                  )}
                </Button> */}

                <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
                  <Button variant="default" className="w-full" onClick={handleDownloadAll}>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
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

      <div className="container-responsive px-4 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Header */}
          <div className="lg:col-span-12 mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/create")}
                className="lg:hidden"
                disabled={!threadId}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-bold">Create UGC Content</h1>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-7">
            <div className={`bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
              <ImageUploader 
                onImageSelect={handleImageUpload}
                selectedImage={productImage}
              />

              {/* {productIdentification && (
                <div className="p-3 bg-muted rounded-apple-sm">
                  <p className="text-sm text-muted-foreground">AI Analysis:</p>
                  <p className="text-sm mt-1">{productIdentification}</p>
                </div>
              )} */}

              <div className="space-y-2">
                <Label htmlFor="niche">Product Niche</Label>
                <Textarea
                  ref={taRef}
                  id="niche"
                  placeholder="Describe your product niche (max 250 char.)"
                  value={niche}
                  maxLength={250}
                  onChange={(e) => handleNicheChange(e.target.value)}
                  className="rounded-apple-sm min-h-0 overflow-hidden resize-none w-full"
                  style={{ lineHeight: '1.5rem' }}
                  disabled={!threadId}
                  rows={1}
                />
                {/* live counter, right‑aligned and muted */}
                <div className="flex justify-end text-sm text-muted-foreground">
                  {niche.length} / 250
                </div>

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
                  <div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => getScenariosFromConversation()}
                    disabled={isLoadingScenarios || !productImage || !niche.trim() || !threadId}
                  >
                    {isLoadingScenarios ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Scenarios"
                    )}
                  </Button>
                  </div>
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
                          onClick={() => {
                            console.log('Scenario selected:', scenario);
                            setSelectedScenario(scenario);
                          }}
                        >
                          <h4 className="font-medium text-sm">{scenario.idea}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{scenario['small-description']}</p>
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
                        max="3"
                        value={numImages}
                        onChange={(e) => setNumImages(parseInt(e.target.value))}
                        className="rounded-apple-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <OrientationSelector
                        value={imageOrientation}
                        onChange={setImageOrientation}
                      />
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

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="imageQuality">Image Quality</Label>
                      <select
                        id="imageQuality"
                        value={imageQuality}
                        onChange={(e) => setImageQuality(e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm"
                      >
                        <option value="high">High Quality (2 credits per image)</option>
                        <option value="medium">Medium Quality (1.5 credits per image)</option>
                        <option value="low">Low Quality (1 credit per image)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Settings & Preview */}
          <div className="lg:col-span-5 mt-6 lg:mt-0">
            <div className={`bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 lg:sticky lg:top-8 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits available:</span>
                    <span className="font-medium">{credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">{calculateImageCost(imageQuality, numImages)} credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="font-medium capitalize">{imageQuality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Images:</span>
                    <span className="font-medium">{numImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orientation:</span>
                    <span className="font-medium">{imageOrientation}</span>
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
                  className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                  onClick={handleGenerate}
                  disabled={!productImage || !selectedScenario || isGenerating || !canAfford(calculateImageCost(imageQuality, numImages)) || !canGenerateImages(numImages)}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Images
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isGenerating ? 'AI is creating your images...' : 
                   !canGenerateImages(numImages) ? `Insufficient credits (${remainingCredits} remaining)` :
                   !canAfford(calculateImageCost(imageQuality, numImages)) ? `Need ${calculateImageCost(imageQuality, numImages)} credits to generate` :
                   'Generation typically takes 30-60 seconds'}
                </p>
                
                {(!canAfford(calculateImageCost(imageQuality, numImages)) || !canGenerateImages(numImages)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => window.location.href = '/pricing'}
                  >
                    Upgrade for More Credits
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generating Images Section */}
        {stage === "generating" && (
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

            {/* <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div> */}

            <GeneratingImagePlaceholders numberOfImages={numImages} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateUGC;