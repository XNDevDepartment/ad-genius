import { useEffect } from 'react';
import { updateGeminiConversationContext } from '@/api/gemini-chat';

/**
 * Hook to sync conversation context with changes in niche and audience
 */
export const useGeminiConversationSync = (
  conversationId: string | null,
  niche: string,
  audience: string,
  imageUrl?: string
) => {
  useEffect(() => {
    if (!conversationId) return;

    const syncContext = async () => {
      try {
        await updateGeminiConversationContext(
          conversationId,
          imageUrl,
          niche || undefined,
          audience || undefined
        );
        console.log('Gemini conversation context updated');
      } catch (error) {
        console.error('Failed to sync conversation context:', error);
      }
    };

    // Debounce context updates to avoid too many API calls
    const timeoutId = setTimeout(syncContext, 1000);
    return () => clearTimeout(timeoutId);
  }, [conversationId, niche, audience, imageUrl]);
};