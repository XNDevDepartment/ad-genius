import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';

export interface UserStats {
  totalImages: number;
  imagesThisMonth: number;
  favoritesCount: number;
  creditsBalance: number;
  creditsUsed: number;
  totalCredits: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>({
    totalImages: 0,
    imagesThisMonth: 0,
    favoritesCount: 0,
    creditsBalance: 0,
    creditsUsed: 0,
    totalCredits: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { remainingCredits, getUsedCredits, getTotalCredits } = useCredits();

  useEffect(() => {
    if (!user) {
      setStats({
        totalImages: 0,
        imagesThisMonth: 0,
        favoritesCount: 0,
        creditsBalance: 0,
        creditsUsed: 0,
        totalCredits: 0
      });
      setLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Fetch with retry logic
        const fetchWithRetry = async (query: any, retries = 2): Promise<any> => {
          for (let i = 0; i <= retries; i++) {
            const result = await query;
            if (!result.error) return result;
            if (i === retries) throw result.error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        };

        // Fetch all stats in parallel with retry
        const [
          generatedImagesResult,
          ugcImagesResult,
          generatedImagesThisMonthResult,
          ugcImagesThisMonthResult,
          favoritesResult
        ] = await Promise.all([
          fetchWithRetry(
            supabase
              .from('generated_images')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
          ),
          fetchWithRetry(
            supabase
              .from('ugc_images')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
          ),
          fetchWithRetry(
            supabase
              .from('generated_images')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .gte('created_at', startOfMonth.toISOString())
          ),
          fetchWithRetry(
            supabase
              .from('ugc_images')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .gte('created_at', startOfMonth.toISOString())
          ),
          fetchWithRetry(
            supabase
              .from('image_favorites')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
          )
        ]);

        const totalImages = (generatedImagesResult.count || 0) + (ugcImagesResult.count || 0);
        const imagesThisMonth = (generatedImagesThisMonthResult.count || 0) + (ugcImagesThisMonthResult.count || 0);
        const favoritesCount = favoritesResult.count || 0;

        setStats({
          totalImages,
          imagesThisMonth,
          favoritesCount,
          creditsBalance: remainingCredits || 0,
          creditsUsed: getUsedCredits() || 0,
          totalCredits: getTotalCredits() || 0
        });
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user statistics');
        
        // Set fallback stats with credit data if available
        setStats({
          totalImages: 0,
          imagesThisMonth: 0,
          favoritesCount: 0,
          creditsBalance: remainingCredits || 0,
          creditsUsed: getUsedCredits() || 0,
          totalCredits: getTotalCredits() || 0
        });
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is fully loaded
    const timer = setTimeout(() => {
      fetchUserStats();
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id, remainingCredits, getUsedCredits, getTotalCredits]);

  return { stats, loading, error };
};