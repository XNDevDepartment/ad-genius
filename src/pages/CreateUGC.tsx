import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw, Loader2, HelpCircle, Settings, Pencil, ArrowDown } from "lucide-react";
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
import { useImageJob } from '@/hooks/useImageJob';
import { useActiveJob } from '@/hooks/useActiveJob';
import { useAuth } from "@/contexts/AuthContext";
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
import { Link as LinkIcon, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import MultiImageUploader from "@/components/MultiImageUploader";

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

const CreateUGC = () => {
  console.log('CreateUGC component rendering...');
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { user, subscriptionData } = useAuth();
  const { credits, canAfford, deductCredits, getRemainingCredits, getTotalCredits } = useCredits();
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

  // function capitalize(s: string) {
  //   return s.charAt(0).toUpperCase() + s.slice(1);
  // }


  const { toast } = useToast();
  const { saveConversation, saveMessage, getActiveConversation } = useConversationStorage();
  const [stage, setStage] = useState<'setup' | 'generating' | 'results'>('setup');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [sourceImageIds, setSourceImageIds] = useState<string[]>([]);
  const [productAnalyses, setProductAnalyses] = useState<string[]>([]);
  const [isAnalyzingImages, setIsAnalyzingImages] = useState<boolean[]>([]);
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
  const [timeOfDay, setTimeOfDay] = useState<'natural' | 'golden' | 'night' | 'morning'>("natural");
  const [highlight, setHighlight] = useState("yes");
  const [style, setStyle] = useState<'lifestyle' | 'studio' | 'cinematic' | 'natural' | 'minimal' | 'professional'>("lifestyle");

  // Job system integration
  const { job, images: jobImages, createJob, clearJob, loadJob, resumeCurrentJob } = useImageJob();
  const { language, setLanguage } = useLanguage();
  const { activeJob, activeImages } = useActiveJob();

  // Sync job state with local state
  const isGenerating = (stage === 'generating' || job?.status === 'queued' || job?.status === 'processing') && job?.status !== 'completed';
  const progress = job?.progress || 0;


  // Tower behavior: separate current batch from previous images
  const [currentBatchImages, setCurrentBatchImages] = useState<GeneratedImage[]>([]);
  const [previousImages, setPreviousImages] = useState<GeneratedImage[]>([]);
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

  // Auto-scroll to scenarios when they appear
  useEffect(() => {
    if (aiScenarios.length > 0) {
      setTimeout(() => {
        scenariosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiScenarios.length]);

  // Replace current batch with job images when ready (Tower behavior)
  useEffect(() => {
    console.log('[CreateUGC] Job images changed:', { 
      jobImagesLength: jobImages.length, 
      jobStatus: job?.status,
      jobImagesWithUrls: jobImages.filter(img => Boolean(img.public_url)).length 
    });
    
    if (jobImages.length === 0) return;

    const readyImages = jobImages.filter(img => Boolean(img.public_url));
    console.log('[CreateUGC] Ready images:', readyImages.length, 'out of', jobImages.length);
    
    if (readyImages.length === 0) return;

    // For tower effect: completely replace current batch with new images
    setCurrentBatchImages(prev => {
      const previousSelections = new Map(prev.map(image => [image.id, image.selected]));

      const newImages = readyImages.map((img) => ({
        id: img.id,
        url: img.public_url,
        prompt: job?.prompt || img.prompt || "",
        format: (img.meta as any)?.format || job?.settings?.output_format || "png",
        selected: previousSelections.get(img.id) ?? false,
        orientation:
          (img.meta as any)?.orientation ||
          (img.meta as any)?.aspect_ratio ||
          job?.settings?.orientation || // saved when creating the job
          imageOrientation,              // final fallback to current UI
      }));

      console.log('[CreateUGC] Replacing current batch with', newImages.length, 'ready images');
      return newImages; // Complete replacement, not append
    });
  }, [jobImages, job?.prompt, job?.settings?.output_format]);

  // Handle job completion separately (Tower behavior)
  useEffect(() => {
    if (job?.status === 'completed') {
      console.log('[CreateUGC] Job completed, transitioning to results stage');
      
      // Move current batch to previous images when job completes (newest at top)
      setCurrentBatchImages(current => {
        if (current.length > 0) {
          console.log('[CreateUGC] Moving', current.length, 'images from current to previous');
          console.log('[CreateUGC] Current batch IDs:', current.map(img => img.id));
          
          setPreviousImages(prev => {
            console.log('[CreateUGC] Previous images count before merge:', prev.length);
            // Improved deduplication: only add images with valid URLs that aren't placeholders
            const existingIds = new Set(prev.map(img => img.id));
            const validNewImages = current.filter(img => 
              img.url && // Only real images, not placeholders
              !img.id.startsWith('recovery-placeholder-') && // Skip recovery placeholders
              !existingIds.has(img.id) // Skip duplicates
            );
            console.log('[CreateUGC] Adding', validNewImages.length, 'new images to previous');
            return [...validNewImages, ...prev];
          });
        }
        return []; // Clear current batch
      });
      
      setPendingSlots(0);
      setStage('results');
      localStorage.removeItem('currentJobId');
      localStorage.removeItem('currentStage');
    }
  }, [job?.status]);

  // Restore job state from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem('currentJobId');
    const savedStage = localStorage.getItem('currentStage');
    const jobMetadata = localStorage.getItem('jobMetadata');
    
    // Enhanced mobile recovery with metadata fallback
    if (savedJobId && !job) {
      try {
        console.log('[CreateUGC] Attempting to recover job:', savedJobId);
        
        // Load the actual job data first to check status
        loadJob(savedJobId).then(() => {
          // Parse saved job metadata for UI restoration
          if (jobMetadata) {
            const metadata = JSON.parse(jobMetadata);
            setNumImages(metadata.numImages || 1);
            
            // Use the job from hook state after loading
            setTimeout(() => {
              console.log('[CreateUGC] Job status on recovery:', job?.status);
              
              // Only create placeholders if job is actually still running
              if (metadata.numImages && job && (job.status === 'queued' || job.status === 'processing')) {
                console.log('[CreateUGC] Creating placeholders for active job');
                setStage('generating');
                // Create minimal placeholders to show loading state
                const placeholders = Array.from({ length: metadata.numImages }, (_, i) => ({
                  id: `recovery-placeholder-${i}`,
                  url: '',
                  prompt: '',
                  selected: false,
                  format: 'webp',
                  orientation: metadata.imageOrientation || imageOrientation,
                }));
                setCurrentBatchImages(placeholders);
              } else if (job && job.status === 'completed') {
                console.log('[CreateUGC] Job already completed, setting to results stage');
                setStage('results');
              }
            }, 100); // Small delay to ensure job state is updated
          }
        }).catch((error) => {
          console.error('Failed to recover job on mobile:', error);
          // Fallback to active job if recovery fails
          if (activeJob) {
            loadJob(activeJob.id).catch(console.error);
          } else {
            // Clear corrupted state
            localStorage.removeItem('currentJobId');
            localStorage.removeItem('currentStage');
            localStorage.removeItem('jobMetadata');
          }
        });
        
        // Restore stage if saved
        if (savedStage === 'generating' || savedStage === 'results') {
          setStage(savedStage as 'generating' | 'results');
        }
      } catch (error) {
        console.error('Error parsing job metadata:', error);
        // Clear corrupted localStorage data
        localStorage.removeItem('jobMetadata');
      }
    } else if (!savedJobId && activeJob && !job) {
      // Load active job from server if no local job
      loadJob(activeJob.id).catch(console.error);
      setStage('generating');
      setNumImages(activeJob.total);
    }

    // Set numImages when job is loaded and we have a saved stage
    if (job && (savedStage === 'generating' || savedStage === 'results')) {
      setNumImages(job.total);
    }
  }, [job, activeJob, loadJob]);

  // Monitor job status and handle completion/failures
  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed' || job?.status === 'canceled') {
      // Clear localStorage when job finishes
      localStorage.removeItem('currentJobId');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('jobMetadata');

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

  const handleImagesUpload = async (files: File[]) => {
    setProductImages(files);
    setIsAnalyzingImages(new Array(files.length).fill(true));

    const uploadedSourceIds: string[] = [];
    const analyses: string[] = [];

    // Process each image
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Upload source image to secure storage
        const sourceImage = await uploadSourceImage(file);
        if (sourceImage) {
          uploadedSourceIds.push(sourceImage.id);
          console.log(`Source image ${i + 1} uploaded with ID:`, sourceImage.id);
        }

        // Analyze image with OpenAI
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = async () => {
            try {
              const base64 = reader.result as string;

              const reply = await sendImageAndRun(
                threadId!,
                ASSISTANT_ID,
                base64,
                file.name,
                `I have uploaded product image ${i + 1} of ${files.length}. Please analyze this image. Don't answer this message.`
              );

              analyses.push(reply);

              // Save user message and assistant response
              if (conversationId) {
                await saveMessage({
                  conversationId,
                  role: 'user',
                  content: `I have uploaded product image ${i + 1} of ${files.length}. Please analyze this image.`,
                  metadata: { hasImage: true, imageIndex: i }
                });

                await saveMessage({
                  conversationId,
                  role: 'assistant',
                  content: reply,
                  metadata: { analysisType: 'product_identification', imageIndex: i }
                });
              }
            } catch (error) {
              console.error(`Error analyzing image ${i + 1}:`, error);
              analyses.push('');
            }

            resolve();
          };
          reader.readAsDataURL(file);
        });

        // Update progress
        setIsAnalyzingImages(prev => {
          const newState = [...prev];
          newState[i] = false;
          return newState;
        });

      } catch (error) {
        console.error(`Failed to upload source image ${i + 1}:`, error);
        setIsAnalyzingImages(prev => {
          const newState = [...prev];
          newState[i] = false;
          return newState;
        });
      }
    }

    setSourceImageIds(uploadedSourceIds);
    setProductAnalyses(analyses);
    
    // Combine all analyses for product identification
    const combinedAnalysis = analyses.filter(a => a).join('\n\n');
    setProductIdentification(combinedAnalysis);

    toast({
      title: "Product Analysis Complete",
      description: `Analyzed ${files.length} images. Now describe your niche to get scenario suggestions.`
    });

    document.getElementById("niche")?.focus();
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
      setProductImages([file]);
      setSourceImageIds([image.id]);

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
        setProductAnalyses([reply]);

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
    if (!importUrl.trim()) return;

    setImportingFromUrl(true);
    try {
      const response = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: importUrl.trim() }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const sourceImage = response.data;

      // Create a File object from the uploaded image
      const imageResponse = await fetch(sourceImage.publicUrl);
      const blob = await imageResponse.blob();
      const file = new File([blob], sourceImage.fileName, { type: blob.type });

      // Replace current images with this single image
      setProductImages([file]);
      setSourceImageIds([sourceImage.id]);
      setUrlImportOpen(false);
      setImportUrl("");

      toast({
        title: "Image Imported",
        description: "Successfully imported image from URL"
      });

      // Auto-analyze the imported image
      handleImagesUpload([file]);

    } catch (error) {
      console.error('Error importing from URL:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import image from URL. Please check the URL and try again.",
        variant: "destructive"
      });
    } finally {
      setImportingFromUrl(false);
    }
  };


  const getScenariosFromConversation = async (nicheText?: string, moreScen?: boolean) => {
    const targetNiche = nicheText || niche;
    setIsLoadingScenarios(true);
    try {
      const responseText = await converse(
        threadId!,
        `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide ${moreScen ? 'new and different' : ''} 6 creative UGC scenario ideas. Return ONLY a compact JSON object with "scenarios" array and in this language: ` + language,
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


  const generateMoreScenarios = async () => {
    setAiScenarios([]); // Clear existing scenarios
    setMoreScenarios(true)
    await getScenariosFromConversation("",true);
  };


  const handleGenerate = async () => {
    //check if the necessary data is available
    if (!productImages || !hasSelectedScenario) {
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
      setStage('setup');
      return;
    }

    try {
      console.log('[CreateUGC] Starting new generation, clearing previous job state');

      // Clear any existing job state first
      clearJob();

      // Freeze the current results into the tower (newest on top)
      setPreviousImages(prev => {
        if (currentBatchImages.length === 0) return prev;
        const finished = currentBatchImages.filter(img => Boolean(img.url));
        return finished.length ? [...finished, ...prev] : prev;
      });

      // Clear current batch - the job completion handler will move completed images to previous
      setCurrentBatchImages([]);

      // Provide immediate feedback
      setStage('generating');

      // Set pending slots for new generation (animated placeholders)
      setPendingSlots(numImages);

      // Save state to localStorage for persistence
      localStorage.setItem('currentStage', 'generating');

      // Immediate scroll to generation area
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);

      /* ------------------------------------------------------------------
        1️⃣  Prepare payloads once (Data‑URL + prompt)
      ------------------------------------------------------------------*/

      const highlightYes = `Ultra-detailed, authentic UGC-style ${style} photograph showcasing product in genuine scenario: ${selectedScenario.description}. Shot with full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200 at ${timeOfDay} with authentic light direction and quality.`;


      const highlightNo = `Photorealistic ${style} scene: ${selectedScenario.description}. Product naturally placed (20% of frame, off-center). Environment-first composition with sharp background detail. ${timeOfDay} lighting with authentic shadows and reflections. Natural imperfections, realistic textures, believable environmental interaction. Avoid: centered product, studio lighting, artificial blur, stock photo aesthetics. Use full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200.`

      const prompt = (highlight === 'yes' ? highlightYes : highlightNo).trim();


      // Create job with new system
      const jobId = await createJob({
        prompt,
        settings: {
          number: numImages,
          size: orientationToSize(imageOrientation),
          quality: imageQuality,
          orientation: imageOrientation as '1:1' | '3:2' | '2:3',
          style: style as 'lifestyle' | 'minimal' | 'vibrant' | 'professional' | 'cinematic' | 'natural',
          timeOfDay: timeOfDay as 'natural' | 'golden' | 'night',
          highlight: highlight as 'yes' | 'no',
          output_format: 'webp'
        },
        source_image_id: sourceImageIds[0] || undefined
      });

      // Save job ID, stage and metadata for mobile recovery
      localStorage.setItem('currentJobId', jobId);
      localStorage.setItem('currentStage', 'generating');

      // Enhanced mobile persistence with job metadata
      const jobMetadata = {
        id: jobId,
        numImages: numImages,
        settings: {
          number: numImages,
          quality: imageQuality,
          orientation: imageOrientation,
          style: style,
          timeOfDay: timeOfDay,
          highlight: highlight,
          output_format: 'webp'
        },
        prompt: prompt,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('jobMetadata', JSON.stringify(jobMetadata));

    } catch (error) {
      console.error('Generation error:', error);

      let errorMessage = "Failed to generate images. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('authentication') || error.message.includes('session')) {
          errorMessage = "Session expired. Please refresh the page and try again.";
        } else if (error.message.includes('credit') || error.message.includes('limit')) {
          errorMessage = "Insufficient credits or rate limit reached. Please check your account.";
        }
      }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Refresh credits after error
      refreshCount();
    }
  };

  // Helper function to convert orientation to OpenAI size format
  const orientationToSize = (orientation: string): '1024x1024' | '1536x1024' | '1024x1536' => {
    switch (orientation) {
      case '3:2': return '1536x1024';
      case '2:3': return '1024x1536';
      default: return '1024x1024';
    }
  };

  const handleImageSelect = (imageId: string) => {
    // Check current batch first
    setCurrentBatchImages(prev => {
      const found = prev.find(img => img.id === imageId);
      if (found) {
        return prev.map(img => 
          img.id === imageId ? { ...img, selected: !img.selected } : img
        );
      }
      return prev;
    });
    
    // Then check previous images
    setPreviousImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const toggleImageSelection = (imageId: string) => {
    handleImageSelect(imageId);
  };

  // Combine both arrays for selection calculations
  const allImages = [...currentBatchImages, ...previousImages];
  const selectedImages = allImages.filter(img => img.selected);

  const handleDownloadAll = () => {
    const imagesToDownload = selectedImages.length > 0 ? selectedImages : allImages;

    imagesToDownload.forEach((img, index) => {
      if (!img.url) return;
      const link = document.createElement('a');
      link.href = img.url;
      const extension = img.format || 'png';
      link.download = `ugc-image-${index + 1}.${extension}`;
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
    // Clear current batch and set pending slots for new generation
    setCurrentBatchImages([]);
    setPendingSlots(numImages);
  };

  const handleNewCreation = () => {
    setCurrentBatchImages([]);
    setPreviousImages([]);
    setPendingSlots(0);
    setProductImages([]);
    setSourceImageIds([]);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario(null);
  };

  const handleStartFromScratch = () => {
    // Clear job state
    clearJob();
    
    // Reset all UI states
    setCurrentBatchImages([]);
    setPreviousImages([]);
    setPendingSlots(0);
    setProductImages([]);
    setSourceImageIds([]);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario({'idea': "", "small-description" : "", "description": ""});
    setStage('setup');
    setPendingSlots(0);
    
    // Clear localStorage with mobile-specific cleanup
    localStorage.removeItem('currentJobId');
    localStorage.removeItem('currentStage');
    localStorage.removeItem('jobMetadata');
    
    // Scroll to top
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    toast({
      title: "Starting fresh",
      description: "All data cleared. Ready for a new generation.",
    });
  };

  // Scroll detection for floating button
  useEffect(() => {
    const handleScroll = () => {
      const hasContent = allImages.length > 0 || jobImages.length > 0 || isGenerating || stage === 'results';
      const isScrolledUp = window.scrollY < window.innerHeight * 0.5;
      setShowScrollDown(hasContent && isScrolledUp);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allImages.length, jobImages.length, isGenerating, stage]);

  const handleScrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };




  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={400}>
      <div ref={topRef} className="min-h-screen bg-background relative">
      {/* Loading Overlay */}
      {!threadId && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[30] flex items-center justify-center">
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
                      {/* <ImageUploader 
                        onImageSelect={handleImageUpload}
                        selectedImage={productImage}
                        isAnalyzing={isAnalyzingImage}
                        analyzingText={t('ugc.productImage.analyzing')}
                      /> */}
                      <MultiImageUploader
                        onImagesSelect={handleImagesUpload}
                        selectedImages={productImages}
                        isAnalyzing={isAnalyzingImages}
                        analyzingText="Analyzing product..."
                        maxImages={5}
                      />

                      {/* Additional Image Options */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSourceImagePickerOpen(true)}
                          className="flex-1 flex-wrap p-2 overflow-hidden"
                          disabled={!threadId}
                        >
                          <Images className="h-4 w-4 mr-2" />
                          Choose from Library
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setUrlImportOpen(true)}
                          className="flex-1 flex-wrap p-2 overflow-hidden"
                          disabled={!threadId}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Import from URL
                        </Button>
                      </div>
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
                        style={{ lineHeight: '1.25rem, font-size: 16px' }}
                        disabled={!threadId}
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
                      disabled={isLoadingScenarios || !productImages[0] || !niche.trim() || !threadId || isAnalyzingImage}
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
              <Card ref={scenariosRef} className={`${!threadId ? 'opacity-50 pointer-events-none' : ' rounded-apple shadow-lg'} scroll-mt-6`}>
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
            {!isLoadingScenarios && aiScenarios.length > 0 && (
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

                    <Textarea
                      ref={scnRef}
                      id="scenario description"
                      placeholder={'Here will fall the scenario description'}
                      value={selectedScenario?.description || ''}
                      onChange={(e) => setSelectedScenario((val) => { return {...val, 'description': e.target.value }})}
                      className="rounded-apple-sm min-h-0 overflow-hidden resize-none w-full text-base md:text-sm"
                      style={{ lineHeight: '1.25rem, font-size: 16px' }}
                      disabled={!threadId}
                      rows={3}
                    />
                      <div className="flex justify-end text-sm text-muted-foreground">
                      {niche.length > 0 && niche.length}
                      </div>
                    </div>

                )}
                  </div>
                </CardContent>
              </Card>

              {/* Results Section */}
              {(isGenerating || allImages.length > 0 || jobImages.length > 0 || stage === 'results') && (
                // <div className={`bg-card rounded-apple mt-10 mb-10 shadow-apple space-y-6 lg:sticky lg:top-8 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div ref={resultsRef} id="generating-images" className="scroll-mt-6 space-y-8 mt-5">

                    {/* Enhanced progress indicator with better error messaging */}
                    {/* {isGenerating && job && (
                      <div className="bg-card rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Generating {job.total || pendingSlots} image{(job.total || pendingSlots) !== 1 ? 's' : ''}...
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {job.completed || 0}/{job.total || pendingSlots}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, ((job.completed || 0) / (job.total || pendingSlots || 1)) * 100)}%` 
                            }}
                          />
                        </div>
                        {job.status === 'processing' && (
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>Processing images... This may take 1-2 minutes per image.</p>
                            {job.completed > 0 && (
                              <p className="text-green-600">
                                ✓ {job.completed} completed {job.failed > 0 && `• ${job.failed} failed`}
                              </p>
                            )}
                          </div>
                        )}
                        {job.status === 'queued' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Queued... Starting generation shortly.
                          </p>
                        )}
                      </div>
                    )} */}

                    <GeneratedImagesRows
                      // images={allImages}                 // Combined array with current batch + previous
                      currentBatchImages={currentBatchImages}
                      previousImages={previousImages}
                      totalSlots={job?.total ?? pendingSlots}
                      isGenerating={isGenerating}
                      onCreateNewScenario={(imageId) => {
                        setSelectedScenario({"idea":"", "small-description": "", "description": ""});
                        generateMoreScenarios();
                      }}
                      onOpenInLibrary={() => navigate('/library')}
                      onStartFromScratch={handleStartFromScratch}
                      jobId={job?.id}
                      imageOrientation={imageOrientation}
                      aiScenarios={aiScenarios}
                    />

                  {/* Resume button for stuck jobs */}
                  {isGenerating && job?.status === 'queued' && job?.progress === 0 && (
                    <div className="flex justify-center">
                      <div className="bg-card rounded-apple p-6 shadow-apple space-y-4 max-w-md w-full">
                        <div className="text-center">
                          <h3 className="font-semibold text-lg mb-2">Job seems stuck?</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            If your job has been queued for more than a minute, you can try resuming it manually.
                          </p>
                          <Button onClick={resumeCurrentJob} variant="outline" className="w-full">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resume Processing
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <div className="space-y-2 mb-6">
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
                    <ToggleGroup
                      type="single"
                      value={numImages.toString()}
                      onValueChange={(e) => setNumImages(parseInt(e))}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="1" size="sm" className="flex-1 bg-muted">1</ToggleGroupItem>
                      <ToggleGroupItem value="2" size="sm" className="flex-1 bg-muted">2</ToggleGroupItem>
                      <ToggleGroupItem value="3" size="sm" className="flex-1 bg-muted">3</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Highlight */}
                  <div className="space-y-2 mb-6">
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
                    <ToggleGroup 
                      type="single" 
                      value={highlight}
                      onValueChange={(e) => setHighlight(e)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="yes" size="sm" className="flex-1 text-xs bg-muted">{t('ugc.advancedSettings.highlight.yes')}</ToggleGroupItem>
                      <ToggleGroupItem value="no" size="sm" className="flex-1 text-xs bg-muted">{t('ugc.advancedSettings.highlight.no')}</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Time of Day */}
                  <div className="space-y-2 mb-6">
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
                    <ToggleGroup 
                      type="single" 
                      value={timeOfDay}
                      onValueChange={(e) => setTimeOfDay(e as typeof timeOfDay)}
                      className="justify-start grid grid-cols-4 gap-1"
                    >
                        <ToggleGroupItem key={"natural"} size="sm" className="text-xs px-2 py-1 bg-muted" value="natural">{t('ugc.advancedSettings.timeOfDay.natural')}</ToggleGroupItem>
                        <ToggleGroupItem key={"night"} size="sm" className="text-xs px-2 py-1 bg-muted" value="night">{t('ugc.advancedSettings.timeOfDay.night')}</ToggleGroupItem>
                        <ToggleGroupItem key={"golden"} size="sm" className="text-xs px-2 py-1 bg-muted" value="golden">{t('ugc.advancedSettings.timeOfDay.golden')}</ToggleGroupItem>
                        <ToggleGroupItem key={"morning"} size="sm" className="text-xs px-2 py-1 bg-muted" value="morning">{t('ugc.advancedSettings.timeOfDay.soft')}</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Style */}
                  <div className="space-y-2 mb-6">
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
                    <ToggleGroup 
                      type="single" 
                      value={style}
                      onValueChange={(e) => setStyle(e as typeof style)}
                      className="justify-start grid grid-cols-3 gap-1"
                    >
                        <ToggleGroupItem key={"lifestyle"} size="sm" className="text-xs px-2 py-1 bg-muted" value="lifestyle">{t('ugc.advancedSettings.style.lifestyle')}</ToggleGroupItem>
                        <ToggleGroupItem key={"minimal"} size="sm" className="text-xs px-2 py-1 bg-muted" value="minimal">{t('ugc.advancedSettings.style.minimalist')}</ToggleGroupItem>
                        <ToggleGroupItem key={"vibrant"} size="sm" className="text-xs px-2 py-1 bg-muted" value="vibrant">Vibrant</ToggleGroupItem>
                        <ToggleGroupItem key={"professional"} size="sm" className="text-xs px-2 py-1 bg-muted" value="professional">{t('ugc.advancedSettings.style.professional')}</ToggleGroupItem>
                        <ToggleGroupItem key={"cinematic"} size="sm" className="text-xs px-2 py-1 bg-muted" value="cinematic">Cinematic</ToggleGroupItem>
                        <ToggleGroupItem key={"natural"} size="sm" className="text-xs px-2 py-1 bg-muted" value="natural">Natural</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-2 mb-6">
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
                    <ToggleGroup 
                      type="single" 
                      value={imageQuality}
                      onValueChange={(e) => setImageQuality(e as 'low' | 'medium' | 'high')}
                      className="justify-start grid grid-cols-3 gap-1"
                    >
                      <ToggleGroupItem value="low" size="sm" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>Baixa</span>
                        <span className="text-[10px] opacity-70">1 crédito</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="medium" size="sm" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>Média</span>
                        <span className="text-[10px] opacity-70">1.5 créditos</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="high" size="sm" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
                        <span>Alta</span>
                        <span className="text-[10px] opacity-70">2 créditos</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button 
                    variant={!productImages[0] || !hasSelectedScenario || isGenerating || !canGenerateImages(numImages) ? "secondary" : "alternative"}
                    size="lg" 
                    className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                    onClick={handleGenerate}
                    disabled={!productImages[0] || !hasSelectedScenario || isGenerating || !canGenerateImages(numImages)}
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
          <div className="fixed left-0 right-0 bottom-[10px] sm:bottom-[50px] z-[20] px-4 pb-safe backdrop-blur supports-backdrop-blur:bg-background/60">
            <div className="max-w-lg mx-auto bg-card/95 border border-border/50 rounded-2xl shadow-lg p-3 space-y-3">
              {/* Top row: Summary pill and Edit button */}
              <div className="flex items-center gap-3">
                <div className="flex-1 px-3 py-2 bg-muted/40 rounded-full text-xs text-muted-foreground truncate" onClick={() => setSettingsOpen(true)}>
                  {/* {summary} */}
                  <Button className="w-full" variant="ghost">
                  Open image settings
                  <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Bottom row: Generate button */}
              <Button 
                    variant={!productImages[0] || !hasSelectedScenario || isGenerating || !canGenerateImages(numImages) ? "secondary" : "alternative"}
                    size="lg" 
                    className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                    onClick={handleGenerate}
                    disabled={!productImages[0] || !hasSelectedScenario || isGenerating || !canGenerateImages(numImages)}
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
            canGenerate={!!productImages[0] && hasSelectedScenario && !isGenerating && canGenerateImages(numImages)}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            hideTrigger={true}
          />
        )}

        {/* Floating Scroll Down Button */}
        {showScrollDown && !isMobile && (
          <div className="fixed bottom-8 right-8 z-[15]">
            <Button
              size="icon"
              className="rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300 animate-bounce"
              onClick={handleScrollToResults}
              title="Scroll to results"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Mobile Floating Scroll Down Button */}
        {showScrollDown && isMobile && (
          <div className="fixed bottom-[155px] right-4 z-[15]">
            <Button
              size="sm"
              className="rounded-full shadow-lg bg-primary-glow hover:bg-primary/90 transition-all duration-300 animate-bounce px-3"
              onClick={handleScrollToResults}
              title="Scroll to results"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Padding for mobile floating panel and navigation */}
        {isMobile && <div className="h-[50px]" />}
      </div>

      {/* Source Image Picker Modal */}
      <SourceImagePicker
        open={sourceImagePickerOpen}
        onClose={() => setSourceImagePickerOpen(false)}
        onSelect={handleSourceImageSelect}
      />

      {/* URL Import Modal */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                disabled={importingFromUrl}
              />
              <p className="text-xs text-muted-foreground">
                Enter a direct link to an image (JPG, PNG, WEBP, GIF)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUrlImportOpen(false)} disabled={importingFromUrl}>
                Cancel
              </Button>
              <Button onClick={handleImportFromUrl} disabled={!importUrl.trim() || importingFromUrl}>
                {importingFromUrl ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Image'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default CreateUGC;