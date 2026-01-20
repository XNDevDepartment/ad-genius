
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAccountActivation } from '@/hooks/useAccountActivation';
import type { CreditDeductionResponse } from '@/types/credits';

export const useCredits = () => {
  const { user, subscriptionData, refreshSubscription } = useAuth();
  const { isActivated, needsActivation, refreshActivationStatus, requestActivation } = useAccountActivation();
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

  // Check if user is in grace period (past_due but within 21 days)
  const isInGracePeriod = (): boolean => {
    if (!subscriptionData?.payment_failed_at) return false;
    const daysSinceFailure = Math.floor(
      (Date.now() - new Date(subscriptionData.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceFailure < 21 && subscriptionData.subscription_tier !== 'Free';
  };

  // Users in grace period keep full access to their paid tier features
  const hasFullPaidAccess = (): boolean => {
    return (subscriptionData?.subscribed && subscriptionData?.subscription_status === 'active') || isInGracePeriod();
  };

  const getDaysRemainingInGracePeriod = (): number | null => {
    if (!subscriptionData?.payment_failed_at) return null;
    const daysSinceFailure = Math.floor(
      (Date.now() - new Date(subscriptionData.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 21 - daysSinceFailure);
  };

  const getMaxImagesPerGeneration = (): number => {
    // Users in grace period keep their paid tier limits
    if (isInGracePeriod()) return 3;
    return isFreeTier() ? 1 : 3;
  };

  const canAccessVideos = (): boolean => {
    if (!subscriptionData) return false;
    
    // NEW: Check if account is activated (required for video access)
    if (!isActivated) return false;
    
    // Users in grace period keep video access
    if (isInGracePeriod()) {
      const tier = subscriptionData.subscription_tier;
      return tier !== 'Starter';
    }
    const tier = subscriptionData.subscription_tier;
    // All tiers except Starter can access videos
    return tier !== 'Starter';
  };

  const getVideoAccessMessage = (): string => {
    if (!subscriptionData) return 'Please sign in to access video features.';
    
    // NEW: Check activation status first
    if (!isActivated) {
      return 'Please verify your email to access video features. Check your inbox for the activation link.';
    }
    
    const tier = subscriptionData.subscription_tier;
    
    switch (tier) {
      case 'Starter':
        return 'Video generation is not available on the Starter plan. Upgrade to Plus for video access, or try our Free tier to test the feature!';
      case 'Free':
      case 'Founders':
      case 'Plus':
      case 'Pro':
        return 'You have access to video generation!';
      default:
        return 'Video generation is available on Free, Founders, Plus, and Pro plans.';
    }
  };

  const canAccessOutfitSwap = (): boolean => {
    // Beta feature now available to all authenticated users
    return !!subscriptionData;
  };

  const getOutfitSwapAccessMessage = (): string => {
    if (!subscriptionData) return 'Please sign in to access outfit-swap features.';
    return 'You have access to outfit-swap! This feature is currently in beta testing. Help us perfect it!';
  };

  return {
    credits: getTotalCredits(),
    remainingCredits: getRemainingCredits(),
    usedCredits: getUsedCredits(),
    tier: subscriptionData?.subscription_tier || 'Free',
    subscriptionStatus: subscriptionData?.subscription_status || 'active',
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
    isInGracePeriod,
    hasFullPaidAccess,
    getDaysRemainingInGracePeriod,
    getMaxImagesPerGeneration,
    canAccessVideos,
    getVideoAccessMessage,
    canAccessOutfitSwap,
    getOutfitSwapAccessMessage,
    // NEW: Account activation
    isAccountActivated: isActivated,
    needsActivation,
    refreshActivationStatus,
    requestActivation,
  };
};
