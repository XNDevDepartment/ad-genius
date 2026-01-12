import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Sparkles, RefreshCw, HelpCircle, Pencil, ArrowDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import MultiImageUploader from "@/components/MultiImageUploader";
import { useToast } from "@/hooks/use-toast";
import { useConversationStorage } from "@/hooks/useConversationStorage";
import { startConversationAPI, converse } from '@/api/OpenAiChatClient';
import { useGeminiImageJobUnified } from '@/hooks/useGeminiImageJobUnified';
import { useActiveJob } from '@/hooks/useActiveJob';
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useImageLimit } from "@/hooks/useImageLimit";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsSheet } from "@/components/departments/ugc/SettingsSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import GeneratedImagesRows from "@/components/GeneratedImagesRows";
import { SourceImagePicker } from "@/components/SourceImagePicker";
import type { SourceImage } from "@/hooks/useSourceImages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link as LinkIcon, Images, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShopifyImportModal } from "@/components/ShopifyImportModal";
import { useLanguage } from "@/contexts/LanguageContext";
import AspectRatioSelector, { AspectRatio } from "@/components/AspectRatioSelector";
import { SIZE_MAP } from "@/lib/aspectSizes";
import { ModelVersion } from "@/api/ugc-gemini-unified";

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

interface CreateUGCGeminiBaseProps {
  modelVersion: ModelVersion;
  showAdminBadge?: boolean;
}

const ASPECT_INFO: Record<AspectRatio, { label: string; composition: string }> = {
  '1:1': { label: 'Square', composition: 'Balanced square framing; subject slightly off-center for tension.' },
  '3:4': { label: 'Portrait', composition: 'Vertical portrait framing with natural headroom; guide the eye along vertical lines.' },
  '4:3': { label: 'Landscape', composition: 'Classic landscape framing; rule-of-thirds emphasis and stable horizon.' },
  '9:16': { label: 'Vertical', composition: 'Tall story/reel framing; lead lines from foreground to subject.' },
  '16:9': { label: 'Wide', composition: 'Cinematic wide framing; foreground–midground–background depth cues.' },
  'source': { label: 'Source', composition: 'Original source image aspect ratio preserved; composition matches uploaded image dimensions.' },
};

const CreateUGCGeminiBase = ({ modelVersion, showAdminBadge = false }: CreateUGCGeminiBaseProps) => {
  console.log(`CreateUGCGemini (${modelVersion}) component rendering...`);
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  let navigate = useNavigate();
  const location = useLocation();

  const { user, subscriptionData } = useAuth();
  const { credits, getTotalCredits } = useCredits();
  const { uploadSourceImage, uploading: sourceImageUploading } = useSourceImageUpload();
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('high');
  const { remainingCredits, canGenerateImages, isAtLimit, refreshCount, calculateImageCost } = useImageLimit(imageQuality);
  const [imagesAnalysed, setImagesAnalysed] = useState(false);

  try {
    console.log('useNavigate hook successful');
  } catch (error) {
    console.error('useNavigate hook failed:', error);
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
  const [isAnalyzingImages, setIsAnalyzingImages] = useState<boolean[]>([]);
  const [desiredAudience, setDesiredAudience] = useState("");
  const [prodSpecs, setProdSpecs] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>({ 'idea': "", "small-description": "", "description": "" });
  const [customScenarioMode, setCustomScenarioMode] = useState(false);
  const [uploadedSourceIds, setUploadedSourceIds] = useState<string[]>([]);

  const hasSelectedScenario = selectedScenario && selectedScenario.idea && selectedScenario.idea.trim().length > 0;
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [moreScenarios, setMoreScenarios] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [imageOrientation, setImageOrientation] = useState("1:1");
  const [timeOfDay, setTimeOfDay] = useState<'natural' | 'golden' | 'night' | 'morning'>("natural");
  const [highlight, setHighlight] = useState("yes");
  const [style, setStyle] = useState<'lifestyle' | 'studio' | 'cinematic' | 'natural' | 'minimal' | 'professional'>("lifestyle");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('source');

  // Use unified hook with model version
  const { job, images: jobImages, createJob, clearJob, loadJob, resumeCurrentJob, storageKeys } = useGeminiImageJobUnified(modelVersion);
  const { language } = useLanguage();
  const { activeJob, activeImages } = useActiveJob();

  const isGenerating = (stage === 'generating' || job?.status === 'queued' || job?.status === 'processing') && job?.status !== 'completed';

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
  const [shopifyImportOpen, setShopifyImportOpen] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const scnRef = useRef<HTMLTextAreaElement>(null);
  const scenariosRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [desiredAudience]);

  const ASSISTANT_ID = "asst_zX2cHyZXHY1mj5CT4wzdJLU6";

  const initializeThread = async () => {
    try {
      const result = await startConversationAPI(ASSISTANT_ID);
      setThreadId(result.threadId);
      console.log('New thread created with new-openai-chat:', result.threadId);

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

  useEffect(() => {
    initializeThread();
  }, []);

  useEffect(() => {
    if (productImages.length === 0) {
      setSourceImageIds([]);
      setUploadedSourceIds([]);
      setImagesAnalysed(false);
    } else if (productImages.length < sourceImageIds.length) {
      setSourceImageIds(prev => prev.slice(0, productImages.length));
      setUploadedSourceIds(prev => prev.slice(0, productImages.length));
    }
  }, [productImages.length]);

  // Handle replicate mode
  useEffect(() => {
    const replicateState = location.state as any;
    if (replicateState?.replicateJobId) {
      console.log(`[CreateUGCGemini ${modelVersion}] Replicate mode detected:`, replicateState);

      if (replicateState.desiredAudience) {
        setDesiredAudience(replicateState.desiredAudience);
      }
      if (replicateState.prodSpecs) {
        setProdSpecs(replicateState.prodSpecs);
      }

      if (replicateState.settings) {
        const settings = replicateState.settings;
        if (settings.quality) setImageQuality(settings.quality);
        if (settings.numberOfImages) setNumImages(settings.numberOfImages);
        if (settings.orientation) setImageOrientation(settings.orientation);
      }

      if (replicateState.sourceImageIds && replicateState.sourceImageIds.length > 0) {
        setSourceImageIds(replicateState.sourceImageIds);
        setUploadedSourceIds(replicateState.sourceImageIds);
        setImagesAnalysed(true);

        const loadSourceImages = async () => {
          try {
            const { data: sourceImages, error } = await supabase
              .from('source_images')
              .select('*')
              .in('id', replicateState.sourceImageIds);

            if (error) throw error;
            if (!sourceImages || sourceImages.length === 0) return;

            const imageFiles = await Promise.all(
              sourceImages.map(async (img) => {
                try {
                  const { data: signedData } = await supabase.storage
                    .from('ugc-inputs')
                    .createSignedUrl(img.storage_path, 3600);

                  const imageUrl = signedData?.signedUrl || img.public_url;
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  return new File([blob], img.file_name, { type: img.mime_type || 'image/jpeg' });
                } catch (err) {
                  console.error('Failed to load source image:', img.id, err);
                  return null;
                }
              })
            );

            const validFiles = imageFiles.filter((f): f is File => f !== null);
            if (validFiles.length > 0) {
              setProductImages(validFiles);
            }
          } catch (error) {
            console.error('Error loading source images:', error);
          }
        };

        loadSourceImages();

        toast({
          title: "Generation Replicated",
          description: "Settings and images loaded from your previous generation.",
        });
      }

      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    if (aiScenarios.length > 0) {
      setTimeout(() => {
        scenariosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiScenarios.length]);

  // Replace current batch with job images when ready
  useEffect(() => {
    console.log(`[CreateUGCGemini ${modelVersion}] Job images changed:`, {
      jobImagesLength: jobImages.length,
      jobStatus: job?.status,
      jobImagesWithUrls: jobImages.filter(img => Boolean(img.public_url)).length
    });

    if (jobImages.length === 0) return;

    const readyImages = jobImages.filter(img => Boolean(img.public_url));
    console.log(`[CreateUGCGemini ${modelVersion}] Ready images:`, readyImages.length, 'out of', jobImages.length);

    if (readyImages.length === 0) return;

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
          job?.settings?.orientation ||
          imageOrientation,
      }));

      console.log(`[CreateUGCGemini ${modelVersion}] Replacing current batch with`, newImages.length, 'ready images');
      return newImages;
    });
  }, [jobImages, job?.prompt, job?.settings?.output_format, modelVersion]);

  // Handle job completion
  useEffect(() => {
    if (job?.status === 'completed') {
      console.log(`[CreateUGCGemini ${modelVersion}] Job completed, transitioning to results stage`);

      // Force reset body scroll lock that might be left by Radix dialogs
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      
      // Close settings sheet to prevent scroll lock issues
      setSettingsOpen(false);

      setCurrentBatchImages(current => {
        if (current.length > 0) {
          console.log(`[CreateUGCGemini ${modelVersion}] Moving`, current.length, 'images from current to previous');

          setPreviousImages(prev => {
            const existingIds = new Set(prev.map(img => img.id));
            const validNewImages = current.filter(img =>
              img.url &&
              !img.id.startsWith('recovery-placeholder-') &&
              !existingIds.has(img.id)
            );
            console.log(`[CreateUGCGemini ${modelVersion}] Adding`, validNewImages.length, 'new images to previous');
            return [...validNewImages, ...prev];
          });
        }
        return [];
      });

      setPendingSlots(0);
      setStage('results');
      localStorage.removeItem(storageKeys.jobId);
      localStorage.removeItem(storageKeys.stage);
    }
  }, [job?.status, modelVersion, storageKeys]);

  // Cleanup body scroll lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

  // Restore job state from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem(storageKeys.jobId);
    const savedStage = localStorage.getItem(storageKeys.stage);
    const jobMetadata = localStorage.getItem(storageKeys.metadata);

    if (savedJobId && !job) {
      try {
        console.log(`[CreateUGCGemini ${modelVersion}] Attempting to recover job:`, savedJobId);

        loadJob(savedJobId).then(() => {
          if (jobMetadata) {
            const metadata = JSON.parse(jobMetadata);
            setNumImages(metadata.numImages || 1);

            setTimeout(() => {
              console.log(`[CreateUGCGemini ${modelVersion}] Job status on recovery:`, job?.status);

              if (metadata.numImages && job && (job.status === 'queued' || job.status === 'processing')) {
                console.log(`[CreateUGCGemini ${modelVersion}] Creating placeholders for active job`);
                setStage('generating');
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
                console.log(`[CreateUGCGemini ${modelVersion}] Job already completed, setting to results stage`);
                setStage('results');
              }
            }, 100);
          }
        }).catch((error) => {
          console.error('Failed to recover job on mobile:', error);
          if (activeJob) {
            loadJob(activeJob.id).catch(console.error);
          } else {
            localStorage.removeItem(storageKeys.jobId);
            localStorage.removeItem(storageKeys.stage);
            localStorage.removeItem(storageKeys.metadata);
          }
        });

        if (savedStage === 'generating' || savedStage === 'results') {
          setStage(savedStage as 'generating' | 'results');
        }
      } catch (error) {
        console.error('Error parsing job metadata:', error);
        localStorage.removeItem(storageKeys.metadata);
      }
    } else if (!savedJobId && activeJob && !job) {
      loadJob(activeJob.id).catch(console.error);
      setStage('generating');
      setNumImages(activeJob.total);
    }

    if (job && savedStage === 'generating' && job.status !== 'completed') {
      setNumImages(job.total);
    }
  }, [job, activeJob, loadJob, modelVersion, storageKeys]);

  // Monitor job status and handle completion/failures
  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed' || job?.status === 'canceled') {
      localStorage.removeItem(storageKeys.jobId);
      localStorage.removeItem(storageKeys.stage);
      localStorage.removeItem(storageKeys.metadata);

      if (job?.status === 'completed') {
        setStage('results');
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (job?.status === 'failed' || job?.status === 'canceled') {
        setStage('setup');
      }
    } else if ((job?.status === 'queued' || job?.status === 'processing') && stage !== 'generating') {
      setStage('generating');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [job?.status, stage, storageKeys]);

  type AR = AspectRatio;

  function parseAR(ar: AR) {
    const [w, h] = ar.split(':').map(Number);
    return { ratio: w / h };
  }

  const handleImagesUpload = async (files: File[]) => {
    setProductImages(files);
    setImagesAnalysed(false);
    setUploadedSourceIds([]);
    setSourceImageIds([]);

    toast({
      title: "Product Images Uploaded",
      description: `Uploaded ${files.length} images. Now describe your desired Audience to get scenario suggestions.`
    });

    document.getElementById("desiredAudience")?.focus();
  };

  const handleAudienceChange = (audienceText: string) => {
    setDesiredAudience(audienceText);
  };

  const handleProdSpecsChange = (prodSpecsText: string) => {
    setProdSpecs(prodSpecsText);
  };

  const handleSourceImageSelect = async (image: SourceImage) => {
    try {
      const response = await fetch(image.signedUrl);
      const blob = await response.blob();
      const file = new File([blob], image.fileName, { type: blob.type });

      setProductImages([file]);
      setSourceImageIds([image.id]);
      setUploadedSourceIds([image.id]);
      setImagesAnalysed(true);

      toast({
        title: "Product Loaded",
        description: "Selected image from your library and AI has analyzed it."
      });
      document.getElementById("desiredAudience")?.focus();
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
      setImagesAnalysed(false);

      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: importUrl.trim() }
      });

      if (error) {
        throw new Error(error.message || 'Failed to import image from URL');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to import image from URL');
      }

      const { data: signedUrlData } = await supabase.storage
        .from('ugc-inputs')
        .createSignedUrl(data.sourceImage.storage_path, 3600);

      if (signedUrlData?.signedUrl) {
        const response = await fetch(signedUrlData.signedUrl);
        const blob = await response.blob();
        const file = new File([blob], data.sourceImage.fileName, { type: blob.type });

        setProductImages([file]);
        setSourceImageIds([data.sourceImage.id]);
        setUploadedSourceIds([data.sourceImage.id]);
        setImagesAnalysed(true);
        setImportUrl("");
        setUrlImportOpen(false);

        setIsAnalyzingImages([false]);
        toast({
          title: "Image Imported",
          description: "Successfully imported and analyzed image from URL."
        });
        document.getElementById("desiredAudience")?.focus();
      }
    } catch (error) {
      console.error('Error importing from URL:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message + '. The image may have protection or copyrights license. Please use another URL.' : "Failed to import image from URL.",
        variant: "destructive",
      });
    } finally {
      setImportingFromUrl(false);
    }
  };

  const handleShopifyImportComplete = async (importedUrls: string[]) => {
    if (importedUrls.length === 0) return;

    try {
      // Fetch the first imported image to use as the product image
      const { data: sourceImages, error } = await supabase
        .from('source_images')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !sourceImages?.length) {
        throw new Error('Could not find imported image');
      }

      const sourceImage = sourceImages[0];
      
      const { data: signedUrlData } = await supabase.storage
        .from('ugc-inputs')
        .createSignedUrl(sourceImage.storage_path, 3600);

      if (signedUrlData?.signedUrl) {
        const response = await fetch(signedUrlData.signedUrl);
        const blob = await response.blob();
        const file = new File([blob], sourceImage.file_name, { type: blob.type });

        setProductImages([file]);
        setSourceImageIds([sourceImage.id]);
        setUploadedSourceIds([sourceImage.id]);
        setImagesAnalysed(true);
        setIsAnalyzingImages([false]);
        
        toast({
          title: t('ugc.shopifyImport.success', 'Image Imported'),
          description: t('ugc.shopifyImport.successDesc', 'Successfully imported image from Shopify.')
        });
        document.getElementById("desiredAudience")?.focus();
      }
    } catch (error) {
      console.error('Error loading imported Shopify image:', error);
      toast({
        title: t('ugc.shopifyImport.error', 'Import Error'),
        description: t('ugc.shopifyImport.errorDesc', 'Failed to load the imported image.'),
        variant: "destructive",
      });
    }
  };

  const getScenariosFromConversation = async (desiredText?: string, moreScen?: boolean) => {
    setIsLoadingScenarios(true);

    if (!imagesAnalysed && uploadedSourceIds.length === 0) {
      setIsAnalyzingImages(new Array(productImages.length).fill(true));

      for (let i = 0; i < productImages.length; i++) {
        const file = productImages[i];

        try {
          const sourceImage = await uploadSourceImage(file);
          if (sourceImage) {
            setUploadedSourceIds((old) => [...old, sourceImage.id]);
            console.log(`Source image ${i + 1} uploaded with ID:`, sourceImage.id);
          }
        } catch (error) {
          console.error(`Failed to upload source image ${i + 1}:`, error);
        }
      }
      setImagesAnalysed(true);
    } else if (uploadedSourceIds.length > 0) {
      setImagesAnalysed(true);
    }

    const imageDataArray: Array<{ fileData: string; fileName: string }> = [];

    for (const file of productImages) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        imageDataArray.push({
          fileData: base64,
          fileName: file.name
        });
      } catch (error) {
        console.error(`Error converting image ${file.name} to base64:`, error);
      }
    }

    try {
      const responseText = await converse(
        threadId!,
        `${`I have uploaded ${productImages.length} product images. Here are some details of the product: ${prodSpecs} Please analyze all of them together and provide comprehensive product analysis.`} Here is my desired audience to promote my product: ${desiredAudience}. Based on the product images I'm sending and this desired audience description, please provide ${moreScen ? 'new and different' : ''} 6 creative UGC scenario ideas out of the box. Return ONLY a compact JSON object with "scenarios" array and in this language: ` + language,
        ASSISTANT_ID
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scenarios = JSON.parse(jsonMatch[0]);
        setAiScenarios(scenarios.scenarios || []);
        setIsAnalyzingImages(new Array(productImages.length).fill(false));

        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: `Here is my desired audience to promote my product: ${desiredAudience}. Based on the product images and this caracteristics (${prodSpecs}) I'm sending and this desired audience description, please provide ${moreScen ? 'new and different' : ''} 6 creative UGC scenario ideas out of the box`,
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
      setIsAnalyzingImages(new Array(productImages.length).fill(false));
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
    setAiScenarios([]);
    setMoreScenarios(true);
    await getScenariosFromConversation("", true);
  };

  const handleGenerate = async () => {
    if (productImages.length === 0 || !hasSelectedScenario) {
      toast({
        title: 'Missing information',
        description: 'Please upload a product image and select a scenario.',
        variant: 'destructive',
      });
      return;
    }

    // For admin testing (V3), skip credit check
    const skipCreditCheck = modelVersion === 'gemini-v3';
    
    if (!skipCreditCheck && !canGenerateImages(numImages)) {
      toast({
        title: 'Insufficient credits',
        description: `You need ${numImages} ${numImages === 1 ? 'credit' : 'credits'} to generate ${numImages} image(s). You have ${remainingCredits} credits remaining.`,
        variant: 'destructive',
      });
      setStage('setup');
      return;
    }

    try {
      console.log(`[CreateUGCGemini ${modelVersion}] Multi-image path - NO CROPPING`);

      // Close settings sheet before starting generation to prevent scroll lock
      setSettingsOpen(false);
      
      clearJob();
      setPreviousImages(prev => {
        if (currentBatchImages.length === 0) return prev;
        const finished = currentBatchImages.filter(img => Boolean(img.url));
        return finished.length ? [...finished, ...prev] : prev;
      });
      setCurrentBatchImages([]);

      setStage('generating');
      setPendingSlots(numImages);
      localStorage.setItem(storageKeys.stage, 'generating');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

      const commonNeg = `--negative "AI artifacts, text overlays, watermark, extreme bokeh, macro close-up, center-composed product, invented branding, extra limbs, low resolution, duplicated faces, similar persons"`;

      const highlightYes = `
TASK: Create authentic UGC photo featuring this product.

SCENARIO: ${selectedScenario?.description || 'Natural lifestyle moment'}
AUDIENCE: ${desiredAudience}
SPECS: ${prodSpecs}

MANDATORY RULES:

1. PRODUCT INTEGRITY:
   - Use EXACT product from reference image
   - Keep all labels, colors, shapes, branding unchanged
   - Product is hero - 40-60% of frame

2. AUTHENTICITY:
   - iPhone-quality photography
   - Natural lighting, real environments
   - Slight imperfections (soft focus, natural shadows)
   - Casual, off-center framing

3. STYLE:
   - ${style} photography aesthetic
   - ${timeOfDay} lighting

4. QUALITY:
   - No AI artifacts, watermarks, text
   - Natural human anatomy if people appear
   - No invented branding

${commonNeg}

OUTPUT: Single authentic UGC photo ready for social media.
`;

      const highlightNo = `
TASK: Create lifestyle photo where environment is hero, product is subtle.

SCENARIO: ${selectedScenario?.description || 'Natural lifestyle setting'}
AUDIENCE: ${desiredAudience}
SPECS: ${prodSpecs}

MANDATORY RULES:

1. PRODUCT INTEGRITY:
   - Use EXACT product from reference image
   - Keep all labels, colors, shapes, branding unchanged
   - Product occupies 20-35% of frame (visible but not dominant)

2. ENVIRONMENT FIRST:
   - Scene tells a story
   - Product appears naturally within environment
   - Use leading lines and depth to guide eye to product

3. STYLE:
   - ${style} lifestyle photography
   - ${timeOfDay} natural lighting
   - Warm, inviting, lived-in atmosphere

4. QUALITY:
   - No AI artifacts, watermarks, text
   - Natural human anatomy if people appear
   - No invented branding

${commonNeg}

OUTPUT: Single polished lifestyle photo usable as ad creative.
`;

      const prompt = (highlight === 'yes' ? highlightYes : highlightNo).trim();

      const uploadedIds: string[] = [];
      if (!imagesAnalysed) {
        for (const img of productImages) {
          const uploaded = await uploadSourceImage(img);
          if (uploaded?.id) {
            uploadedIds.push(uploaded.id);
          }
        }
        if (uploadedIds.length === 0) {
          throw new Error('Failed to upload source images');
        }
      }

      const idsToUse =
        (uploadedSourceIds && uploadedSourceIds.length > 0 ? uploadedSourceIds :
          (sourceImageIds && sourceImageIds.length > 0 ? sourceImageIds : uploadedIds));

      if (!idsToUse || idsToUse.length === 0) {
        toast({
          title: "Missing source image",
          description: "Please choose an image from Library or upload a product image before generating.",
          variant: "destructive",
        });
        return;
      }

      const sizePx = aspectRatio === 'source'
        ? undefined
        : SIZE_MAP[aspectRatio]['large'];

      const result = await createJob({
        prompt,
        settings: {
          number: numImages,
          size: sizePx as "1024x1024" | "1024x1536" | "1536x1024" | undefined,
          quality: imageQuality,
          style: style as 'lifestyle' | 'minimal' | 'vibrant' | 'professional' | 'cinematic' | 'natural',
          timeOfDay: timeOfDay as 'natural' | 'golden' | 'night',
          highlight: highlight as 'yes' | 'no',
          output_format: 'png',
          aspectRatio: aspectRatio,
        },
        source_image_ids: idsToUse,
        desiredAudience: desiredAudience || undefined,
        prodSpecs: prodSpecs || undefined,
      });

      if (!result) throw new Error('Failed to create job');

      const jobId = result.jobId;
      localStorage.setItem(storageKeys.jobId, jobId);
      localStorage.setItem(storageKeys.stage, 'generating');
      localStorage.setItem(storageKeys.metadata, JSON.stringify({
        id: jobId,
        numImages,
        settings: {
          number: numImages,
          quality: imageQuality,
          orientation: aspectRatio,
          style,
          timeOfDay,
          highlight,
          output_format: 'png',
        },
        prompt,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      localStorage.setItem(storageKeys.stage, 'setup');
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate images. Please try again.",
        variant: "destructive",
      });
      refreshCount();
      setStage('setup');
      setPendingSlots(0);
    }
  };

  const allImages = [...currentBatchImages, ...previousImages];

  const handleStartFromScratch = () => {
    clearJob();
    setCurrentBatchImages([]);
    setPreviousImages([]);
    setPendingSlots(0);
    setProductImages([]);
    setSourceImageIds([]);
    setDesiredAudience("");
    setProdSpecs("");
    setAiScenarios([]);
    setSelectedScenario({ 'idea': "", "small-description": "", "description": "" });
    setStage('setup');
    setPendingSlots(0);
    setIsAnalyzingImages(new Array(productImages.length).fill(false));
    setImagesAnalysed(false);

    localStorage.removeItem(storageKeys.jobId);
    localStorage.removeItem(storageKeys.stage);
    localStorage.removeItem(storageKeys.metadata);

    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    toast({
      title: "Starting fresh",
      description: "All data cleared. Ready for a new generation.",
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const hasContent = allImages.length > 0 || jobImages.length > 0 || isGenerating || stage === 'results';
      const isScrolledUp = window.scrollY < window.innerHeight * 0.5;
      setShowScrollDown(hasContent && isScrolledUp);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [jobImages.length, isGenerating, stage]);

  const handleScrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageTitle = modelVersion === 'gemini-v3' ? 'UGC Creator (Gemini 3.0 Test)' : t('ugc.title');

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={400}>
      <div ref={topRef} className="min-h-screen bg-background relative overflow-y-auto">
        {/* Loading Overlay */}
        {!threadId && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[30] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold">{t('ugc.loading.preparing')}</h2>
              <p className="text-muted-foreground">{t('ugc.loading.moment')}</p>
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
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl lg:text-3xl font-bold">{pageTitle}</h1>
                    {showAdminBadge && (
                      <Badge className="bg-orange-500 text-white">ADMIN</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <div className={`${isMobile ? 'col-span-12' : 'lg:col-span-7'} space-y-6`}>
              {/* Product & Niche Card */}
              <Card className={`${!threadId ? 'opacity-50 pointer-events-none' : ' rounded-apple shadow-lg'}`}>
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div>
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
                        <MultiImageUploader
                          onImagesSelect={handleImagesUpload}
                          selectedImages={productImages}
                          setImagesAnalysed={setImagesAnalysed}
                          isAnalyzing={isAnalyzingImages}
                          analyzingText="Analyzing product..."
                          maxImages={1}
                        />

                        {/* Additional Image Options */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSourceImagePickerOpen(true)}
                              className="flex-1 p-2"
                              disabled={!threadId}
                            >
                              <Images className="h-4 w-4 mr-2" />
                              {t('ugc.importOptions.library')}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUrlImportOpen(true)}
                              className="flex-1 p-2"
                              disabled={!threadId}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              {t('ugc.importOptions.url')}
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShopifyImportOpen(true)}
                            className="w-full text-muted-foreground hover:text-foreground"
                            disabled={!threadId}
                          >
                            <Store className="h-4 w-4 mr-2" />
                            {t('ugc.importOptions.shopify')}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="desiredAudience">{t('ugc.desireAudience.title')}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{t('ugc.desireAudience.tooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <p className="hidden md:block text-sm text-muted-foreground">{t('ugc.desireAudience.subtitle')}</p>
                          <span className="ml-auto">{desiredAudience.length} / 500</span>
                        </div>
                        <Textarea
                          ref={taRef}
                          id="desiredAudience"
                          value={desiredAudience}
                          maxLength={500}
                          placeholder={t('ugc.desireAudience.placeholder')}
                          onChange={(e) => handleAudienceChange(e.target.value)}
                          className="rounded-apple-sm min-h-0 overflow-hidden resize-none w-full text-base md:text-sm"
                          style={{ lineHeight: '1.25rem' }}
                          disabled={!threadId}
                          rows={1}
                        />
                      </div>
                      <div className="space-y-2 pt-5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="prodSpecs">{t('ugc.productDetails.title')}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{t('ugc.productDetails.tooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <p className="hidden md:block text-sm text-muted-foreground">{t('ugc.productDetails.subtitle')}</p>
                          <span className="ml-auto">{prodSpecs.length} / 500</span>
                        </div>
                        <Textarea
                          id="prodSpecs"
                          value={prodSpecs}
                          maxLength={500}
                          placeholder={t('ugc.productDetails.placeholder')}
                          onChange={(e) => handleProdSpecsChange(e.target.value)}
                          className="rounded-apple-sm min-h-0 overflow-hidden resize-none w-full text-base md:text-sm"
                          style={{ lineHeight: '1.25rem' }}
                          disabled={!threadId}
                          rows={1}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="default"
                        onClick={() => getScenariosFromConversation()}
                        disabled={isLoadingScenarios || productImages.length === 0 || !desiredAudience.trim() || !threadId || isAnalyzingImages.some(Boolean)}
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
                    <p className="hidden md:block text-sm text-muted-foreground mb-4">{t('ugc.scenarios.subtitle')}</p>
                    
                    {/* Custom Scenario Option */}
                    <div className="mb-4">
                      <div 
                        className={`p-3 border rounded-apple-sm cursor-pointer transition-all ${
                          customScenarioMode
                            ? 'border-primary bg-primary/5'
                            : 'border-dashed border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          if (!customScenarioMode) {
                            setCustomScenarioMode(true);
                            setSelectedScenario({ idea: t('ugc.scenarios.customScenario'), "small-description": t('ugc.scenarios.customScenarioDesc'), description: "" });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{t('ugc.scenarios.customScenario')}</span>
                          {customScenarioMode && <Badge variant="secondary" className="ml-auto">{t('ugc.scenarios.active')}</Badge>}
                        </div>
                        
                        {customScenarioMode && (
                          <Textarea
                            className="mt-3 min-h-[100px] text-base md:text-sm"
                            placeholder={t('ugc.scenarios.customPlaceholder')}
                            value={selectedScenario?.description || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setSelectedScenario({
                              idea: t('ugc.scenarios.customScenario'),
                              "small-description": t('ugc.scenarios.customScenarioDesc'),
                              description: e.target.value
                            })}
                          />
                        )}
                      </div>
                    </div>

                    {!isLoadingScenarios && aiScenarios.length > 0 && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          {aiScenarios.map((scenario, index) => (
                            <div
                              key={index}
                              className={`p-3 border rounded-apple-sm cursor-pointer transition-all ${
                                !customScenarioMode && selectedScenario?.idea === scenario.idea
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => {
                                console.log('Scenario selected:', scenario);
                                setCustomScenarioMode(false);
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

                        {!customScenarioMode && (
                          <Textarea
                            ref={scnRef}
                            id="scenarioDescription"
                            value={selectedScenario?.description || ''}
                            onChange={(e) => setSelectedScenario(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder={t('ugc.scenarios.editPlaceholder')}
                            className="min-h-[80px] rounded-apple-sm text-base md:text-sm"
                            disabled={!hasSelectedScenario}
                          />
                        )}
                      </div>
                    )}
                    {!isLoadingScenarios && aiScenarios.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('ugc.scenarios.emptyState')}
                      </p>
                    )}
                    {isLoadingScenarios && (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Generated Images */}
              <div ref={resultsRef} className="scroll-mt-6">
                {(allImages.length > 0 || jobImages.length > 0 || isGenerating || pendingSlots > 0) && (
                  <Card className="rounded-apple shadow-lg">
                    <CardContent className="p-6 lg:p-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{t('ugc.generatedImages.title')}</h2>
                        {stage === 'results' && allImages.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={handleStartFromScratch}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('ugc.results.startFresh')}
                          </Button>
                        )}
                      </div>

                      {isGenerating && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                              {t('ugc.generatedImages.generating', { count: numImages })}
                            </span>
                          </div>
                          <Progress value={(job?.progress || 0)} className="h-2" />
                        </div>
                      )}

                      <GeneratedImagesRows
                        currentBatchImages={currentBatchImages}
                        previousImages={previousImages}
                        totalSlots={numImages}
                        isGenerating={isGenerating}
                        onCreateNewScenario={() => {}}
                        onOpenInLibrary={() => navigate('/library')}
                        onStartFromScratch={handleStartFromScratch}
                        jobId={job?.id}
                        imageOrientation={aspectRatio}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
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
                        <span className="font-medium">
                          {modelVersion === 'gemini-v3' ? '∞ (Admin)' : `${remainingCredits} / ${credits}`}
                        </span>
                      </div>
                      {modelVersion !== 'gemini-v3' && (
                        <Progress value={(remainingCredits / credits) * 100} className="h-2" />
                      )}
                      <div className="text-xs text-muted-foreground">
                        {modelVersion === 'gemini-v3' ? 'Free for testing' : `${subscriptionData?.subscription_tier || 'Free'} Plan`}
                      </div>
                    </div>

                    {/* Number of Images */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sidebar-numImages" className="text-sm font-medium">{t('ugc.numImages.title')}</Label>
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
                      <Label className="text-sm font-medium">{t('ugc.advancedSettings.highlight.title')}</Label>
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
                      <Label className="text-sm font-medium">{t('ugc.advancedSettings.timeOfDay.title')}</Label>
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
                      <Label className="text-sm font-medium">{t('ugc.advancedSettings.style.title')}</Label>
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
                      <Label className="text-sm font-medium">{t('ugc.orientation.title')}</Label>
                      <AspectRatioSelector
                        value={aspectRatio}
                        onChange={setAspectRatio}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Button
                      variant={productImages.length === 0 || !hasSelectedScenario || isGenerating || (!canGenerateImages(numImages) && modelVersion !== 'gemini-v3') ? "secondary" : "alternative"}
                      size="lg"
                      className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                      onClick={handleGenerate}
                      disabled={productImages.length === 0 || !hasSelectedScenario || isGenerating || (!canGenerateImages(numImages) && modelVersion !== 'gemini-v3')}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Generate Images ({modelVersion === 'gemini-v3' ? 'Free' : `${numImages} credit${numImages > 1 ? 's' : ''}`})
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {isGenerating ? t('ugc.generating') :
                        (!canGenerateImages(numImages) && modelVersion !== 'gemini-v3') ? `Insufficient credits (${remainingCredits} remaining, need ${numImages})` :
                          'Generation typically takes 7-14 seconds'}
                    </p>

                    {!canGenerateImages(numImages) && modelVersion !== 'gemini-v3' && (
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
            <div className="fixed left-0 right-0 bottom-[10px] sm:bottom-[50px] z-[20] px-4 pb-safe pointer-events-none">
              <div className="max-w-lg mx-auto bg-card/95 border border-border/50 rounded-2xl shadow-lg p-3 space-y-3 pointer-events-auto backdrop-blur supports-backdrop-blur:bg-background/60">
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-3 py-2 bg-muted/40 rounded-full text-xs text-muted-foreground truncate" onClick={() => setSettingsOpen(true)}>
                    <Button className="w-full" variant="ghost">
                      Open image settings
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant={productImages.length === 0 || !hasSelectedScenario || isGenerating || (!canGenerateImages(numImages) && modelVersion !== 'gemini-v3') ? "secondary" : "alternative"}
                  size="lg"
                  className={`w-full ${isGenerating ? 'animate-pulse' : ''}`}
                  onClick={handleGenerate}
                  disabled={productImages.length === 0 || !hasSelectedScenario || isGenerating || (!canGenerateImages(numImages) && modelVersion !== 'gemini-v3')}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Images ({modelVersion === 'gemini-v3' ? 'Free' : `${numImages} credit${numImages > 1 ? 's' : ''}`})
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
              canGenerate={productImages.length > 0 && hasSelectedScenario && !isGenerating && (canGenerateImages(numImages) || modelVersion === 'gemini-v3')}
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
              <DialogTitle>{t('ugc.importOptions.urlTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">{t('ugc.importOptions.imageUrl')}</Label>
                <Input
                  id="imageUrl"
                  placeholder={t('ugc.importOptions.urlPlaceholder')}
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={importingFromUrl}
                />
                <p className="text-xs text-muted-foreground">
                  {t('ugc.importOptions.urlHint')}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUrlImportOpen(false)} disabled={importingFromUrl}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleImportFromUrl} disabled={!importUrl.trim() || importingFromUrl}>
                  {importingFromUrl ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('ugc.importOptions.importing')}
                    </>
                  ) : (
                    t('ugc.importOptions.import')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shopify Import Modal */}
        <ShopifyImportModal
          open={shopifyImportOpen}
          onOpenChange={setShopifyImportOpen}
          onImportComplete={handleShopifyImportComplete}
        />
      </div>
    </TooltipProvider>
  );
};

export default CreateUGCGeminiBase;
