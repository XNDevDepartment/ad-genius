
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCredits = () => {
  const { user, subscriptionData, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const calculateImageCost = (quality: 'low' | 'medium' | 'high', numberOfImages: number = 1): number => {
    const qualityCosts = {
      'low': 1,
      'medium': 1.5,
      'high': 2
    };
    return qualityCosts[quality] * numberOfImages;
  };

  const canAfford = (amount: number): boolean => {
    const remaining = getRemainingCredits();
    return remaining >= amount;
  };

  const getRemainingCredits = (): number => {
    if (!subscriptionData) return 0;
    return Math.max(0, subscriptionData.credits_balance || 0);
  };

  const getTotalCredits = (): number => {
    if (!subscriptionData) return 0;
    // Get the monthly allowance based on subscription tier
    const tierCredits = {
      'Free': 60,
      'Pro': 500,
      'Enterprise': 2000
    };
    return tierCredits[subscriptionData.subscription_tier as keyof typeof tierCredits] || 60;
  };

  const getUsedCredits = (): number => {
    const total = getTotalCredits();
    const remaining = getRemainingCredits();
    return Math.max(0, total - remaining);
  };

  const getUsagePercentage = (): number => {
    const total = getTotalCredits();
    if (total === 0) return 0;
    const used = getUsedCredits();
    return Math.min((used / total) * 100, 100);
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    try {
      // Use the new atomic RPC function
      const { data, error } = await supabase.rpc('deduct_user_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: 'image_generation'
      });
      
      if (error) throw error;
      
      if (!data.success) {
        console.error('Credit deduction failed:', data.error);
        return false;
      }
      
      // Refresh subscription data to get updated balance
      await refreshSubscription();
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilReset = (): number => {
    if (!subscriptionData?.subscription_end) return 0;
    const endDate = new Date(subscriptionData.subscription_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const refreshCredits = async () => {
    await refreshSubscription();
  };

  return {
    credits: getTotalCredits(),
    remainingCredits: getRemainingCredits(),
    usedCredits: getUsedCredits(),
    tier: subscriptionData?.subscription_tier || 'Free',
    loading,
    canAfford,
    deductCredits,
    getUsagePercentage,
    getRemainingCredits,
    getTotalCredits,
    getUsedCredits,
    getDaysUntilReset,
    refreshCredits,
    calculateImageCost,
  };
};
