
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationInterface } from "./ugc/ConversationInterface";
import { SettingsPanel, ImageSettings } from "./ugc/SettingsPanel";
import { ProgressTimeline, TimelineStep } from "./ugc/ProgressTimeline";
import { GeneratingImagePlaceholders } from "./ugc/GeneratingImagePlaceholders";
import { ErrorBoundary } from "./ugc/ErrorBoundary";
import { useSecureImageStorage } from "./ugc/SecureImageStorage";
import { startConversationAPI, uploadFile, converse, generateImagesFromBase } from '../../api/SecureOpenAiClient';

const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC;

interface Message {
  id: string;
  type: 'question' | 'answer' | 'images';
  content: string;
  timestamp: Date;
  images?: string[];
}

interface UGCCreatorProps {
  onBack: () => void;
}

export const UGCCreator = ({ onBack }: UGCCreatorProps) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
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
  const { saveImages } = useSecureImageStorage();

  const timelineSteps: TimelineStep[] = [
    { id: 'start', label: 'Start Conversation', status: isStarted ? 'completed' : 'pending' },
    { id: 'questions', label: 'Answer Questions', status: messages.length > 0 ? (currentQuestion ? 'current' : 'completed') : 'pending' },
    { id: 'generate', label: 'Generate Images', status: generatedImages.length > 0 ? 'completed' : (isGeneratingImages ? 'current' : 'pending') },
  ];

  const currentStepIndex = timelineSteps.findIndex(step => step.status === 'current');

  const handleStart = async () => {
    try {
      setIsLoading(true);
      const response = await startConversationAPI(assistantId);
      
      if (response && typeof response === 'object' && 'threadId' in response && 'reply' in response) {
        const { threadId: id, reply } = response as { threadId: string; reply: string };
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
      }

    } catch (e) {
      console.error('Start conversation error:', e);
      toast({
        title: "Failed to Start",
        description: "Unable to start conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion?.trim() || !threadId) return;

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

      let fileId = null;
      if (attachedFile) {
        const uploadResponse = await uploadFile(attachedFile);
        if (typeof uploadResponse === 'string') {
          fileId = uploadResponse;
        }
      }

      const content = [];
      if (answer.trim()) content.push({ type: 'text', text: answer.trim() });
      if (fileId) content.push({ type: 'image_file', image_file: { file_id: fileId } });
      
      const reply = await converse(threadId, content, assistantId);

      if (typeof reply === 'string' && reply.includes('GENERATE_PROMPT:')) {
        const cleaned = reply.replace(/\*/g, '');
        const prompt = cleaned.split(':')[1]?.trim();

        if (prompt && attachedFile) {
          setIsGeneratingImages(true);
          
          setTimeout(() => {
            const element = document.getElementById('generating-images');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);

          const imageResponse = await generateImagesFromBase(
            attachedFile,
            prompt,
            {
              number: settings.numberOfImages,
              quality: settings.quality,
              size: settings.size,
              output_format: settings.format,
            }
          );

          // Properly handle the image response
          let images: string[] = [];
          if (Array.isArray(imageResponse)) {
            images = imageResponse.filter((img): img is string => typeof img === 'string');
          } else if (imageResponse && typeof imageResponse === 'object' && 'images' in imageResponse) {
            const imgArray = (imageResponse as { images: unknown }).images;
            if (Array.isArray(imgArray)) {
              images = imgArray.filter((img): img is string => typeof img === 'string');
            }
          } else {
            images = [];
          }

          setGeneratedImages(images);
          
          // Add generated images to the conversation
          if (images.length > 0) {
            const imagesMessage: Message = {
              id: `imgs-${Date.now()}`,
              type: "images",
              content: `Generated ${images.length} image(s) based on your request.`,
              timestamp: new Date(),
              images: images,
            };
            setMessages((prev) => [...prev, imagesMessage]);
            
            // Save to secure storage
            await saveImages({
              base64Images: images,
              prompt,
              settings: { ...settings }
            });

            toast({
              title: "Images Generated!",
              description: `${images.length} image(s) generated and saved securely.`,
            });
          }
          
          setCurrentQuestion(null);
          setExpectImage(false);
        }

      } else if (typeof reply === 'string') {
        setCurrentQuestion(reply);
        setExpectImage(/envia.*imagem/i.test(reply));

        const now = new Date();
        const questionMsg: Message = {
          id: `q-${now.getTime()}`,
          type: "question",
          content: reply,
          timestamp: now,
        };
        setMessages((prev) => [...prev, questionMsg]);
      }

      setAnswer('');

    } catch (err) {
      console.error('Conversation error:', err);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsGeneratingImages(false);
    }
  };

  return (
    <ErrorBoundary>
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

          {/* Generating Images Placeholders */}
          {isGeneratingImages && (
            <GeneratingImagePlaceholders numberOfImages={settings.numberOfImages} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};
