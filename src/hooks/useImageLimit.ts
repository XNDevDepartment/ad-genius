import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';

export const useImageLimit = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [totalImagesGenerated, setTotalImagesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);

  const TEST_MODE_LIMIT = 30;

  const fetchImageCount = async () => {
    if (!user) {
      setTotalImagesGenerated(0);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

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

  const remainingImages = isAdmin ? 999 : Math.max(0, TEST_MODE_LIMIT - totalImagesGenerated);
  const isAtLimit = !isAdmin && totalImagesGenerated >= TEST_MODE_LIMIT;

  const canGenerateImages = (count: number = 1): boolean => {
    if (isAdmin) return true;
    return totalImagesGenerated + count <= TEST_MODE_LIMIT;
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
    limit: isAdmin ? 'unlimited' : TEST_MODE_LIMIT,
  };
};