import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCredits } from '@/hooks/useCredits';

export const useImageLimit = (imageQuality: 'low' | 'medium' | 'high' = 'high') => {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { getRemainingCredits, calculateImageCost, canAfford, loading, refreshCredits } = useCredits();

  const canGenerateImages = (count: number = 1): boolean => {
    if (isAdmin) return true;
    
    const creditsNeeded = calculateImageCost(imageQuality, count);
    return canAfford(creditsNeeded);
  };

  const remainingImages = isAdmin ? 999 : Math.floor(getRemainingCredits() / calculateImageCost(imageQuality));
  const isAtLimit = !canGenerateImages(1);

  return {
    remainingCredits: getRemainingCredits(),
    remainingImages,
    canGenerateImages,
    isAtLimit,
    loading,
    refreshCount: refreshCredits,
    limit: isAdmin ? 'unlimited' : remainingImages,
    calculateImageCost,
  };
};