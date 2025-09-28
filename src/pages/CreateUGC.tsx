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
import MultiImageUploader from "@/components/MultiImageUploader";
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

      // Replace current images with this single image
      setProductImages([file]);
      setSourceImageIds([image.id]);

      // Start AI analysis
      setIsAnalyzingImages([true]);

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const reply = await sendImageAndRun(
          threadId!,
          ASSISTANT_ID,
          base64,
          file.name,
          'I have selected a product image from my library. Please analyze it. Dont answer this message.'
        );

        setProductIdentification(reply);
        setProductAnalyses([reply]);

        // Save user message and assistant response
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: 'I have selected a product image from my library. Please analyze it. Dont answer this message',
            metadata: { hasImage: true, sourceImageId: image.id }
          });

          await saveMessage({
            conversationId,
            role: 'assistant',
            content: reply,
            metadata: { analysisType: 'product_identification' }
          });
        }

        setIsAnalyzingImages([false]);
        toast({
          title: "Product Selected",
          description: "AI has identified your selected product. Now describe your niche to get scenario suggestions"
        });
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error selecting source image:', error);
      setIsAnalyzingImages([false]);
      toast({
        title: "Selection Error",
        description: "Failed to select the product image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUrlImport = async () => {
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

  const getScenariosFromConversation = async () => {
    if (!niche.trim()) return;
    
    setIsLoadingScenarios(true);
    try {
      const reply = await converse(
        threadId!,
        `Create 5 UGC marketing scenarios for this product based on the niche: "${niche}". Return only a JSON array with objects containing "idea", "description", and "small-description" fields. No explanations, just the JSON.`,
        ASSISTANT_ID
      );

      // Extract JSON from the response
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const scenarios = JSON.parse(jsonMatch[0]);
          setAiScenarios(scenarios);
          
          // Save the conversation
          if (conversationId) {
            await saveMessage({
              conversationId,
              role: 'user',
              content: `Create 5 UGC marketing scenarios for this product based on the niche: "${niche}".`,
              metadata: { requestType: 'scenario_generation' }
            });

            await saveMessage({
              conversationId,
              role: 'assistant',
              content: reply,
              metadata: { 
                responseType: 'scenario_generation',
                scenarioCount: scenarios.length 
              }
            });
          }
        } catch (parseError) {
          console.error('Failed to parse scenarios JSON:', parseError);
          toast({
            title: "Parsing Error",
            description: "Received response but couldn't parse scenarios. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        console.error('No JSON found in response:', reply);
        toast({
          title: "Format Error",
          description: "AI response was not in expected format. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error getting scenarios:', error);
      toast({
        title: "Scenarios Error",
        description: "Failed to generate scenarios. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const generateMoreScenarios = async () => {
    if (!niche.trim()) return;
    
    setIsLoadingScenarios(true);
    try {
      const reply = await converse(
        threadId!,
        `Create 5 different UGC marketing scenarios for this product and niche: "${niche}". Make them creative and different from previous ones. Return only a JSON array with "idea", "description", and "small-description" fields. No explanations, just the JSON.`,
        ASSISTANT_ID
      );

      // Extract JSON from the response
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const newScenarios = JSON.parse(jsonMatch[0]);
          setAiScenarios(newScenarios);
          setMoreScenarios(true);
          
          // Save the conversation
          if (conversationId) {
            await saveMessage({
              conversationId,
              role: 'user',
              content: `Create 5 different UGC marketing scenarios for this product and niche: "${niche}". Make them creative and different from previous ones.`,
              metadata: { requestType: 'scenario_regeneration' }
            });

            await saveMessage({
              conversationId,
              role: 'assistant',
              content: reply,
              metadata: { 
                responseType: 'scenario_regeneration',
                scenarioCount: newScenarios.length 
              }
            });
          }
        } catch (parseError) {
          console.error('Failed to parse scenarios JSON:', parseError);
          toast({
            title: "Parsing Error",
            description: "Received response but couldn't parse scenarios. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        console.error('No JSON found in response:', reply);
        toast({
          title: "Format Error",
          description: "AI response was not in expected format. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating more scenarios:', error);
      toast({
        title: "Scenarios Error",
        description: "Failed to generate more scenarios. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleGenerate = async () => {
    const isReadyToGenerate = productImages.length > 0 && niche.trim() && hasSelectedScenario;

    if (!isReadyToGenerate) {
      toast({
        title: 'Missing information',
        description: 'Please upload product images, describe your niche, and select a scenario.',
        variant: 'destructive',
      });
      return;
    }

    // Pre-flight check for credit availability (admins bypass this)
    const isAdmin = subscriptionData?.subscription_tier === 'admin';
    if (!isAdmin && !canAfford(calculateImageCost(imageQuality, numImages))) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${calculateImageCost(imageQuality, numImages)} credits but only have ${remainingCredits}. Please upgrade your plan.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setStage('generating');
      
      // Create placeholder slots for immediate UI feedback
      const placeholders = Array.from({ length: numImages }, (_, i) => ({
        id: `placeholder-${Date.now()}-${i}`,
        url: '',
        prompt: '',
        selected: false,
        format: 'webp',
        orientation: imageOrientation,
      }));
      
      setCurrentBatchImages(placeholders);
      setPendingSlots(numImages);

      // Save job metadata for recovery
      const jobMetadata = {
        numImages,
        imageOrientation,
        imageQuality,
      };
      localStorage.setItem('jobMetadata', JSON.stringify(jobMetadata));
      localStorage.setItem('currentStage', 'generating');

      // Create the job
      const result = await createJob({
        prompt: `${selectedScenario!.description}. Product context: ${productIdentification}. Niche: ${niche}`,
        settings: {
          number: numImages,
          size: imageOrientation === '3:2' ? '1536x1024' :
               imageOrientation === '2:3' ? '1024x1536' :
               '1024x1024',
          quality: imageQuality,
          orientation: imageOrientation as '1:1' | '3:2' | '2:3',
          style: style as 'lifestyle' | 'cinematic' | 'natural' | 'minimal' | 'professional',
          timeOfDay: timeOfDay as 'natural' | 'golden' | 'night',
          highlight: highlight as 'yes' | 'no',
          output_format: 'webp'
        },
        sourceImageId: sourceImageIds[0], // Use first image for now
      });

      if (result) {
        localStorage.setItem('currentJobId', result);
        console.log('Job created with ID:', result);
        
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (error) {
      console.error('Error generating images:', error);
      setStage('setup');
      setPendingSlots(0);
      setCurrentBatchImages([]);
      
      // Clear saved state on error
      localStorage.removeItem('currentJobId');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('jobMetadata');
      
      toast({
        title: "Generation Error",
        description: "Failed to start image generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle scroll down indicator
  useEffect(() => {
    const handleScroll = () => {
      if (resultsRef.current && stage === 'results') {
        const rect = resultsRef.current.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight && rect.bottom >= 0;
        setShowScrollDown(!isVisible && window.scrollY < rect.top);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initially
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [stage]);

  // Don't render if no user
  if (!user) {
    return null;
  }

  return (
    <div ref={topRef} className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                {t('ugc.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-4xl">
        {stage === 'setup' && (
          <div className="space-y-6">
            {/* Product Image Upload Card */}
            <Card className={`${!threadId ? 'opacity-50 pointer-events-none' : 'rounded-apple shadow-lg'} scroll-mt-6`}>
              <CardContent className="p-6 lg:p-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold">{t('ugc.productImage.title')}</h2>
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
                  
                  <MultiImageUploader
                    onImagesSelect={handleImagesUpload}
                    selectedImages={productImages}
                    isAnalyzing={isAnalyzingImages}
                    analyzingText="Analyzing product..."
                    maxImages={5}
                  />

                  {/* Additional Image Options */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSourceImagePickerOpen(true)}
                      className="flex-1"
                    >
                      <Images className="h-4 w-4 mr-2" />
                      {t('ugc.productImage.selectFromLibrary')}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUrlImportOpen(true)}
                      className="flex-1"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {t('ugc.productImage.importFromUrl')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Niche Description Card */}
            <Card className={`${!threadId || productImages.length === 0 ? 'opacity-50 pointer-events-none' : 'rounded-apple shadow-lg'} scroll-mt-6`}>
              <CardContent className="p-6 lg:p-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold">{t('ugc.niche.title')}</h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{t('ugc.niche.tooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t('ugc.niche.subtitle')}</p>
                  
                  <div className="space-y-2">
                    <Textarea
                      id="niche"
                      ref={taRef}
                      value={niche}
                      onChange={(e) => handleNicheChange(e.target.value)}
                      placeholder={t('ugc.niche.placeholder')}
                      className="min-h-[80px] resize-none overflow-hidden"
                      maxLength={250}
                      style={{ height: 'auto' }}
                    />
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {t('ugc.niche.hint')}
                      </div>
                      <div className="flex justify-end text-sm text-muted-foreground">
                        {niche.length} / 250
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="default"
                    onClick={() => getScenariosFromConversation()}
                    disabled={isLoadingScenarios || productImages.length === 0 || !niche.trim() || !threadId || isAnalyzingImages.some(Boolean)}
                    className="w-full mt-4"
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
                    </div>
                  )}

                  {isLoadingScenarios && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {t('ugc.scenarios.loading')}
                    </div>
                  )}

                  {!isLoadingScenarios && aiScenarios.length === 0 && productImages.length > 0 && niche.trim() && (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">{t('ugc.scenarios.emptyState')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            {hasSelectedScenario && (
              <div className="sticky bottom-4 z-40">
                <Card className="rounded-apple shadow-lg bg-background/95 backdrop-blur-sm border border-border">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Settings Summary */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Settings: </span>
                          <span className="text-foreground">{summary}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSettingsOpen(true)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Adjust
                        </Button>
                      </div>

                      <Button
                        variant="default"
                        size="lg"
                        className="w-full"
                        onClick={handleGenerate}
                        disabled={!productImages.length || !hasSelectedScenario || isGenerating || !canGenerateImages(numImages)}
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

                      <p className="text-xs text-muted-foreground text-center">
                        {remainingCredits} credits remaining • {getTotalCredits()} total credits
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {(stage === 'generating' || stage === 'results') && (
          <div ref={resultsRef} className="scroll-mt-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Generated Images</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStage('setup');
                    topRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Generate More
                </Button>
              </div>

              {stage === 'generating' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Generating {numImages} image{numImages > 1 ? 's' : ''}...
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Progress: {Math.round(progress)}%
                  </p>
                </div>
              )}
            </div>

            <GeneratedImagesRows
              currentImages={currentBatchImages}
              previousImages={previousImages}
              onImageSelect={(imageId) => {
                setCurrentBatchImages(prev =>
                  prev.map(img =>
                    img.id === imageId ? { ...img, selected: !img.selected } : img
                  )
                );
                setPreviousImages(prev =>
                  prev.map(img =>
                    img.id === imageId ? { ...img, selected: !img.selected } : img
                  )
                );
              }}
              isGenerating={isGenerating}
              pendingSlots={pendingSlots}
            />

            {showScrollDown && (
              <div className="fixed bottom-6 right-6 z-50">
                <Button
                  size="icon"
                  className="rounded-full shadow-lg animate-bounce"
                  onClick={() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Sheet */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        numImages={numImages}
        onNumImagesChange={setNumImages}
        imageQuality={imageQuality}
        onImageQualityChange={setImageQuality}
        imageOrientation={imageOrientation}
        onImageOrientationChange={setImageOrientation}
        timeOfDay={timeOfDay}
        onTimeOfDayChange={setTimeOfDay}
        highlight={highlight}
        onHighlightChange={setHighlight}
        style={style}
        onStyleChange={setStyle}
      />

      {/* Source Image Picker Dialog */}
      <Dialog open={sourceImagePickerOpen} onOpenChange={setSourceImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('ugc.productImage.selectFromLibrary')}</DialogTitle>
          </DialogHeader>
          <SourceImagePicker
            onImageSelect={handleSourceImageSelect}
            onClose={() => setSourceImagePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* URL Import Dialog */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ugc.productImage.importFromUrl')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-url">Image URL</Label>
              <Input
                id="import-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUrlImport}
                disabled={!importUrl.trim() || importingFromUrl}
                className="flex-1"
              >
                {importingFromUrl ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                className="flex-1"
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

export default CreateUGC;
