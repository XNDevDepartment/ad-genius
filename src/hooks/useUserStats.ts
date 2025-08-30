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

        // Fetch all stats in parallel
        const [
          generatedImagesResult,
          ugcImagesResult,
          generatedImagesThisMonthResult,
          ugcImagesThisMonthResult,
          favoritesResult
        ] = await Promise.all([
          supabase
            .from('generated_images')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('ugc_images')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('generated_images')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('ugc_images')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('image_favorites')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);

        if (generatedImagesResult.error) throw generatedImagesResult.error;
        if (ugcImagesResult.error) throw ugcImagesResult.error;
        if (generatedImagesThisMonthResult.error) throw generatedImagesThisMonthResult.error;
        if (ugcImagesThisMonthResult.error) throw ugcImagesThisMonthResult.error;
        if (favoritesResult.error) throw favoritesResult.error;

        const totalImages = (generatedImagesResult.count || 0) + (ugcImagesResult.count || 0);
        const imagesThisMonth = (generatedImagesThisMonthResult.count || 0) + (ugcImagesThisMonthResult.count || 0);
        const favoritesCount = favoritesResult.count || 0;

        setStats({
          totalImages,
          imagesThisMonth,
          favoritesCount,
          creditsBalance: remainingCredits,
          creditsUsed: getUsedCredits(),
          totalCredits: getTotalCredits()
        });
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user, remainingCredits, getUsedCredits, getTotalCredits]);

  return { stats, loading, error };
};