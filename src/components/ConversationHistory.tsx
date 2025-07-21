import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, ArrowLeft, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  thread_id: string;
  assistant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages?: Array<{
    content: string;
    role: string;
    created_at: string;
  }>;
}

interface ConversationHistoryProps {
  onBack: () => void;
  onSelectConversation: (threadId: string) => void;
}

export const ConversationHistory = ({ onBack, onSelectConversation }: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_messages!inner(content, role, created_at)
        `)
        .eq('user_id', user?.id)
        .eq('assistant_id', import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC || 'ugc_creator')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationsWithMessages = data?.map(conv => ({
        ...conv,
        messages: conv.conversation_messages?.slice(0, 2) // Show first 2 messages as preview
      })) || [];

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConversationPreview = (conversation: Conversation) => {
    const firstUserMessage = conversation.messages?.find(m => m.role === 'user');
    return firstUserMessage?.content || 'Nova conversa';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'completed': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Conversas</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Conversas</h1>
            <p className="text-muted-foreground">Retome suas conversas anteriores com o Criador UGC</p>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4 max-w-4xl">
          {conversations.length === 0 ? (
            <Card className="text-center p-8">
              <CardContent>
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conversa encontrada</h3>
                <p className="text-muted-foreground">
                  Você ainda não iniciou nenhuma conversa com o Criador UGC.
                </p>
              </CardContent>
            </Card>
          ) : (
            conversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="group hover:shadow-elegant transition-all duration-300 cursor-pointer"
                onClick={() => onSelectConversation(conversation.thread_id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {getConversationPreview(conversation)}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(conversation.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(conversation.updated_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(conversation.status)}>
                      {conversation.status === 'active' ? 'Ativa' : 'Concluída'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Mensagens: {conversation.messages?.length || 0}
                    </div>
                    {conversation.messages && conversation.messages.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm line-clamp-2">
                          {conversation.messages[0]?.content}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};