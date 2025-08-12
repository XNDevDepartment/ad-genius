import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCredits = () => {
  const { user, subscriptionData, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [creditsSpent, setCreditsSpent] = useState(0);

  const calculateImageCost = (quality: 'low' | 'medium' | 'high', numberOfImages: number = 1): number => {
    const qualityCosts = {
      'low': 1,
      'medium': 1.5,
      'high': 2
    };
    return qualityCosts[quality] * numberOfImages;
  };

  const fetchCreditsSpent = async () => {
    if (!user) {
      setCreditsSpent(0);
      return;
    }

    try {
      // Fetch all images generated after Aug 7th and calculate actual credits spent
      const { data: images, error } = await supabase
        .from('generated_images')
        .select('settings')
        .eq('user_id', user.id)
        .gte('created_at', '2024-08-07T00:00:00.000Z');

      if (error) {
        console.error('Error fetching images for credit calculation:', error);
        setCreditsSpent(0);
        return;
      }

      let totalCreditsSpent = 0;
      images?.forEach(image => {
        const settings = image.settings as any;
        const quality = settings?.quality || 'high'; // Default to high if not specified
        totalCreditsSpent += calculateImageCost(quality);
      });

      setCreditsSpent(totalCreditsSpent);
    } catch (error) {
      console.error('Error calculating credits spent:', error);
      setCreditsSpent(0);
    }
  };

  useEffect(() => {
    fetchCreditsSpent();
  }, [user]);

  const canAfford = (amount: number): boolean => {
    const remaining = getRemainingCredits();
    return remaining >= amount;
  };

  const getRemainingCredits = (): number => {
    if (!subscriptionData) return 0;
    const currentBalance = subscriptionData.credits_balance || 0;
    return Math.max(0, currentBalance - creditsSpent);
  };

  const getTotalCredits = (): number => {
    if (!subscriptionData) return 0;
    return subscriptionData.credits_balance || 0;
  };

  const getUsedCredits = (): number => {
    return creditsSpent;
  };

  const getUsagePercentage = (): number => {
    const total = getTotalCredits();
    if (total === 0) return 0;
    return Math.min((creditsSpent / total) * 100, 100);
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    if (!user || !subscriptionData) return false;
    
    setLoading(true);
    try {
      const newBalance = (subscriptionData.credits_balance || 0) - amount;
      
      const { error } = await supabase
        .from('subscribers')
        .update({ credits_balance: newBalance })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      await refreshSubscription();
      await fetchCreditsSpent(); // Refresh credits spent calculation
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
    await fetchCreditsSpent();
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