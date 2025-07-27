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
      if (!user.user) {
        // User not authenticated - skip saving but don't throw error
        console.log('User not authenticated, skipping conversation save');
        return null;
      }

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
      // Skip if no conversation ID (user not authenticated)
      if (!conversationId) {
        console.log('No conversation ID, skipping message save');
        return true;
      }

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

  const getConversationMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return [];
    }
  }, []);

  const getActiveConversation = useCallback(async (assistantId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('assistant_id', assistantId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting active conversation:', error);
      return null;
    }
  }, []);

  return {
    saveConversation,
    saveMessage,
    getConversationByThreadId,
    updateConversationStatus,
    getConversationMessages,
    getActiveConversation,
  };
};