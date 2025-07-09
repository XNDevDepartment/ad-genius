
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

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
  answer,
  setAnswer,
  expectImage: boolean;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  settings,
  setSettings
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
  setSettings
}: ConversationInterfaceProps) => {
  const [currentAnswer, setCurrentAnswer] = useState("");

  const handleSubmitAnswer = () => {
    if (currentAnswer.trim()) {
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
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Assistant Conversation
        </CardTitle>
        <CardDescription>
          Start the conversation to create your perfect UGC content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isStarted ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-6">
              Ready to create amazing UGC content? Let the AI assistant guide you through the process.
            </p>
            <Button onClick={onStart} className="gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Start Conversation
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chat Messages - ChatGPT Style */}
            <div ref={chatContainerRef} className="h-[28rem] sm:h-[24rem] overflow-y-auto space-y-4 border rounded-lg p-3 lg:p-4 bg-muted/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[65%] p-2 lg:p-3 rounded-lg text-sm lg:text-base ${
                      message.type === 'question'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground ml-auto'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.type === 'question' ? 'AI Assistant' : 'You'} • {message.timestamp.toLocaleTimeString()}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-muted text-foreground">
                    <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                      <Sparkles className="h-3 w-3 animate-spin" />
                      AI Assistant is thinking...
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

            {/* Input Area - ChatGPT Style */}
            <div className="border rounded-lg p-3 bg-background">
              <Textarea
                placeholder="Type your message..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={2}
                className="border-0 p-0 resize-none focus-visible:ring-0 shadow-none text-sm lg:text-base"
                disabled={isLoading || !currentQuestion}
              />
              
              {expectImage && (
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                    className="text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-md
                              file:border file:bg-secondary file:text-foreground cursor-pointer"
                  />
                  {attachedFile && (
                    <span className="truncate max-w-[10rem] text-xs text-muted-foreground">
                      {attachedFile.name}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <div className="flex items-center gap-2">
                  {/* Minimized Settings Panel */}
                  <SettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim() || isLoading || !currentQuestion}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
