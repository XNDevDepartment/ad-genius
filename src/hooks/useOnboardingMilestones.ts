import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';

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

// Confetti celebration function
const triggerConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

export const useOnboardingMilestones = () => {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<MilestonesData>(defaultMilestones);
  const [loading, setLoading] = useState(true);
  const [totalCreditsEarned, setTotalCreditsEarned] = useState(0);
  const previousMilestonesRef = useRef<MilestonesData>(defaultMilestones);

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

  // Initial fetch
  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // Real-time subscriptions for cross-tab updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to UGC images changes
    const ugcChannel = supabase
      .channel('ugc-milestone')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ugc_images',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[useOnboardingMilestones] UGC image detected');
          fetchMilestones();
        }
      )
      .subscribe();

    // Subscribe to video job completions
    const videoChannel = supabase
      .channel('video-milestone')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kling_jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).status === 'completed') {
            console.log('[useOnboardingMilestones] Video completion detected');
            fetchMilestones();
          }
        }
      )
      .subscribe();

    // Subscribe to outfit swap completions
    const outfitChannel = supabase
      .channel('outfit-milestone')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'outfit_swap_jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).status === 'completed') {
            console.log('[useOnboardingMilestones] Outfit swap completion detected');
            fetchMilestones();
          }
        }
      )
      .subscribe();

    // Subscribe to onboarding rewards changes (for cross-tab credit updates)
    const rewardsChannel = supabase
      .channel('rewards-milestone')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_rewards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[useOnboardingMilestones] Rewards update detected');
          fetchMilestones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ugcChannel);
      supabase.removeChannel(videoChannel);
      supabase.removeChannel(outfitChannel);
      supabase.removeChannel(rewardsChannel);
    };
  }, [user, fetchMilestones]);

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
        // Trigger confetti celebration!
        triggerConfetti();
        
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
    refetch: fetchMilestones,
    triggerConfetti // Export for manual triggering if needed
  };
};
