import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles } from "lucide-react";

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
}

export const ConversationInterface = ({
  isStarted,
  isLoading,
  currentQuestion,
  messages,
  onStart,
  onAnswer,
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

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Assistant Conversation
        </CardTitle>
        <CardDescription>
          Start the conversation to create your perfect UGC content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <>
            {/* Messages History */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.type === 'question'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-secondary/50 border border-border/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.type === 'question' ? 'AI Assistant' : 'You'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Current Question</span>
                </div>
                <p className="text-sm">{currentQuestion}</p>
              </div>
            )}

            {/* Answer Input */}
            <div className="space-y-3">
              <Textarea
                placeholder="Type your answer here..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={3}
                className="resize-none"
                disabled={isLoading || !currentQuestion}
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isLoading || !currentQuestion}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Answer
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};