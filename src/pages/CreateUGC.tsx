import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw, Loader2, HelpCircle, Settings, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Description } from "@radix-ui/react-dialog";
import OrientationSelector from "@/components/OrientationSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Line } from "recharts";
import { SettingsSheet } from "@/components/departments/ugc/SettingsSheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { user, subscriptionData } = useAuth();
  const { credits, canAfford, deductCredits, getRemainingCredits, getTotalCredits } = useCredits();
  const { saveImages } = useSecureImageStorage();
  const { uploadSourceImage, uploading: sourceImageUploading } = useSourceImageUpload();
  const [showAuthModal, setShowAuthModal] = useState(!user);
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('high');
  const { remainingCredits, canGenerateImages, isAtLimit, refreshCount, calculateImageCost } = useImageLimit(imageQuality);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
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
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [numImages, setNumImages] = useState(1);
  const [imageOrientation, setImageOrientation] = useState("1:1");
  const [timeOfDay, setTimeOfDay] = useState<'natural' | 'golden' | 'night' | 'morning'>("natural");
  const [highlight, setHighlight] = useState("yes");
  const [style, setStyle] = useState<'lifestyle' | 'studio' | 'editorial' | 'natural'>("lifestyle");
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Compute compact summary for mobile panel
  const summary = `${numImages} img • ${imageQuality.charAt(0).toUpperCase() + imageQuality.slice(1)} • ${highlight === 'yes' ? 'Focus On' : 'Blend In'} • ${imageOrientation} • ${style} • ${timeOfDay}`;


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
    setIsAnalyzingImage(true);
    
    // Upload source image to secure storage
    try {
      const sourceImage = await uploadSourceImage(file);
      if (sourceImage) {
        setSourceImageId(sourceImage.id);
        console.log('Source image uploaded with ID:', sourceImage.id);
      }
    } catch (error) {
      console.error('Failed to upload source image:', error);
      // Continue with the product analysis even if source upload fails
    }
    
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

        setIsAnalyzingImage(false);
        toast({
          title: "Product Analyzed",
          description: "AI has identified your product. Now describe your niche to get scenario suggestions."
        });
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error analyzing product image:', error);
      setIsAnalyzingImage(false);
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
        `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide 6 creative UGC scenario ideas. Return ONLY a compact JSON object with "scenarios" array.`,
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
    await getScenariosFromConversation();
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

    // Pre-flight check for credit availability (admins bypass this)
    if (!canGenerateImages(numImages)) {
      const creditsNeeded = calculateImageCost(imageQuality, numImages);
      toast({
        title: 'Insufficient credits',
        description: `You need ${creditsNeeded} credits to generate ${numImages} ${imageQuality}-quality image(s). You have ${remainingCredits} credits remaining.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Credits are now deducted server-side during generation

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

      let prompt = "";

      const highlightedProdPrompt =
      'Ultra‑detailed UGC photograph of my product positioned ' + selectedScenario.description +
      ', shot in ' + timeOfDay + ' light using a full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200. ' +
      'Center‑weighted autofocus locked on the product. True‑to‑life colors and surface texture with subtle, authentic imperfections. ' +
      'Composition: product fills about 70 percent of the frame, slight background bokeh for depth while preserving scenario context; camera at eye‑level angle—no wide‑angle distortion. The product must have maximum quality and all the details of the original image must be preserved at all costs. ' +
      'Visual mood: ' + style + ' yet ultra-realistic. --negative "AI artifacts, text overlays, watermark, lens flare, distorted or rotated labels, invented branding, extra limbs, low resolution, out‑of‑focus product, over‑saturation" --ar ';


      const blendedProdPrompt =
      'A hyper-realistic lifestyle photograph where my product ' +
      'is naturally integrated into the scene. The setting is ' + selectedScenario.description + '. ' +
      'The focus is on accurately replicating my product with sharp details, clear labeling, and realistic textures. ' +
      'Surroundings should enhance the scene but remain slightly out of focus, ensuring the product looks authentic and integrated. ' +
      'Include only partial human presence if relevant (e.g., a hand holding the product, someone reaching for it), but avoid full human bodies. ' +
      'Lighting should be natural, with soft shadows and reflections consistent with the environment, shot in ' + timeOfDay + '. ' +
      'Include ' + style + ' textures, surfaces, and props that reinforce authenticity (e.g., fruits, shaker bottle, towels, books, plants), ultra-realistic. ' +
      'The composition should feel casual, as if captured in daily life, not staged. ' +
      '--negative "AI artifacts, text overlays, watermark, lens flare, distorted or rotated labels, invented branding, extra limbs, full bodies, low resolution, out-of-focus product, over-saturation" --ar ';

      const imageObjects: GeneratedImage[] = [];

      /* ------------------------------------------------------------------
        2️⃣  // Generate all images in parallel
      ------------------------------------------------------------------*/
      const imagePromises = Array.from({ length: numImages }, async (_, i) => {
        if(highlight === "true"){
          prompt = highlightedProdPrompt
        }else{
          prompt = blendedProdPrompt
        }
        try {
          const res = await generateImagesFromBase(
            baseFileData,
            prompt,
            {
              number: 1,
              size: imageOrientation === '1:1' ? '1024x1024' : imageOrientation === '4:3' ? '1536x1024' : '1024x1536',
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

      await handleSaveImages(validImages);
      
      // Refresh image count after saving
      await refreshCount();

      toast({
        title: 'Images generated!',
        description: `Successfully created ${validImages.length} images.`
      });

    } catch (error: any) {
      console.error('Generation error:', error);
      
      // Check if it's a credit-related error
      if (error.message?.includes('Insufficient credits') || error.message?.includes('Credit')) {
        toast({
          title: 'Insufficient credits',
          description: error.message || 'Not enough credits to generate images.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Generation failed',
          description: error.message || 'Failed to generate images. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
      await refreshCount(); // Refresh the credit count to get updated balance
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
        },
        source_image_id: sourceImageId
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
    setGeneratedImages([]);
  };

  const handleNewCreation = () => {
    setGeneratedImages([]);
    setProductImage(null);
    setSourceImageId(null);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario(null);
    setProgress(0);
  };




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
            <div className="flex items-center justify-between">
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
                <h1 className="text-2xl lg:text-3xl font-bold">{t('ugc.title')}</h1>
              </div>

              {/* Mobile Settings Button - Removed since we now have fixed bottom bar */}
            </div>
          </div>

          {/* Main Form */}
          <div className={`${isMobile ? 'col-span-12' : 'lg:col-span-7'} space-y-6`}>
            {/* Product & Niche Card */}
            <Card className={`${!threadId ? 'opacity-50 pointer-events-none' : ' rounded-apple shadow-lg'}`}>
              <CardContent className="p-6 lg:p-8 space-y-6">
                <div>
                  {/* <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold">{t('ugc.productImage.title')}</h2>
                  </div> */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>{t('ugc.productImage.title')}</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{t('ugc.productImage.tooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {/* <p className="text-sm text-muted-foreground">{t('ugc.productImage.subtitle')}</p> */}
                      <ImageUploader 
                        onImageSelect={handleImageUpload}
                        selectedImage={productImage}
                        isAnalyzing={isAnalyzingImage}
                        analyzingText={t('ugc.productImage.analyzing')}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="niche">{t('ugc.productNiche.title')}</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{t('ugc.productNiche.tooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-muted-foreground">{t('ugc.productNiche.subtitle')}</p>
                      <Textarea
                        ref={taRef}
                        id="niche"
                        // placeholder={t('ugc.productNiche.placeholder')}
                        value={niche}
                        maxLength={250}
                        onChange={(e) => handleNicheChange(e.target.value)}
                        className="rounded-apple-sm min-h-0 overflow-hidden resize-none w-full text-base md:text-sm"
                        style={{ lineHeight: '1.5rem' }}
                        disabled={!threadId || isAnalyzingImage}
                        rows={1}
                      />
                      <div className="flex justify-end text-sm text-muted-foreground">
                        {niche.length} / 250
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="default"
                      onClick={() => getScenariosFromConversation()}
                      disabled={isLoadingScenarios || !productImage || !niche.trim() || !threadId || isAnalyzingImage}
                      className="w-full"
                    >
                      {isLoadingScenarios ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('ugc.scenarios.loading')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {t('ugc.scenarios.generateButton')}
                        </>
                      )}
                    </Button>

                    {/* {isLoadingScenarios && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {t('ugc.scenarios.loading')}
                      </div>
                    )} */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* UGC Scenarios Card */}
            {!isLoadingScenarios && aiScenarios.length > 0 && (
              <Card className={`${!threadId ? 'opacity-50 pointer-events-none' : ' rounded-apple shadow-lg'}`}>
                <CardContent className="p-6 lg:p-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold">{t('ugc.scenarios.title')}</h2>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.scenarios.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t('ugc.scenarios.subtitle')}</p>
                    <div className="space-y-4">
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
                        variant="default"
                        onClick={generateMoreScenarios}
                        disabled={isLoadingScenarios}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('ugc.scenarios.generateMoreButton')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Desktop Sidebar - Settings & Preview */}
          {!isMobile && (
            <div className="lg:col-span-5 mt-6 lg:mt-0">
              <div className={`bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 lg:sticky lg:top-8 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('ugc.generationSettings.title')}</h3>
                  
                  {/* Credits Progress Bar */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Credits</span>
                      <span className="font-medium">{remainingCredits} / {credits}</span>
                    </div>
                    <Progress value={(remainingCredits / credits) * 100} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {subscriptionData?.subscription_tier || 'Free'} Plan
                    </div>
                  </div>

                  {/* ... keep existing code (all desktop sidebar settings) */}

                  {/* Number of Images */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sidebar-numImages" className="text-sm font-medium">{t('ugc.numImages.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.numImages.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="sidebar-numImages"
                      type="number"
                      min="1"
                      max="3"
                      value={numImages}
                      onChange={(e) => setNumImages(parseInt(e.target.value))}
                      className="rounded-apple-sm shadow-sm"
                    />
                  </div>

                  {/* Highlight */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sidebar-highlight" className="text-sm font-medium">{t('ugc.advancedSettings.highlight.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.advancedSettings.highlight.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <select
                      id="sidebar-highlight"
                      value={highlight}
                      onChange={(e) => setHighlight(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm shadow-sm text-sm"
                    >
                      <option value="yes">{t('ugc.advancedSettings.highlight.yes')}</option>
                      <option value="no">{t('ugc.advancedSettings.highlight.no')}</option>
                    </select>
                  </div>

                  {/* Time of Day */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sidebar-timeOfDay" className="text-sm font-medium">{t('ugc.advancedSettings.timeOfDay.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.advancedSettings.timeOfDay.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <select
                      id="sidebar-timeOfDay"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value as typeof timeOfDay)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm shadow-sm text-sm"
                    >
                      <option value="natural">{t('ugc.advancedSettings.timeOfDay.natural')}</option>
                      <option value="morning">{t('ugc.advancedSettings.timeOfDay.soft')}</option>
                      <option value="golden">{t('ugc.advancedSettings.timeOfDay.golden')}</option>
                      <option value="studio">{t('ugc.advancedSettings.timeOfDay.bright')}</option>
                    </select>
                  </div>

                  {/* Style */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sidebar-style" className="text-sm font-medium">{t('ugc.advancedSettings.style.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.advancedSettings.style.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <select
                      id="sidebar-style"
                      value={style}
                      onChange={(e) => setStyle(e.target.value as typeof style)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm shadow-sm text-sm"
                    >
                      <option value="lifestyle">{t('ugc.advancedSettings.style.lifestyle')}</option>
                      <option value="minimal">{t('ugc.advancedSettings.style.minimalist')}</option>
                      <option value="vibrant">Vibrant</option>
                      <option value="professional">{t('ugc.advancedSettings.style.professional')}</option>
                    </select>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">{t('ugc.orientation.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.orientation.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <OrientationSelector
                      value={imageOrientation}
                      onChange={setImageOrientation}
                    />
                  </div>

                  {/* Image Quality */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sidebar-imageQuality" className="text-sm font-medium">{t('ugc.imageQuality.title')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                              <HelpCircle className="h-2 w-2 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{t('ugc.imageQuality.tooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <select
                      id="sidebar-imageQuality"
                      value={imageQuality}
                      onChange={(e) => setImageQuality(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-apple-sm shadow-sm text-sm"
                    >
                      <option value="high">{t('ugc.imageQuality.high')} (2 credits per image)</option>
                      <option value="medium">{t('ugc.imageQuality.medium')} (1.5 credits per image)</option>
                      <option value="low">{t('ugc.imageQuality.low')} (1 credit per image)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button 
                    variant={!productImage || !selectedScenario || isGenerating || !canGenerateImages(numImages) ? "secondary" : "default"}
                    size="lg" 
                    className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                    onClick={handleGenerate}
                    disabled={!productImage || !selectedScenario || isGenerating || !canGenerateImages(numImages)}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Images ({calculateImageCost(imageQuality, numImages)} credits)
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {isGenerating ? t('ugc.generating') : 
                     !canGenerateImages(numImages) ? `Insufficient credits (${remainingCredits} remaining, need ${calculateImageCost(imageQuality, numImages)})` :
                     'Generation typically takes 30-60 seconds'}
                  </p>

                  {!canGenerateImages(numImages) && (
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
          )}
        </div>

        {/* Mobile Floating Action Panel */}
        {(isMobile && !settingsOpen) && (
          <div className="fixed left-0 right-0 bottom-[20px] sm:bottom-[80px] z-[60] px-4 pb-safe backdrop-blur supports-backdrop-blur:bg-background/60">
            <div className="max-w-lg mx-auto bg-card/95 border border-border/50 rounded-2xl shadow-lg p-3 space-y-3">
              {/* Top row: Summary pill and Edit button */}
              <div className="flex items-center gap-3">
                <div className="flex-1 px-3 py-2 bg-muted/40 rounded-full text-xs text-muted-foreground truncate">
                  {summary}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>

              {/* Bottom row: Generate button */}
              <Button 
                variant={!productImage || !selectedScenario || isGenerating || !canGenerateImages(numImages) ? "secondary" : "alternative"}
                size="lg" 
                className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                onClick={handleGenerate}
                disabled={!productImage || !selectedScenario || isGenerating || !canGenerateImages(numImages)}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar ({calculateImageCost(imageQuality, numImages)} créditos)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Settings Sheet */}
        {isMobile && (
          <SettingsSheet
            settings={{
              numImages,
              style,
              timeOfDay,
              highlight,
              imageOrientation,
              imageQuality
            }}
            onSettingsChange={(newSettings) => {
              if (newSettings.numImages !== undefined) setNumImages(newSettings.numImages);
              if (newSettings.style !== undefined) setStyle(newSettings.style);
              if (newSettings.timeOfDay !== undefined) setTimeOfDay(newSettings.timeOfDay);
              if (newSettings.highlight !== undefined) setHighlight(newSettings.highlight);
              if (newSettings.imageOrientation !== undefined) setImageOrientation(newSettings.imageOrientation);
              if (newSettings.imageQuality !== undefined) setImageQuality(newSettings.imageQuality);
            }}
            remainingCredits={remainingCredits}
            totalCredits={getTotalCredits()}
            calculateImageCost={calculateImageCost}
            canGenerate={!!productImage && !!selectedScenario && !isGenerating && canGenerateImages(numImages)}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            hideTrigger={true}
          />
        )}

        {/* Padding for mobile floating panel and navigation */}
        {isMobile && <div className="h-[160px]" />}

        {/* Results Section */}
        {(isGenerating || generatedImages.length > 0) && (
          <div id="generating-images" className="scroll-mt-6 space-y-8">
            <GeneratingImagePlaceholders
              numberOfImages={numImages}
              isGenerating={isGenerating}
              images={generatedImages.map(img => img.url)}
              onImageSelect={handleImageSelect}
            />

            {/* Action buttons when images are generated */}
            {!isGenerating && generatedImages.length > 0 && (
              <div className="flex justify-center">
                <div className="bg-card rounded-apple p-6 shadow-apple space-y-4 max-w-md w-full">
                  <h3 className="font-semibold text-lg text-center">Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateUGC;