import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationInterface } from "./ugc/ConversationInterface";
import { SettingsPanel, ImageSettings } from "./ugc/SettingsPanel";
import { ProgressTimeline, TimelineStep } from "./ugc/ProgressTimeline";
import { GeneratedImages, GeneratedImage } from "./ugc/GeneratedImages";
import { startConversationAPI } from '../../api/OpenAiClient'

const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC

interface Message {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface UGCCreatorProps {
  onBack: () => void;
}

export const UGCCreator = ({ onBack }: UGCCreatorProps) => {
  const [threadId, setThreadId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [settings, setSettings] = useState<ImageSettings>({
    size: '1024x1024',
    quality: 'medium',
    numberOfImages: 1,
    format: 'png',
  });

  const { toast } = useToast();

  const timelineSteps: TimelineStep[] = [
    { id: 'start', label: 'Start Conversation', status: isStarted ? 'completed' : 'pending' },
    { id: 'questions', label: 'Answer Questions', status: messages.length > 0 ? (currentQuestion ? 'current' : 'completed') : 'pending' },
    { id: 'generate', label: 'Generate Images', status: generatedImages.length > 0 ? 'completed' : (isGeneratingImages ? 'current' : 'pending') },
  ];

  const currentStepIndex = timelineSteps.findIndex(step => step.status === 'current');

  const handleStart = async () => {
    try {
      setIsLoading(true);
      const { threadId: id, reply } = await startConversationAPI(assistantId); // rename p/ evitar sombra
      setThreadId(id);
      setCurrentQuestion(reply);
      setIsStarted(true);
    } catch (e) {
      toast({
        title: "Failed to Start",
        description: e.message,
        variant: "destructive"
      });
    }finally {
      setIsLoading(false);
    }
  };

  // const handleStart = async () => {
  //   setIsLoading(true);
  //   try {
  //     // Simulate API call to OpenAI assistant to get first question
  //     await new Promise(resolve => setTimeout(resolve, 1500));

  //     const firstQuestion = "What type of product are you looking to create UGC content for? Please describe it in detail.";
  //     setCurrentQuestion(firstQuestion);
  //     setIsStarted(true);

  //     toast({
  //       title: "Conversation Started",
  //       description: "The AI assistant is ready to help you create amazing UGC content.",
  //     });
  //   } catch (error) {
  //     toast({
  //       title: "Failed to Start",
  //       description: "Something went wrong. Please try again.",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  /* ---------- enviar resposta (texto + opcional imagem) ---------- */
  const handleAnswer = async () => {
    // …
    try {
      setIsLoading(true);

      // 1) Validação e upload
      // let fileId = null;
      // if (attachedFile) {
      //   fileId = await uploadFile(attachedFile);
      // }
  
      // 2) Envia ao assistant
      const content = [];
      if (answer.trim()) content.push({ type: 'text', text: answer.trim() });
      // if (fileId)       content.push({ type: 'image_file', image_file: { file_id: fileId } });
      // const reply = await converse(threadId, content, params.assistantId);
  
      // 3) Limpa input
      setAnswer('');
  
      // 4) Detecta prompt
      // if (reply.includes('GENERATE_PROMPT:')) {
      //   const cleaned = reply.replace(/\*/g, '');
      //   const prompt  = cleaned.split(':')[1].trim();

      //   // Usa always attachedFile directly
      //   // const imgs = attachedFile
      //   //   ? await generateImagesFromBase(attachedFile, prompt, 3)
      //   //   : await generateImages(prompt, 3);
      //   //  const imgs = await generateImagesFromBase(attachedFile, prompt, 1)

      //   // setImages(imgs);
      //   setCurrentQuestion('');
      //   // setExpectImage(false);
      // } else {
      //   setCurrentQuestion(reply);
        // setExpectImage(/envia.*imagem/i.test(reply));
      // }
    } catch (err) {
      toast(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  // const handleAnswer = async (answer: string) => {
  //   if (!currentQuestion) return;

  //   setIsLoading(true);

  //   // Add the current question and answer to messages
  //   const questionMessage: Message = {
  //     id: `q-${Date.now()}`,
  //     type: 'question',
  //     content: currentQuestion,
  //     timestamp: new Date(),
  //   };

  //   const answerMessage: Message = {
  //     id: `a-${Date.now()}`,
  //     type: 'answer',
  //     content: answer,
  //     timestamp: new Date(),
  //   };

  //   setMessages(prev => [...prev, questionMessage, answerMessage]);

  //   try {
  //     // Simulate API call to OpenAI assistant
  //     await new Promise(resolve => setTimeout(resolve, 2000));

  //     // Determine next question or finish conversation
  //     const nextQuestions = [
  //       "What style of UGC content do you want? (lifestyle, professional, casual, artistic, etc.)",
  //       "Who is your target audience and what mood should the content convey?",
  //       "Any specific colors, themes, or elements you want to include or avoid?",
  //     ];

  //     const currentMessageCount = messages.length / 2; // Divide by 2 since each exchange adds 2 messages

  //     if (currentMessageCount < nextQuestions.length) {
  //       setCurrentQuestion(nextQuestions[currentMessageCount]);
  //     } else {
  //       // Conversation complete, generate images
  //       setCurrentQuestion(null);
  //       await generateImages();
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "Processing Failed",
  //       description: "Something went wrong. Please try again.",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const generateImages = async () => {
    setIsGeneratingImages(true);

    try {
      // Simulate API call to image generation service
      await new Promise(resolve => setTimeout(resolve, 4000));

      const newImages: GeneratedImage[] = Array.from({ length: settings.numberOfImages }, (_, i) => ({
        id: `img-${Date.now()}-${i}`,
        url: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=400&fit=crop", // Placeholder
        prompt: "Generated UGC content based on your conversation",
        timestamp: new Date(),
      }));

      setGeneratedImages(newImages);

      toast({
        title: "Images Generated!",
        description: `Successfully created ${settings.numberOfImages} UGC image${settings.numberOfImages > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 w-fit">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <Image className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">UGC Creator</h1>
            <p className="text-sm lg:text-base text-muted-foreground">AI-powered conversation to create perfect UGC content</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Generated Images */}
        <GeneratedImages
          images={generatedImages}
          isGenerating={isGeneratingImages}
        />

        {/* Progress Timeline */}
        <ProgressTimeline
          steps={timelineSteps}
          currentStepIndex={currentStepIndex >= 0 ? currentStepIndex : 0}
        />

        {/* Conversation Interface */}
        <ConversationInterface
          isStarted={isStarted}
          isLoading={isLoading}
          currentQuestion={currentQuestion}
          messages={messages}
          onStart={handleStart}
          onAnswer={handleAnswer}
        />
      </div>

      {/* Floating Settings Panel */}
      <SettingsPanel
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
};