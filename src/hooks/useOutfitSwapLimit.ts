import { useCredits } from "@/hooks/useCredits";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const OUTFIT_SWAP_COSTS = {
  SINGLE_SWAP: 1,
  BATCH_BASE: 1, // per garment
  BATCH_DISCOUNT_5PLUS: 0.1, // 10% off for 5+ garments
  MAX_BATCH_SIZE: 10,
};

export const useOutfitSwapLimit = () => {
  const { isAdmin } = useAdminAuth();
  const { canAfford, getRemainingCredits } = useCredits();

  const calculateBatchCost = (garmentCount: number): number => {
    if (garmentCount <= 0) return 0;
    if (garmentCount > OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE) {
      garmentCount = OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE;
    }

    const baseCost = garmentCount * OUTFIT_SWAP_COSTS.BATCH_BASE;
    const discount = garmentCount >= 5 ? OUTFIT_SWAP_COSTS.BATCH_DISCOUNT_5PLUS : 0;
    return Math.ceil(baseCost * (1 - discount));
  };

  const canAffordBatch = (garmentCount: number): boolean => {
    if (isAdmin) return true; // Admin bypass
    const cost = calculateBatchCost(garmentCount);
    return canAfford(cost);
  };

  const getMaxAffordableGarments = (): number => {
    if (isAdmin) return OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE; // Admin bypass
    
    const credits = getRemainingCredits();
    
    // With discount (5+ garments): cost = count * 1 * 0.9
    // Without discount (1-4 garments): cost = count * 1
    
    // Try with discount first
    const maxWithDiscount = Math.floor(credits / 0.9);
    if (maxWithDiscount >= 5) {
      return Math.min(maxWithDiscount, OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE);
    }
    
    // No discount
    return Math.min(credits, 4, OUTFIT_SWAP_COSTS.MAX_BATCH_SIZE);
  };

  const getSavings = (garmentCount: number): number => {
    if (garmentCount < 5) return 0;
    const withoutDiscount = garmentCount * OUTFIT_SWAP_COSTS.BATCH_BASE;
    const withDiscount = calculateBatchCost(garmentCount);
    return withoutDiscount - withDiscount;
  };

  return {
    calculateBatchCost,
    canAffordBatch,
    getMaxAffordableGarments,
    getSavings,
    OUTFIT_SWAP_COSTS,
    isAdmin,
  };
};
