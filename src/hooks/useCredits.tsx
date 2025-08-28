
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { CreditDeductionResponse } from '@/types/credits';

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
    // Add epsilon tolerance for floating point precision
    const epsilon = 0.001;
    return remaining >= (amount - epsilon);
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

  // Removed client-side deductCredits - all deductions now handled server-side
  const deductCredits = async (amount: number): Promise<boolean> => {
    console.warn('Client-side credit deduction is deprecated. Credits are now deducted server-side during image generation.');
    return true; // Always return true to maintain compatibility
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
