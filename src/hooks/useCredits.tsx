
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { CreditDeductionResponse } from '@/types/credits';

export const useCredits = () => {
  const { user, subscriptionData, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const calculateImageCost = (quality: 'low' | 'medium' | 'high', numberOfImages: number = 1): number => {
    // Fixed cost: 1 credit per image regardless of quality
    return 1 * numberOfImages;
  };

  const canAfford = (amount: number): boolean => {
    const remaining = getRemainingCredits();
    const epsilon = 0.001;
    return remaining >= (amount - epsilon);
  };

  const getRemainingCredits = (): number => {
    if (!subscriptionData) return 0;
    return Math.max(0, subscriptionData.credits_balance || 0);
  };

  const getTotalCredits = (): number => {
    if (!subscriptionData) return 0;
    const tierCredits = {
      'Free': 10,
      'Starter': 80,
      'Plus': 200,
      'Pro': 400,
      'Founders': 80
    };
    // Total credits is what the user actually has (including rollovers)
    // This is the actual allocated credits, not tier-based assumption
    return tierCredits[subscriptionData.subscription_tier as keyof typeof tierCredits];
  };

  const getUsedCredits = (): number => {
    if (!subscriptionData) return 0;
    // For display purposes, show tier-based calculation against remaining
    const tierCredits = {
      'Free': 10,
      'Starter': 80,
      'Plus': 200,
      'Pro': 400,
      'Founders': 80
    };
    const tierAllocation = tierCredits[subscriptionData.subscription_tier as keyof typeof tierCredits] || 10;
    const remaining = getRemainingCredits();
    
    // If user has more than tier allocation (due to rollover), show 0 used from current period
    if (remaining >= tierAllocation) return 0;
    
    // Otherwise show how many from current tier allocation have been used
    return tierAllocation - remaining;
  };

  const getUsagePercentage = (): number => {
    if (!subscriptionData) return 0;
    const tierCredits = {
      'Free': 10,
      'Starter': 80,
      'Plus': 200,
      'Pro': 400,
      'Founders': 80
    };
    const tierAllocation = tierCredits[subscriptionData.subscription_tier as keyof typeof tierCredits] || 10;
    const used = getUsedCredits();
    return Math.min((used / tierAllocation) * 100, 100);
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    console.warn('Client-side credit deduction is deprecated. Credits are now deducted server-side during image generation.');
    return true;
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

  const isFreeTier = (): boolean => {
    return subscriptionData?.subscription_tier === 'Free' || !subscriptionData?.subscribed;
  };

  const getMaxImagesPerGeneration = (): number => {
    return isFreeTier() ? 1 : 3;
  };

  const canAccessVideos = (): boolean => {
    if (!subscriptionData) return false;
    const tier = subscriptionData.subscription_tier;
    // Only Plus and Pro can access videos
    return ['Plus', 'Pro'].includes(tier);
  };

  const getVideoAccessMessage = (): string => {
    if (!subscriptionData) return 'Please sign in to access video features.';
    const tier = subscriptionData.subscription_tier;
    
    switch (tier) {
      case 'Free':
        return 'Video generation is available for Plus and Pro members. Upgrade to unlock!';
      case 'Founders':
      case 'Starter':
        return 'Video generation is available for Plus and Pro members. Upgrade your plan to access this feature!';
      case 'Plus':
      case 'Pro':
        return 'You have access to video generation!';
      default:
        return 'Video generation requires a Plus or Pro subscription.';
    }
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
    isFreeTier,
    getMaxImagesPerGeneration,
    canAccessVideos,
    getVideoAccessMessage,
  };
};
