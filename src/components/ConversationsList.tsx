import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
// import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  thread_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  conversation_messages?: Array<{
    content: string;
    role: string;
  }>;
  messages?: Array<{
    content: string;
    role: string;
  }>;
}

interface ConversationsListProps {
  onSelectConversation: (threadId: string) => void;
  onNewConversation: () => void;
  currentThreadId?: string;
}

export const ConversationsList = ({ 
  onSelectConversation, 
  onNewConversation, 
  currentThreadId 
}: ConversationsListProps) => {
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
          conversation_messages!inner(content, role)
        `)
        .eq('user_id', user?.id)
        .eq('assistant_id', import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC || 'ugc_creator')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const conversationsWithMessages = data?.map(conv => ({
        ...conv,
        messages: conv.conversation_messages?.slice(0, 1)
      })) || [];

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConversationPreview = (conversation: Conversation) => {

    const  firstUserMessage = conversation.conversation_messages?.find(m => m.role === 'user');
    if(firstUserMessage) return firstUserMessage?.content?.slice(0, 50) + '...' || 'Nova conversa';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="font-medium">Conversas</span>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onNewConversation}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma conversa encontrada
            </div>
          ) : (
            conversations.map((conversation) => {
              if(getConversationPreview(conversation)) return(
              <div
                key={conversation.id}
                className={cn(
                  " rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50",
                  currentThreadId === conversation.thread_id 
                    ? "bg-primary/10 border-primary/30" 
                    : "border-border"
                )}
                onClick={() => onSelectConversation(conversation.thread_id)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium line-clamp-2 flex-1">
                      {getConversationPreview(conversation)}
                    </p>
                    {/* <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-2 text-xs",
                        conversation.status === 'active' 
                          ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                          : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                      )}
                    >
                      {conversation.status === 'active' ? 'Ativa' : 'Pausada'}
                    </Badge> */}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.updated_at), { 
                      addSuffix: true, 
                      // locale: ptBR 
                    })}
                  </p>
                </div>
              </div>
            )})
          )}
        </div>
      </ScrollArea>
    </div>
  );
};