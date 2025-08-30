import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  type: 'generated' | 'ugc';
}

export const useRecentImages = (limit: number = 10) => {
  const [images, setImages] = useState<RecentImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setImages([]);
      setLoading(false);
      return;
    }

    const fetchRecentImages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from both tables in parallel with retry logic
        const fetchWithRetry = async (query: any, retries = 2): Promise<any> => {
          for (let i = 0; i <= retries; i++) {
            const result = await query;
            if (!result.error) return result;
            if (i === retries) throw result.error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        };

        const [generatedResult, ugcResult] = await Promise.all([
          fetchWithRetry(
            supabase
              .from('generated_images')
              .select('id, public_url, prompt, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(limit)
          ),
          fetchWithRetry(
            supabase
              .from('ugc_images')
              .select('id, public_url, prompt, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(limit)
          )
        ]);

        // Combine and normalize the results
        const combinedImages: RecentImage[] = [
          ...(generatedResult.data || []).map((img: any) => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            created_at: img.created_at,
            type: 'generated' as const
          })),
          ...(ugcResult.data || []).map((img: any) => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            created_at: img.created_at,
            type: 'ugc' as const
          }))
        ];

        // Sort by created_at and take the most recent
        const sortedImages = combinedImages
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);

        setImages(sortedImages);
      } catch (err) {
        console.error('Error fetching recent images:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch recent images');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is fully loaded
    const timer = setTimeout(() => {
      fetchRecentImages();
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id, limit]);

  return { images, loading, error };
};