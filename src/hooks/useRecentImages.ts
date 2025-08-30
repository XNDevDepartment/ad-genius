import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setImages([]);
          setLoading(false);
          return;
        }

        // Fetch from both tables in parallel
        const [generatedResult, ugcResult] = await Promise.all([
          supabase
            .from('generated_images')
            .select('id, public_url, prompt, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('ugc_images')
            .select('id, public_url, prompt, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)
        ]);

        // Handle errors
        if (generatedResult.error) {
          console.error('Error fetching generated images:', generatedResult.error);
        }
        if (ugcResult.error) {
          console.error('Error fetching UGC images:', ugcResult.error);
        }

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

    fetchRecentImages();
  }, [limit]);

  return { images, loading, error };
};