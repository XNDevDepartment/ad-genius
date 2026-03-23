import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCredits } from '@/hooks/useCredits';

export const useImageLimit = (imageQuality: 'low' | 'medium' | 'high' = 'high', imageSize: '1K' | '2K' | '4K' = '1K') => {
  const { user } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdminAuth();
  const { getRemainingCredits, calculateImageCost, canAfford, loading, refreshCredits } = useCredits();

  const canGenerateImages = (count: number = 1): boolean => {
    // Allow generation if admin status is still loading (to prevent blocking admins)
    if (isAdminLoading) return true;
    if (isAdmin) return true;

    const creditsNeeded = calculateImageCost(imageQuality, count, imageSize);
    return canAfford(creditsNeeded);
  };

  // Fixed cost: 1 credit per image
  const remainingImages = isAdmin ? 999 : Math.floor(getRemainingCredits());
  const isAtLimit = !canGenerateImages(1);

  return {
    remainingCredits: getRemainingCredits(),
    remainingImages,
    canGenerateImages,
    isAtLimit,
    loading,
    isAdminLoading,
    refreshCount: refreshCredits,
    limit: isAdmin ? 'unlimited' : remainingImages,
    calculateImageCost,
  };
};