
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles, RotateCcw } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface ConversationInterfaceProps {
  isStarted: boolean;
  isLoading: boolean;
  currentQuestion: string | null;
  messages: Message[];
  onStart: () => void;
  onAnswer: (answer: string) => void;
  answer: string;
  setAnswer: (answer: string) => void;
  expectImage: boolean;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  settings: any;
  setSettings: (settings: any) => void;
  isConversationCompleted?: boolean;
  onRestartConversation?: () => void;
}

export const ConversationInterface = ({
  isStarted,
  isLoading,
  currentQuestion,
  messages,
  onStart,
  onAnswer,
  expectImage,
  attachedFile,
  setAttachedFile,
  settings,
  setSettings,
  isConversationCompleted = false,
  onRestartConversation
}: ConversationInterfaceProps) => {
  const [currentAnswer, setCurrentAnswer] = useState("");
  const isMobile = useIsMobile();

  const handleSubmitAnswer = () => {
    if (currentAnswer.trim() || attachedFile) {
      onAnswer(currentAnswer.trim());
      setCurrentAnswer("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      const el = chatContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, currentQuestion, isLoading]);

  return (
    <div className="w-full h-full flex justify-center px-2 sm:px-4">
      <Card className="bg-gradient-card border-border/50 w-full max-w-none h-full flex flex-col">
      <CardHeader className="flex-none pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Conversa com Assistente IA
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Inicie a conversa para criar seu conteúdo UGC perfeito
            </CardDescription>
          </div>
          {isStarted && onRestartConversation && (
            <Button variant="ghost" onClick={onRestartConversation} size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reiniciar Conversa</span>
              <span className="sm:hidden">Reiniciar</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-2 sm:p-4">
        {!isStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-3 sm:mb-4">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base px-4">
              Pronto para criar conteúdo UGC incrível? Deixe o assistente IA te guiar pelo processo.
            </p>
            <Button onClick={onStart} className="gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Iniciar Conversa
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            {/* Chat Messages - Optimized for Mobile */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 border rounded-lg p-2 sm:p-3 bg-muted/20 mb-3 min-h-0"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`${
                      isMobile 
                        ? 'max-w-[85%]' 
                        : 'max-w-[80%] lg:max-w-[70%]'
                    } p-2 sm:p-3 rounded-lg text-sm ${
                      message.type === 'question'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground ml-auto'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.type === 'question' ? 'Assistente IA' : 'Você'} • {message.timestamp.toLocaleTimeString()}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className={`${isMobile ? 'max-w-[85%]' : 'max-w-[80%]'} p-3 rounded-lg bg-muted text-foreground`}>
                    <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                      <Sparkles className="h-3 w-3 animate-spin" />
                      Assistente IA está pensando...
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="border rounded-lg p-2 sm:p-3 bg-background">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={isMobile ? 3 : 2}
                className="border-0 p-0 resize-none focus-visible:ring-0 shadow-none text-sm"
                disabled={isLoading || !currentQuestion}
              />

              {/* {expectImage && ( */}
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                    className="text-xs file:mr-2 file:px-2 file:py-1 file:rounded-md
                              file:border file:bg-secondary file:text-foreground cursor-pointer"
                  />
                  {attachedFile && (
                    <span className="truncate text-xs text-muted-foreground">
                      {attachedFile.name}
                    </span>
                  )}
                </div>
              {/* )} */}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Minimized Settings Panel */}
                  <SettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitAnswer}
                    disabled={(!currentAnswer.trim() || isLoading || (!currentQuestion && !isConversationCompleted)) && !attachedFile}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isConversationCompleted ? 'Continuar' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
