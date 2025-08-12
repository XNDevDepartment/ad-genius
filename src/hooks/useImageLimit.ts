import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';

export const useImageLimit = (imageQuality: 'low' | 'medium' | 'high' = 'high') => {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { getRemainingCredits, calculateImageCost } = useCredits();
  const [totalImagesGenerated, setTotalImagesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchImageCount = async () => {
    if (!user) {
      setTotalImagesGenerated(0);
      setLoading(false);
      return;
    }

    try {
      // Only count images generated after August 7th, 2024
      const { count, error } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', '2024-08-07T00:00:00.000Z');

      if (error) {
        console.error('Error fetching image count:', error);
        setTotalImagesGenerated(0);
      } else {
        setTotalImagesGenerated(count || 0);
      }
    } catch (error) {
      console.error('Error fetching image count:', error);
      setTotalImagesGenerated(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImageCount();
  }, [user]);

  const remainingCredits = getRemainingCredits();
  const creditsPerImage = calculateImageCost(imageQuality);
  const remainingImages = isAdmin ? 999 : Math.floor(remainingCredits / creditsPerImage);
  const isAtLimit = !isAdmin && remainingCredits < creditsPerImage;

  const canGenerateImages = (count: number = 1): boolean => {
    if (isAdmin) return true;
    const creditsNeeded = calculateImageCost(imageQuality, count);
    return remainingCredits >= creditsNeeded;
  };

  const refreshCount = async () => {
    await fetchImageCount();
  };

  return {
    totalImagesGenerated,
    remainingImages,
    canGenerateImages,
    isAtLimit,
    loading,
    refreshCount,
    limit: isAdmin ? 'unlimited' : remainingImages,
  };
};