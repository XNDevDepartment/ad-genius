import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';

export const useImageLimit = (imageQuality: 'low' | 'medium' | 'high' = 'high') => {
  const { user, subscriptionData } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { getRemainingCredits, calculateImageCost } = useCredits();
  const [totalImagesGenerated, setTotalImagesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);

  const TEST_MODE_LIMIT = 30; // 30 images for non-subscribed users

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

  // Determine if user is in test mode or subscription mode
  const isTestMode = !subscriptionData || subscriptionData.subscription_tier === 'Free';
  
  let remainingImages: number;
  let isAtLimit: boolean;

  if (isAdmin) {
    remainingImages = 999;
    isAtLimit = false;
  } else if (isTestMode) {
    // Test mode: 30 images limit based on images after Aug 7th
    remainingImages = Math.max(0, TEST_MODE_LIMIT - totalImagesGenerated);
    isAtLimit = totalImagesGenerated >= TEST_MODE_LIMIT;
  } else {
    // Subscription mode: credit-based system
    const remainingCredits = getRemainingCredits();
    const creditsPerImage = calculateImageCost(imageQuality);
    remainingImages = Math.floor(remainingCredits / creditsPerImage);
    isAtLimit = remainingCredits < creditsPerImage;
  }

  const canGenerateImages = (count: number = 1): boolean => {
    if (isAdmin) return true;
    
    if (isTestMode) {
      return totalImagesGenerated + count <= TEST_MODE_LIMIT;
    } else {
      const creditsNeeded = calculateImageCost(imageQuality, count);
      const remainingCredits = getRemainingCredits();
      return remainingCredits >= creditsNeeded;
    }
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
    limit: isAdmin ? 'unlimited' : (isTestMode ? TEST_MODE_LIMIT : remainingImages),
    isTestMode,
  };
};