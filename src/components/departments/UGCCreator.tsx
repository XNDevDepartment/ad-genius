import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationInterface } from "./ugc/ConversationInterface";
import { SettingsPanel, ImageSettings } from "./ugc/SettingsPanel";
import { ProgressTimeline, TimelineStep } from "./ugc/ProgressTimeline";
import { GeneratedImages, GeneratedImage } from "./ugc/GeneratedImages";
import { startConversationAPI, uploadFile, converse, generateImagesFromBase } from '../../api/OpenAiClient'

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
  const [attachedFile, setAttachedFile] = useState(null);
  const [expectImage, setExpectImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
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

      if (!reply?.trim()) return;
      const now = new Date();
      const questionMsg: Message = {
        id: `q-${now.getTime()}`,
        type: "question",
        content: reply,
        timestamp: now,
      };
      setMessages((prev) => [...prev, questionMsg]);

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
  const handleAnswer = async (answer: string) => {

    if (!currentQuestion?.trim()) return;

    /* -----------------------------------------------------------------------
     * 1) Immediately mirror the finished exchange in <ConversationInterface />
     * --------------------------------------------------------------------- */
    const now = new Date();
    const answerMsg: Message = {
      id: `a-${now.getTime()}`,
      type: "answer",
      content: answer.trim(),
      timestamp: now,
    };
    setMessages((prev) => [...prev, answerMsg]);

    try {
      setIsLoading(true);

      // 1) Validação e upload
      let fileId = null;
      if (attachedFile) {
         fileId = await uploadFile(attachedFile);
      }

      // 2) Envia ao assistant
      const content = [];
      if (answer.trim()) content.push({ type: 'text', text: answer.trim() });
      if (fileId)       content.push({ type: 'image_file', image_file: { file_id: fileId } });
      const reply = await converse(threadId, content, assistantId);

      // 4) Detecta prompt
      if (reply.includes('GENERATE_PROMPT:')) {
        const cleaned = reply.replace(/\*/g, '');
        const prompt  = cleaned.split(':')[1].trim();

        //Usa always attachedFile directly
        //   // const imgs = attachedFile
        //   //   ? await generateImagesFromBase(attachedFile, prompt, 3)
        //   //   : await generateImages(prompt, 3);
        setIsGeneratingImages(true);
        const imgs = await generateImagesFromBase(attachedFile, prompt)

        setGeneratedImages(imgs);
        setCurrentQuestion('');
        setExpectImage(false);
      } else {
        setCurrentQuestion(reply);
        setExpectImage(/envia.*imagem/i.test(reply));
      }


      if (!reply?.trim()) return;

      const now = new Date();
      const questionMsg: Message = {
        id: `q-${now.getTime()}`,
        type: "question",
        content: reply,
        timestamp: now,
      };
      setMessages((prev) => [...prev, questionMsg]);

      // 3) Limpa input
      setAnswer('');


    } catch (err) {
      toast(err.message);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setIsGeneratingImages(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
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
      <div className="max-w-7xl mx-auto space-y-6 h-full w-full align-bottom justify-end">




        {/* Conversation Interface */}
        <ConversationInterface
          isStarted={isStarted}
          isLoading={isLoading}
          currentQuestion={currentQuestion}
          messages={messages}
          answer={answer}
          setAnswer={setAnswer}
          onStart={handleStart}
          onAnswer={handleAnswer}
          expectImage={expectImage}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          settings={settings}
          setSettings={setSettings}
        />

        {/* Progress Timeline */}
        {/* <ProgressTimeline
          steps={timelineSteps}
          currentStepIndex={currentStepIndex >= 0 ? currentStepIndex : 0}
        /> */}



        {/* Generated Images */}
        <GeneratedImages
          images={generatedImages}
          isGenerating={isGeneratingImages}
        />
      </div>

    </div>
  );
};