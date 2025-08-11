import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCredits = () => {
  const { user, subscriptionData, deductCredits, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const getCreditsForTier = (tier: string): number => {
    switch (tier) {
      case 'Pro':
        return 100;
      case 'Enterprise':
        return 500;
      default:
        return 60; // Test mode credits for testers
    }
  };

  const calculateImageCost = (quality: 'low' | 'medium' | 'high', numberOfImages: number = 1): number => {
    const qualityCosts = {
      'low': 1,
      'medium': 1.5,
      'high': 2
    };
    return qualityCosts[quality] * numberOfImages;
  };

  const canAfford = (amount: number): boolean => {
    if (!subscriptionData) return false;
    return subscriptionData.credits_balance >= amount;
  };

  const getUsagePercentage = (): number => {
    if (!subscriptionData) return 0;
    const totalCredits = getCreditsForTier(subscriptionData.subscription_tier);
    const used = totalCredits - subscriptionData.credits_balance;
    return Math.min((used / totalCredits) * 100, 100);
  };

  const getRemainingCredits = (): number => {
    return subscriptionData?.credits_balance || 0;
  };

  const getTotalCredits = (): number => {
    if (!subscriptionData) return 0;
    return getCreditsForTier(subscriptionData.subscription_tier);
  };

  const getUsedCredits = (): number => {
    const total = getTotalCredits();
    const remaining = getRemainingCredits();
    return total - remaining;
  };

  const getDaysUntilReset = (): number => {
    if (!subscriptionData?.subscription_end) return 0;
    const endDate = new Date(subscriptionData.subscription_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const purchaseCredits = async (amount: number): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    try {
      // This would typically involve Stripe checkout for additional credits
      // For now, we'll add them directly (in production, this should be server-side)
      const { error } = await supabase
        .from('credits_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          reason: 'credit_purchase'
        });
      
      if (error) throw error;
      
      await refreshSubscription();
      return true;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    credits: subscriptionData?.credits_balance || 0,
    tier: subscriptionData?.subscription_tier || 'Free',
    loading,
    canAfford,
    deductCredits,
    purchaseCredits,
    getUsagePercentage,
    getRemainingCredits,
    getTotalCredits,
    getUsedCredits,
    getDaysUntilReset,
    refreshCredits: refreshSubscription,
    calculateImageCost,
  };
};