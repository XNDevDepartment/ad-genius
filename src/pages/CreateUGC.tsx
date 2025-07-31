import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ArrowLeft, Upload, Sparkles, RefreshCw, Loader2, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/ImageUploader";
import { GenerationJobStatus } from "@/components/departments/ugc/GenerationJobStatus";
import { PendingImagesReview } from "@/components/departments/ugc/PendingImagesReview";
import { useToast } from "@/hooks/use-toast";
import { useConversationStorage } from "@/hooks/useConversationStorage";
import { useGenerationJobs } from "@/hooks/useGenerationJobs";
import { startConversationAPI, converse, sendImageAndRun } from '@/api/OpenAiChatClient';
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
}

const CreateUGC = () => {
  console.log('CreateUGC component rendering...');

  const { user } = useAuth();
  const { 
    activeJobs, 
    pendingImages, 
    createGenerationJob, 
    cancelJob, 
    dismissPendingImages,
    loadPendingImages 
  } = useGenerationJobs();
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
  const { saveConversation, saveMessage } = useConversationStorage();
  const [productImage, setProductImage] = useState<File | null>(null);
  const [niche, setNiche] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [productIdentification, setProductIdentification] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [orientation, setOrientation] = useState("square");
  const [timeOfDay, setTimeOfDay] = useState("natural");
  const [style, setStyle] = useState("lifestyle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          'I have uploaded a product image. Please analyze it and tell me what product you see. Be specific about the product type, key features, and any details that would help with creating UGC content.'
        );

        setProductIdentification(reply);
        
        // Save user message and assistant response (only if user is authenticated)
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'user',
            content: 'I have uploaded a product image. Please analyze it and tell me what product you see.',
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
        `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide 4 creative UGC scenario ideas.`,
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
            content: `Product niche: ${targetNiche}. Based on the product image I shared and this niche description, please provide 4 creative UGC scenario ideas.`,
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
    await getScenariosFromConversation();
  };

  // helper: File → Data‑URL (base64)
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Updated generate function to use background jobs
  const handleGenerate = async () => {
    if (!productImage || !selectedScenario) {
      toast({
        title: 'Missing information',
        description: 'Please upload a product image and select a scenario.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the final prompt combining scenario and product image
      const finalPrompt = `Ultra‑detailed UGC photograph of my product positioned ${selectedScenario.description}, shot in natural ${timeOfDay} light using a full‑frame DSLR, 50 mm prime lens, aperture f/4, shutter 1/125 s, ISO 200. Center‑weighted autofocus locked on the product. True‑to‑life colors and surface texture with subtle, authentic imperfections. Composition: product fills about 70 percent of the frame, slight background bokeh for depth while preserving scenario context; camera at eye‑level angle—no wide‑angle distortion. Visual mood: ${style} yet realistic. --negative "AI artifacts, text overlays, watermark, lens flare, distorted or rotated labels, invented branding, extra limbs, low resolution, out‑of‑focus product, over‑saturation"`;
      
      console.log('Creating background generation job with prompt:', finalPrompt);
      
      // Convert image to base64 for the settings
      const baseImageData = await fileToDataUrl(productImage);
      
      await createGenerationJob(finalPrompt, {
        numberOfImages: numImages,
        size: orientation === 'square' ? '1024x1024' : orientation === 'portrait' ? '1024x1536' : '1536x1024',
        quality: 'high',
        outputFormat: 'png',
        baseImage: baseImageData,
        scenario: selectedScenario,
        style,
        timeOfDay,
        orientation
      });

      // Reset form for next generation
      setSelectedScenario(null);
      setAiScenarios([]);
      
    } catch (error) {
      console.error('Error creating generation job:', error);
      toast({
        title: 'Generation failed',
        description: 'Failed to start generation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewCreation = () => {
    setProductImage(null);
    setNiche("");
    setAiScenarios([]);
    setSelectedScenario(null);
  };

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

      <div className="container-responsive px-4 py-8">
        {/* Header */}
        <div className="mb-6">
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

        {/* Pending Images Review */}
        {pendingImages.length > 0 && (
          <div className="mb-8">
            <PendingImagesReview 
              images={pendingImages}
              onDismiss={dismissPendingImages}
              onSave={loadPendingImages}
            />
          </div>
        )}

        {/* Active Generation Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Generations
            </h2>
            <div className="space-y-4">
              {activeJobs.map(job => (
                <GenerationJobStatus 
                  key={job.id} 
                  job={job} 
                  onCancel={cancelJob}
                />
              ))}
            </div>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Form */}
          <div className="lg:col-span-7">
            <div className={`bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
              <ImageUploader 
                onImageSelect={handleImageUpload}
                selectedImage={productImage}
              />

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
            <div className={`bg-card rounded-apple p-6 lg:p-8 shadow-apple space-y-6 lg:sticky lg:top-8 ${!threadId ? 'opacity-50 pointer-events-none' : ''}`}>
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

              <div className="border-t pt-4 space-y-3">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={!productImage || !selectedScenario || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start Background Generation
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleNewCreation}
                >
                  New Creation
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {isSubmitting 
                    ? 'Starting background generation...' 
                    : 'Generation will run in the background. You can leave and return anytime.'
                  }
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