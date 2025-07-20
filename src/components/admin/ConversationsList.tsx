import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, MessageSquare, Calendar, User } from 'lucide-react';

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
  message_count: number;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationsList = ({ onSelectConversation }: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching conversations:', error);
          return;
        }

        // Get message counts and profile data for each conversation
        const conversationsWithCounts = await Promise.all(
          (data || []).map(async (conv) => {
            const { count } = await supabase
              .from('conversation_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id);

            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, name')
              .eq('id', conv.user_id)
              .single();
            
            return {
              ...conv,
              message_count: count || 0,
              profiles: profileData
            };
          })
        );

        setConversations(conversationsWithCounts);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return <div>Loading conversations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          All Conversations ({conversations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {conversation.profiles?.name || conversation.profiles?.email || 'Unknown User'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({conversation.profiles?.email})
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong>Status:</strong> {conversation.status}
                  </div>
                  <div>
                    <strong>Messages:</strong> {conversation.message_count}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <strong>Created:</strong> {new Date(conversation.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <strong>Updated:</strong> {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <div><strong>Thread ID:</strong> <span className="font-mono">{conversation.thread_id}</span></div>
                  <div><strong>Assistant:</strong> <span className="font-mono">{conversation.assistant_id}</span></div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectConversation(conversation.id)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View Chat
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};