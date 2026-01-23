import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MilestoneState {
  completed: boolean;
  credited: boolean;
}

export interface MilestonesData {
  ugc: MilestoneState;
  video: MilestoneState;
  outfit_swap: MilestoneState;
  all_complete: MilestoneState;
}

const defaultMilestones: MilestonesData = {
  ugc: { completed: false, credited: false },
  video: { completed: false, credited: false },
  outfit_swap: { completed: false, credited: false },
  all_complete: { completed: false, credited: false }
};

export const useOnboardingMilestones = () => {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<MilestonesData>(defaultMilestones);
  const [loading, setLoading] = useState(true);
  const [totalCreditsEarned, setTotalCreditsEarned] = useState(0);

  // Fetch milestone completion status
  const fetchMilestones = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [ugcResult, videoResult, outfitSwapResult, rewardsResult] = await Promise.all([
        // Check if user has any UGC images
        supabase
          .from('ugc_images')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
        // Check if user has any completed videos
        supabase
          .from('kling_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1),
        // Check if user has any completed outfit swaps
        supabase
          .from('outfit_swap_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1),
        // Check reward status
        supabase
          .from('onboarding_rewards')
          .select('ugc_milestone_awarded, video_milestone_awarded, outfit_swap_milestone_awarded, all_complete_awarded, credits_awarded')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      const hasUgc = (ugcResult.data?.length ?? 0) > 0;
      const hasVideo = (videoResult.data?.length ?? 0) > 0;
      const hasOutfitSwap = (outfitSwapResult.data?.length ?? 0) > 0;
      const rewards = rewardsResult.data;

      const newMilestones: MilestonesData = {
        ugc: {
          completed: hasUgc,
          credited: rewards?.ugc_milestone_awarded ?? false
        },
        video: {
          completed: hasVideo,
          credited: rewards?.video_milestone_awarded ?? false
        },
        outfit_swap: {
          completed: hasOutfitSwap,
          credited: rewards?.outfit_swap_milestone_awarded ?? false
        },
        all_complete: {
          completed: hasUgc && hasVideo && hasOutfitSwap,
          credited: rewards?.all_complete_awarded ?? false
        }
      };

      setMilestones(newMilestones);
      setTotalCreditsEarned(rewards?.credits_awarded ?? 0);
    } catch (err) {
      console.error('[useOnboardingMilestones] Error fetching milestones:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // Award credits for a specific milestone
  const awardMilestone = useCallback(async (milestone: 'ugc' | 'video' | 'outfit_swap' | 'all_complete'): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('award_milestone_credits', {
        p_user_id: user.id,
        p_milestone: milestone
      });

      if (error) {
        console.error('[useOnboardingMilestones] Error awarding milestone:', error);
        return false;
      }

      if (data === true) {
        // Update local state
        setMilestones(prev => ({
          ...prev,
          [milestone]: { ...prev[milestone], credited: true }
        }));
        setTotalCreditsEarned(prev => prev + 5);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useOnboardingMilestones] Award error:', err);
      return false;
    }
  }, [user]);

  // Check and award any pending milestones
  const checkAndAwardMilestones = useCallback(async () => {
    if (!user) return;

    // Award UGC milestone if completed but not credited
    if (milestones.ugc.completed && !milestones.ugc.credited) {
      await awardMilestone('ugc');
    }

    // Award video milestone if completed but not credited
    if (milestones.video.completed && !milestones.video.credited) {
      await awardMilestone('video');
    }

    // Award outfit swap milestone if completed but not credited
    if (milestones.outfit_swap.completed && !milestones.outfit_swap.credited) {
      await awardMilestone('outfit_swap');
    }

    // Award all complete bonus if all three are done
    if (milestones.all_complete.completed && !milestones.all_complete.credited) {
      await awardMilestone('all_complete');
    }
  }, [user, milestones, awardMilestone]);

  // Get completion counts
  const completedCount = [
    milestones.ugc.completed,
    milestones.video.completed,
    milestones.outfit_swap.completed,
    milestones.all_complete.completed
  ].filter(Boolean).length;

  const creditedCount = [
    milestones.ugc.credited,
    milestones.video.credited,
    milestones.outfit_swap.credited,
    milestones.all_complete.credited
  ].filter(Boolean).length;

  const allComplete = milestones.ugc.credited && 
                      milestones.video.credited && 
                      milestones.outfit_swap.credited && 
                      milestones.all_complete.credited;

  return {
    milestones,
    loading,
    totalCreditsEarned,
    completedCount,
    creditedCount,
    allComplete,
    awardMilestone,
    checkAndAwardMilestones,
    refetch: fetchMilestones
  };
};
