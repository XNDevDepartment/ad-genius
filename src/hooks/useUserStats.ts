import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
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

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Fetch all stats in parallel
        const [
          generatedImagesResult,
          ugcImagesResult,
          generatedImagesThisMonthResult,
          ugcImagesThisMonthResult,
          favoritesResult,
          subscriberResult
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
            .eq('user_id', user.id),
          supabase
            .from('subscribers')
            .select('credits_balance')
            .eq('user_id', user.id)
            .single()
        ]);

        const totalImages = (generatedImagesResult.count || 0) + (ugcImagesResult.count || 0);
        const imagesThisMonth = (generatedImagesThisMonthResult.count || 0) + (ugcImagesThisMonthResult.count || 0);
        const favoritesCount = favoritesResult.count || 0;
        const creditsBalance = subscriberResult.data?.credits_balance || 0;

        setStats({
          totalImages,
          imagesThisMonth,
          favoritesCount,
          creditsBalance,
          creditsUsed: 0,
          totalCredits: creditsBalance
        });
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user statistics');

        setStats({
          totalImages: 0,
          imagesThisMonth: 0,
          favoritesCount: 0,
          creditsBalance: 0,
          creditsUsed: 0,
          totalCredits: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return { stats, loading, error };
};