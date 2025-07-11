import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface SaveConversationParams {
  threadId: string;
  assistantId: string;
}

interface SaveMessageParams {
  conversationId: string;
  role: 'assistant' | 'user';
  content: string;
  metadata?: Record<string, any>;
}

export const useConversationStorage = () => {
  const { toast } = useToast();

  const saveConversation = useCallback(async ({ threadId, assistantId }: SaveConversationParams) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.user.id,
          thread_id: threadId,
          assistant_id: assistantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  }, []);

  const saveMessage = useCallback(async ({ conversationId, role, content, metadata = {} }: SaveMessageParams) => {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          metadata,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  }, []);

  const getConversationByThreadId = useCallback(async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('thread_id', threadId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }, []);

  const updateConversationStatus = useCallback(async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating conversation status:', error);
      return false;
    }
  }, []);

  return {
    saveConversation,
    saveMessage,
    getConversationByThreadId,
    updateConversationStatus,
  };
};