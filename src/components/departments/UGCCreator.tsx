
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationInterface } from "./ugc/ConversationInterface";
import { SettingsPanel, ImageSettings } from "./ugc/SettingsPanel";
import { ProgressTimeline, TimelineStep } from "./ugc/ProgressTimeline";
import { GeneratingImagePlaceholders } from "./ugc/GeneratingImagePlaceholders";
import { GeneratedImagesDisplay } from "./ugc/GeneratedImagesDisplay";
import { ErrorBoundary } from "./ugc/ErrorBoundary";
import { useSecureImageStorage } from "./ugc/SecureImageStorage";
import { useConversationStorage } from "@/hooks/useConversationStorage";
import { startConversationAPI, uploadFile, converse, generateImagesFromBase } from '../../api/SecureOpenAiClient';

const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC;

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
  const [isConversationCompleted, setIsConversationCompleted] = useState(false);
  const [settings, setSettings] = useState<ImageSettings>({
    size: '1024x1024',
    quality: 'high',
    numberOfImages: 2,
    format: 'png',
  });

  const { toast } = useToast();
  const { saveImages } = useSecureImageStorage();
  const { saveConversation, saveMessage, updateConversationStatus, getConversationMessages, getActiveConversation } = useConversationStorage();

  // Load conversation on mount
  useEffect(() => {
    const loadActiveConversation = async () => {
      try {
        const activeConversation = await getActiveConversation(assistantId);
        if (activeConversation) {
          setThreadId(activeConversation.thread_id);
          setConversationId(activeConversation.id);
          setIsStarted(true);
          
          // Load messages
          const dbMessages = await getConversationMessages(activeConversation.id);
          const convertedMessages: Message[] = dbMessages.map(msg => ({
            id: msg.id,
            type: msg.role === 'assistant' ? 'question' : 'answer',
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          
          setMessages(convertedMessages);
          
          // If conversation is ongoing, set up for next question
          if (activeConversation.status === 'active') {
            const lastMessage = convertedMessages[convertedMessages.length - 1];
            if (lastMessage?.type === 'question' && !lastMessage.content.includes('GENERATE_PROMPT:')) {
              setCurrentQuestion(lastMessage.content);
            }
          }
        }
      } catch (error) {
        console.error('Error loading active conversation:', error);
      }
    };

    loadActiveConversation();
  }, [assistantId, getActiveConversation, getConversationMessages]);

  const timelineSteps: TimelineStep[] = [
    { id: 'start', label: 'Start Conversation', status: isStarted ? 'completed' : 'pending' },
    { id: 'questions', label: 'Answer Questions', status: messages.length > 0 ? (currentQuestion && !isConversationCompleted ? 'current' : 'completed') : 'pending' },
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

        // Save conversation to database
        const conversation = await saveConversation({ threadId: id, assistantId });
        if (conversation) {
          setConversationId(conversation.id);
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

        // Save assistant message to database
        if (conversation) {
          await saveMessage({
            conversationId: conversation.id,
            role: 'assistant',
            content: reply,
          });
        }
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

    // Save user message to database
    if (conversationId) {
      await saveMessage({
        conversationId,
        role: 'user',
        content: answer.trim(),
        metadata: attachedFile ? { hasFile: true, fileName: attachedFile.name } : {},
      });
    }

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
        // First, display the assistant's message to the user
        const now = new Date();
        const assistantMsg: Message = {
          id: `q-${now.getTime()}`,
          type: "question",
          content: reply,
          timestamp: now,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Save assistant message to database
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'assistant',
            content: reply,
          });
        }

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

          // Handle the image response
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

          // Save to secure storage
          if (images.length > 0) {
            await saveImages({
              base64Images: images,
              prompt,
              settings: { ...settings }
            });

            toast({
              title: "Images Generated!",
              description: `${images.length} image(s) generated and saved to your library.`,
            });

            // Scroll to generated images after a short delay
            setTimeout(() => {
              const element = document.getElementById('generated-images');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 500);

            // Automatically call assistant with "Imagem pronta" after successful generation
            try {
              const completionReply = await converse(threadId, [{ type: 'text', text: 'Imagem pronta' }], assistantId);
              
              if (typeof completionReply === 'string') {
                setCurrentQuestion(completionReply);
                
                const completionMsg: Message = {
                  id: `q-${Date.now() + 1}`,
                  type: "question",
                  content: completionReply,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, completionMsg]);

                // Save assistant completion message to database
                if (conversationId) {
                  await saveMessage({
                    conversationId,
                    role: 'assistant',
                    content: completionReply,
                  });
                }
              }
            } catch (completionError) {
              console.error('Error calling assistant after image completion:', completionError);
              // Fallback to original behavior
              setCurrentQuestion("Great! Your images have been generated successfully. You can continue the conversation if you need any adjustments, or start a new conversation to create different UGC content.");
            }
          }
          
          setExpectImage(false);
          // Don't mark conversation as completed - keep it active for continuation
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

        // Save assistant message to database
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: 'assistant',
            content: reply,
          });
        }
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

  const handleViewLibrary = () => {
    onBack(); // Go back to dashboard first
    // The user can then navigate to library from dashboard
  };

  const handleRestartConversation = async () => {
    // Update current conversation status to completed
    if (conversationId) {
      await updateConversationStatus(conversationId, 'completed');
    }

    // Reset all conversation state
    setThreadId(null);
    setConversationId(null);
    setIsStarted(false);
    setCurrentQuestion(null);
    setMessages([]);
    setAttachedFile(null);
    setExpectImage(false);
    setGeneratedImages([]);
    setIsGeneratingImages(false);
    setIsConversationCompleted(false);
    setAnswer('');

    toast({
      title: "Conversation Reset",
      description: "You can now start a new conversation.",
    });
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen md:p-2 lg:p-4">
        {/* Header - Mobile optimized */}
        <div className="flex-none p-2 sm:p-4 border-b md:border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onBack} className="gap-2 w-fit p-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
                <Image className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold">UGC Creator</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">AI-powered conversation to create perfect UGC content</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Full width layout */}
        <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4 gap-4 max-w-none w-full">
          {/* Conversation Interface - Fixed height, full width */}
          <div className="h-full min-h-[400px] w-full">
            <ConversationInterface
              isStarted={isStarted}
              isLoading={isLoading}
              currentQuestion={currentQuestion}
              messages={messages.filter(message => !message.content.includes("GENERATE_PROMPT"))}
              answer={answer}
              setAnswer={setAnswer}
              onStart={handleStart}
              onAnswer={handleAnswer}
              expectImage={expectImage}
              attachedFile={attachedFile}
              setAttachedFile={setAttachedFile}
              settings={settings}
              setSettings={setSettings}
              isConversationCompleted={isConversationCompleted}
              onRestartConversation={handleRestartConversation}
            />
          </div>

          {/* Generating Images Placeholders */}
          {isGeneratingImages && (
            <div className="flex-none w-full">
              <GeneratingImagePlaceholders numberOfImages={settings.numberOfImages} />
            </div>
          )}

          {/* Generated Images Display */}
          {generatedImages.length > 0 && (
            <div className="flex-none w-full">
              <GeneratedImagesDisplay 
                images={generatedImages}
                onViewLibrary={handleViewLibrary}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};
