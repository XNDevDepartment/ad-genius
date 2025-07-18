import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, User, Bot, Calendar, Image } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: any;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  thread_id: string;
  assistant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string;
    name: string | null;
  } | null;
}

interface ConversationViewerProps {
  conversationId: string;
  onBack: () => void;
}

export const ConversationViewer = ({ conversationId, onBack }: ConversationViewerProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversationData = async () => {
      try {
        // Fetch conversation details
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Error fetching conversation:', convError);
          return;
        }

        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', convData.user_id)
          .single();

        setConversation({
          ...convData,
          profiles: profileData
        });

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          return;
        }

        setMessages(messagesData || []);
      } catch (error) {
        console.error('Error fetching conversation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [conversationId]);

  const renderMessageContent = (message: Message) => {
    // Check if content contains image data
    if (message.content.includes('data:image/') || message.content.includes('.jpg') || message.content.includes('.png')) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="w-4 h-4" />
            Image content
          </div>
          {message.content.includes('data:image/') ? (
            <img 
              src={message.content} 
              alt="Generated content" 
              className="max-w-xs rounded-lg border"
            />
          ) : (
            <div className="text-sm bg-muted p-2 rounded">
              {message.content}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap">
        {message.content}
      </div>
    );
  };

  if (loading) {
    return <div>Loading conversation...</div>;
  }

  if (!conversation) {
    return <div>Conversation not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Conversations
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Conversation Details</h2>
          <p className="text-muted-foreground">
            {conversation.profiles?.name || conversation.profiles?.email || 'Unknown User'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversation Info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <strong>User:</strong> {conversation.profiles?.email}
            {conversation.profiles?.name && ` (${conversation.profiles.name})`}
          </div>
          <div>
            <strong>Status:</strong> {conversation.status}
          </div>
          <div>
            <strong>Created:</strong> {new Date(conversation.created_at).toLocaleString()}
          </div>
          <div>
            <strong>Updated:</strong> {new Date(conversation.updated_at).toLocaleString()}
          </div>
          <div className="md:col-span-2">
            <strong>Thread ID:</strong> <span className="font-mono text-sm">{conversation.thread_id}</span>
          </div>
          <div className="md:col-span-2">
            <strong>Assistant ID:</strong> <span className="font-mono text-sm">{conversation.assistant_id}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-secondary" />
                  )}
                  <span className="font-medium capitalize">{message.role}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                </div>
                
                <div className="text-sm">
                  {renderMessageContent(message)}
                </div>

                {message.metadata && Object.keys(message.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Metadata
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(message.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};