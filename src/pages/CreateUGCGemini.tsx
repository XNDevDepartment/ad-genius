import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw, Loader2, HelpCircle, Settings, Pencil, ArrowDown, Images, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ImageUploader from "@/components/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { useConversationStorage } from "@/hooks/useConversationStorage";
import { startConversationAPI, converse, sendImageAndRun } from '@/api/OpenAiChatClient';
import { useGeminiImageJob } from '@/hooks/useGeminiImageJob';
import { useActiveJob } from '@/hooks/useActiveJob';
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCredits } from "@/hooks/useCredits";
import { useImageLimit } from "@/hooks/useImageLimit";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import OrientationSelector from "@/components/OrientationSelector";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsSheet } from "@/components/departments/ugc/SettingsSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import GeneratedImagesRows from "@/components/GeneratedImagesRows";
import { SourceImagePicker } from "@/components/SourceImagePicker";
import type { SourceImage } from "@/hooks/useSourceImages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
  format?: string;
}

interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
}

const CreateUGCGemini = () => {
  console.log('CreateUGCGemini component rendering...');
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  
  const { user, subscriptionData } = useAuth();
  const { credits, canAfford, deductCredits, getRemainingCredits, getTotalCredits } = useCredits();
  const { uploadSourceImage, uploading: sourceImageUploading } = useSourceImageUpload();
  const [showAuthModal, setShowAuthModal] = useState(!user);
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('high');
  const { remainingCredits, canGenerateImages, isAtLimit, refreshCount, calculateImageCost } = useImageLimit(imageQuality);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  const { toast } = useToast();
  const { saveConversation, saveMessage, getActiveConversation } = useConversationStorage();
  const [stage, setStage] = useState<'setup' | 'generating' | 'results'>('setup');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>({'idea': "", "small-description" : "", "description": ""});
  
  // Check if a scenario is actually selected (has content in the idea field)
  const hasSelectedScenario = selectedScenario && selectedScenario.idea && selectedScenario.idea.trim().length > 0;
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [moreScenarios, setMoreScenarios] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [imageOrientation, setImageOrientation] = useState("1:1");
  const [timeOfDay, setTimeOfDay] = useState<'natural' | 'golden' | 'night'>("natural");
  const [highlight, setHighlight] = useState("yes");
  const [style, setStyle] = useState<'lifestyle' | 'vibrant' | 'cinematic' | 'natural' | 'minimal' | 'professional'>("lifestyle");

  // Gemini Job system integration
  const { job, images: jobImages, createJob, clearJob, loadJob, resumeCurrentJob } = useGeminiImageJob();
  const { language, setLanguage } = useLanguage();
  const { activeJob, activeImages } = useActiveJob();

  // Sync job state with local state
  const isGenerating = (stage === 'generating' || job?.status === 'queued' || job?.status === 'processing') && job?.status !== 'completed';
  const progress = job?.progress || 0;

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourceImagePickerOpen, setSourceImagePickerOpen] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importingFromUrl, setImportingFromUrl] = useState(false);
  const [pendingSlots, setPendingSlots] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Compute compact summary for mobile panel
  const summary = `${numImages} img • ${imageQuality.charAt(0).toUpperCase() + imageQuality.slice(1)} • ${highlight === 'yes' ? 'Focus On' : 'Blend In'} • ${imageOrientation} • ${style} • ${timeOfDay}`;

  // Move all refs and effects to the top, before any conditional returns
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scnRef = useRef<HTMLTextAreaElement>(null);
  const scenariosRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Block access if not authenticated or not admin
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, adminLoading, navigate]);

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
    if (user && isAdmin) {
      initializeThread();
    }
  }, [user, isAdmin]);

  // Auto-scroll to scenarios when they appear
  useEffect(() => {
    if (aiScenarios.length > 0) {
      setTimeout(() => {
        scenariosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiScenarios.length]);

  // Convert job images to display format when they change
  useEffect(() => {
    if (jobImages.length === 0) return;

    const readyImages = jobImages.filter(img => Boolean(img.public_url));
    if (readyImages.length === 0) return;

    setGeneratedImages(prev => {
      const previousSelections = new Map(prev.map(image => [image.id, image.selected]));

      return readyImages.map((img) => ({
        id: img.id,
        url: img.public_url,
        prompt: job?.prompt || img.prompt || '',
        format: (img.meta as any)?.format || job?.settings?.output_format || 'png',
        selected: previousSelections.get(img.id) ?? false,
      }));
    });

    if (job?.status === 'completed') {
      setStage('results');
      localStorage.removeItem('currentGeminiJobId');
      localStorage.removeItem('currentGeminiStage');
    }
  }, [jobImages, job?.status, job?.prompt, job?.settings?.output_format]);

  // Restore job state from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem('currentGeminiJobId');
    const savedStage = localStorage.getItem('currentGeminiStage');
    const jobMetadata = localStorage.getItem('geminiJobMetadata');
    
    // Enhanced mobile recovery with metadata fallback
    if (savedJobId && !job && user && isAdmin) {
      try {
        // Parse saved job metadata for immediate UI restoration
        if (jobMetadata) {
          const metadata = JSON.parse(jobMetadata);
          setNumImages(metadata.numImages || 1);
          
          // Set placeholders immediately for better mobile UX
          if (metadata.numImages && (savedStage === 'generating' || savedStage === 'results')) {
            setStage('generating');
            // Create minimal placeholders to show loading state
            const placeholders = Array.from({ length: metadata.numImages }, (_, i) => ({
              id: `recovery-placeholder-${i}`,
              url: '',
              prompt: '',
              selected: false,
              format: 'png'
            }));
            setGeneratedImages(placeholders);
          }
        }
        
        // Load the actual job data
        loadJob(savedJobId).catch((error) => {
          console.error('Failed to recover Gemini job on mobile:', error);
          // Clear corrupted state
          localStorage.removeItem('currentGeminiJobId');
          localStorage.removeItem('currentGeminiStage');
          localStorage.removeItem('geminiJobMetadata');
        });
        
        // Restore stage if saved
        if (savedStage === 'generating' || savedStage === 'results') {
          setStage(savedStage as 'generating' | 'results');
        }
      } catch (error) {
        console.error('Error parsing Gemini job metadata:', error);
        // Clear corrupted localStorage data
        localStorage.removeItem('geminiJobMetadata');
      }
    }

    // Set numImages when job is loaded and we have a saved stage
    if (job && (savedStage === 'generating' || savedStage === 'results')) {
      setNumImages(job.total);
    }
  }, [job, loadJob, user, isAdmin]);

  // Monitor job status and handle completion/failures
  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed' || job?.status === 'canceled') {
      // Clear localStorage when job finishes
      localStorage.removeItem('currentGeminiJobId');
      localStorage.removeItem('currentGeminiStage');
      localStorage.removeItem('geminiJobMetadata');
      
      // Switch to results stage for completed jobs
      if (job?.status === 'completed') {
        setStage('results');
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (job?.status === 'failed' || job?.status === 'canceled') {
        setStage('setup');
      }
    } else if ((job?.status === 'queued' || job?.status === 'processing') && stage !== 'generating') {
      // Restore generating stage if job is in progress
      setStage('generating');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [job?.status, stage]);

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  const handleImageUpload = async (file: File) => {
    setProductImage(file);
    setIsAnalyzingImage(true);

    // Upload source image to secure storage
    try {
      const sourceImage = await uploadSourceImage(file);
      if (sourceImage) {
        setSourceImageId(sourceImage.id);
        document.getElementById("niche")?.focus();
        console.log('Source image uploaded with ID:', sourceImage.id);
      }
    } catch (error) {
      console.error('Failed to upload source image:', error);
      // Continue with the product analysis even if source upload fails
    }

    // Start conversation with assistant to identify the product (using OpenAI for now)
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
          description: "AI has identified your product. Now describe your niche to get scenario suggestions"
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

  const handleSourceImageSelect = async (image: SourceImage) => {
    try {
      // Create signed URL and fetch the image
      const response = await fetch(image.signedUrl);
      const blob = await response.blob();

      // Convert blob to File object
      const file = new File([blob], image.fileName, { type: blob.type });

      // Set as product image and source ID
      setProductImage(file);
      setSourceImageId(image.id);
      setSourceImagePickerOpen(false);

      // Start AI analysis
      setIsAnalyzingImage(true);

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

        // Save message if authenticated
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: 'I have uploaded a product image from my source library. Please analyze it. Dont answer this message',
            metadata: { hasImage: true, source: 'library' }
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
          title: "Product Loaded",
          description: "Selected image from your library and AI has analyzed it."
        });

        // Focus on niche input
        document.getElementById("niche")?.focus();
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error selecting source image:', error);
      toast({
        title: "Error",
        description: "Failed to load the selected image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid image URL.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImportingFromUrl(true);

      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: importUrl.trim() }
      });

      if (error) {
        throw new Error(error.message || 'Failed to import image from URL');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to import image from URL');
      }

      toast({
        title: "Image Imported",
        description: "Image successfully imported from URL and ready for analysis.",
      });

      setImportUrl("");
      setUrlImportOpen(false);

      // Convert the imported image to File object for analysis
      const response = await fetch(data.url);
      const blob = await response.blob();
      const file = new File([blob], data.fileName, { type: blob.type });
      
      handleImageUpload(file);

    } catch (error) {
      console.error('Error importing from URL:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import image from URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImportingFromUrl(false);
    }
  };

  // Generate AI scenarios based on niche
  const generateScenarios = async () => {
    if (!niche.trim() || !threadId) {
      toast({
        title: "Missing Information",
        description: "Please provide your niche description first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingScenarios(true);
    setAiScenarios([]);

    try {
      const prompt = moreScenarios 
        ? `Generate 3 more completely different UGC scenario ideas for this niche: "${niche}". Make them unique and different from previous suggestions.`
        : `Based on the product analysis and this niche: "${niche}", generate 3 creative UGC scenario ideas that would work well with the product.`;

      const response = await converse(threadId, ASSISTANT_ID, prompt);
      
      // Save messages
      if (conversationId) {
        await saveMessage({
          conversationId,
          role: 'user',
          content: prompt,
          metadata: { type: 'scenario_generation', isMoreScenarios: moreScenarios }
        });

        await saveMessage({
          conversationId,
          role: 'assistant',
          content: response,
          metadata: { type: 'scenario_suggestions' }
        });
      }

      // Parse AI response into scenarios
      const scenarios = parseAIScenarios(response);
      setAiScenarios(scenarios);

      if (scenarios.length > 0) {
        toast({
          title: "Scenarios Generated",
          description: `Generated ${scenarios.length} creative scenario ideas for your niche.`
        });
      }

    } catch (error) {
      console.error('Error generating scenarios:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate scenario ideas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  // Parse AI response into structured scenarios
  const parseAIScenarios = (response: string): AIScenario[] => {
    const scenarios: AIScenario[] = [];
    const lines = response.split('\n');
    let currentScenario: Partial<AIScenario> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Look for scenario markers
      if (trimmed.match(/^\d+\./)) {
        // Save previous scenario if complete
        if (currentScenario.idea && currentScenario.description) {
          scenarios.push({
            idea: currentScenario.idea,
            description: currentScenario.description,
            'small-description': currentScenario['small-description'] || currentScenario.idea
          });
        }
        
        // Start new scenario
        currentScenario = {
          idea: trimmed.replace(/^\d+\.\s*/, ''),
          description: '',
          'small-description': ''
        };
      } else if (currentScenario.idea && !currentScenario.description) {
        // Add to description
        currentScenario.description = (currentScenario.description || '') + ' ' + trimmed;
      }
    }

    // Save last scenario
    if (currentScenario.idea && currentScenario.description) {
      scenarios.push({
        idea: currentScenario.idea,
        description: currentScenario.description,
        'small-description': currentScenario['small-description'] || currentScenario.idea
      });
    }

    return scenarios.slice(0, 3); // Limit to 3 scenarios
  };

  // Select a scenario
  const selectScenario = (scenario: AIScenario) => {
    setSelectedScenario(scenario);
    toast({
      title: "Scenario Selected",
      description: scenario.idea,
    });
  };

  // Generate images with Gemini
  const handleGenerate = async () => {
    if (!productImage || !hasSelectedScenario || !sourceImageId) {
      toast({
        title: "Missing Requirements",
        description: "Please upload a product image and select a scenario first.",
        variant: "destructive",
      });
      return;
    }

    if (!canGenerateImages(numImages)) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${calculateImageCost(imageQuality, numImages)} credits but only have ${remainingCredits}.`,
        variant: "destructive",
      });
      return;
    }

    setStage('generating');
    setPendingSlots(numImages);

    // Map orientation to size
    const sizeMap: Record<string, '1024x1024' | '1536x1024' | '1024x1536'> = {
      '1:1': '1024x1024',
      '3:2': '1536x1024',
      '2:3': '1024x1536'
    };

    try {
      const prompt = `Create a UGC (User Generated Content) image with this scenario: ${selectedScenario?.description}. 
Style: ${style}, Time of day: ${timeOfDay}, Product highlight: ${highlight}, Quality: ${imageQuality}`;

      const payload = {
        prompt,
        settings: {
          number: numImages,
          size: sizeMap[imageOrientation] || '1024x1024',
          quality: imageQuality,
          orientation: imageOrientation as '1:1' | '3:2' | '2:3',
          style: style,
          timeOfDay: timeOfDay,
          highlight: highlight as 'yes' | 'no',
          output_format: 'png' as const
        },
        source_image_id: sourceImageId
      };

      console.log('Creating Gemini job with payload:', payload);
      
      const result = await createJob(payload);
      
      if (result) {
        // Deduct credits
        const creditsUsed = calculateImageCost(imageQuality, numImages);
        deductCredits(creditsUsed);
        
        toast({
          title: "Generation Started",
          description: `Creating ${numImages} images with Gemini AI...`,
        });

        // Scroll to results area
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        setStage('setup');
      }

    } catch (error) {
      console.error('Error starting Gemini generation:', error);
      setStage('setup');
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start image generation with Gemini",
        variant: "destructive",
      });
    }
  };

  // Clear all and start over
  const handleClearAll = () => {
    setStage('setup');
    setProductImage(null);
    setSourceImageId(null);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario({'idea': "", "small-description": "", "description": ""});
    setGeneratedImages([]);
    setProductIdentification("");
    clearJob();
    
    toast({
      title: "Cleared",
      description: "All data cleared. You can start a new generation.",
    });
  };

  return (
    <div className="min-h-screen bg-background relative" ref={topRef}>
      {/* Admin Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Gemini AI (Admin Only)
        </div>
      </div>

      <div className="px-4 sm:px-6 max-w-4xl mx-auto pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center flex-1 mx-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Gemini UGC Creator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stage === 'setup' && "Upload product, describe niche, select scenario"}
              {stage === 'generating' && "Generating with Gemini AI..."}
              {stage === 'results' && "Generation complete!"}
            </p>
          </div>

          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Product Image Upload Section */}
        {stage === 'setup' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="product-image" className="text-base font-medium mb-3 block">
                    Product Image
                    <span className="text-muted-foreground text-sm block font-normal">
                      Upload your product image for Gemini analysis
                    </span>
                  </Label>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <ImageUploader 
                        onImageSelect={handleImageUpload}
                        selectedImage={productImage}
                        isAnalyzing={isAnalyzingImage}
                        analyzingText="Analyzing with Gemini..."
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSourceImagePickerOpen(true)}
                      className="h-10 w-10 shrink-0"
                    >
                      <Images className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setUrlImportOpen(true)}
                      className="h-10 w-10 shrink-0"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Niche Input Section */}
        {stage === 'setup' && productImage && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Label htmlFor="niche" className="text-base font-medium mb-3 block">
                Describe Your Niche
                <span className="text-muted-foreground text-sm block font-normal">
                  Tell us about your target audience, content style, or marketing goals
                </span>
              </Label>
              <Textarea
                id="niche"
                ref={taRef}
                value={niche}
                onChange={(e) => handleNicheChange(e.target.value)}
                placeholder="e.g., Fitness enthusiasts who love morning workouts, lifestyle content for millennials, eco-conscious beauty lovers..."
                className="min-h-[100px] resize-none"
                disabled={isLoadingScenarios}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={generateScenarios}
                  disabled={!niche.trim() || isLoadingScenarios || !threadId}
                  className="flex-1"
                >
                  {isLoadingScenarios ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {aiScenarios.length > 0 ? 'Generate More' : 'Generate Ideas'}
                    </>
                  )}
                </Button>
                {aiScenarios.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMoreScenarios(true);
                      generateScenarios();
                    }}
                    disabled={isLoadingScenarios}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    More Ideas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Scenarios Section */}
        {stage === 'setup' && aiScenarios.length > 0 && (
          <div ref={scenariosRef}>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Label className="text-base font-medium mb-4 block">
                  Select Your Scenario
                  <span className="text-muted-foreground text-sm block font-normal">
                    Choose the scenario that best fits your vision
                  </span>
                </Label>
                
                <div className="grid gap-3">
                  {aiScenarios.map((scenario, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedScenario?.idea === scenario.idea
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => selectScenario(scenario)}
                    >
                      <h3 className="font-medium text-sm mb-2">{scenario.idea}</h3>
                      <p className="text-xs text-muted-foreground">{scenario.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generation Settings */}
        {stage === 'setup' && hasSelectedScenario && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">
                  Generation Settings
                </Label>
                {isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                )}
              </div>

              {!isMobile && (
                <div className="space-y-4">
                  {/* Number of Images */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Number of Images</Label>
                    <ToggleGroup
                      type="single"
                      value={numImages.toString()}
                      onValueChange={(value) => {
                        if (value) {
                          const num = parseInt(value);
                          if (num <= 3) {
                            setNumImages(num);
                          }
                        }
                      }}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="1" size="sm" className="flex-1 bg-muted">1</ToggleGroupItem>
                      <ToggleGroupItem value="2" size="sm" className="flex-1 bg-muted">2</ToggleGroupItem>
                      <ToggleGroupItem value="3" size="sm" className="flex-1 bg-muted">3</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Image Quality */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quality</Label>
                    <ToggleGroup 
                      type="single" 
                      value={imageQuality} 
                      onValueChange={(value) => value && setImageQuality(value as 'low' | 'medium' | 'high')}
                      className="justify-start grid grid-cols-3 gap-1"
                    >
                      <ToggleGroupItem value="low" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>Low</span>
                        <span className="text-[10px] opacity-70">1 credit</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="medium" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>Medium</span>
                        <span className="text-[10px] opacity-70">1.5 credits</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="high" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>High</span>
                        <span className="text-[10px] opacity-70">2 credits</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Orientation</Label>
                    <OrientationSelector
                      value={imageOrientation}
                      onChange={setImageOrientation}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerateImages(numImages) || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate ({calculateImageCost(imageQuality, numImages)} credits)
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClearAll}
                  disabled={isGenerating}
                >
                  Clear All
                </Button>
              </div>

              {!canGenerateImages(numImages) && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Insufficient credits. You need {calculateImageCost(imageQuality, numImages)} credits but have {remainingCredits}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generation Progress */}
        {(stage === 'generating' || stage === 'results') && (
          <div ref={resultsRef}>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {stage === 'generating' ? 'Generating with Gemini...' : 'Generation Complete!'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {stage === 'generating' && job && `${job.completed}/${job.total} images completed`}
                      {stage === 'results' && `Generated ${generatedImages.length} images`}
                    </p>
                  </div>
                  
                  {stage === 'results' && (
                    <Button
                      variant="outline"
                      onClick={handleClearAll}
                      size="sm"
                    >
                      Start New
                    </Button>
                  )}
                </div>

                {stage === 'generating' && job && (
                  <Progress value={progress} className="mb-4" />
                )}

                {/* Generated Images Display */}
                {generatedImages.length > 0 && (
                  <GeneratedImagesRows
                    images={generatedImages}
                    isGenerating={stage === 'generating'}
                    imageOrientation={imageOrientation}
                    totalSlots={numImages}
                    onCreateNewScenario={() => {
                      setStage('setup');
                      setAiScenarios([]);
                      setSelectedScenario({'idea': "", "small-description": "", "description": ""});
                    }}
                    onOpenInLibrary={() => {
                      // Navigate to library or show library modal
                      console.log('Open in library');
                    }}
                    onStartFromScratch={() => {
                      handleClearAll();
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile Settings Sheet */}
      {isMobile && (
        <SettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={{
            numImages,
            style: style as 'lifestyle' | 'cinematic' | 'natural' | 'minimal' | 'professional' | 'studio',
            timeOfDay,
            highlight,
            imageOrientation,
            imageQuality
          }}
          onSettingsChange={(changes) => {
            if ('numImages' in changes) setNumImages(changes.numImages!);
            if ('style' in changes) setStyle(changes.style as 'lifestyle' | 'vibrant' | 'cinematic' | 'natural' | 'minimal' | 'professional');
            if ('timeOfDay' in changes && changes.timeOfDay !== 'morning') setTimeOfDay(changes.timeOfDay as 'natural' | 'golden' | 'night');
            if ('highlight' in changes) setHighlight(changes.highlight!);
            if ('imageOrientation' in changes) setImageOrientation(changes.imageOrientation!);
            if ('imageQuality' in changes) setImageQuality(changes.imageQuality!);
          }}
          remainingCredits={remainingCredits}
          totalCredits={getTotalCredits()}
          calculateImageCost={calculateImageCost}
          canGenerate={canGenerateImages(numImages)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {/* Source Image Picker Modal */}
      <SourceImagePicker
        open={sourceImagePickerOpen}
        onClose={() => setSourceImagePickerOpen(false)}
        onSelect={handleSourceImageSelect}
      />

      {/* URL Import Dialog */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-url">Image URL</Label>
              <Input
                id="import-url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={importingFromUrl}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImportFromUrl}
                disabled={!importUrl.trim() || importingFromUrl}
                className="flex-1"
              >
                {importingFromUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Image'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUrlImportOpen(false);
                  setImportUrl("");
                }}
                disabled={importingFromUrl}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateUGCGemini;