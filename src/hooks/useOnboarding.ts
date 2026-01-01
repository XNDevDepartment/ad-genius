import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingData {
  imageUrl?: string;
  sourceImageId?: string;
  audience?: string;
  contentType?: 'product_showcase' | 'lifestyle' | 'social_proof' | 'ad_creative';
  generatedImages?: string[];
  generatedVideoUrl?: string;
}

export interface OnboardingState {
  completed: boolean;
  step: number;
  data: OnboardingData;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    completed: true, // Default to true to avoid flash
    step: 0,
    data: {}
  });
  const [loading, setLoading] = useState(true);
  const [bonusCredits, setBonusCredits] = useState({ imagesUsed: 0, videoUsed: false });

  // Fetch onboarding status from profiles
  const fetchOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step, onboarding_data')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[useOnboarding] Error fetching profile:', error);
        // If no profile exists yet, user needs onboarding
        setState({ completed: false, step: 1, data: {} });
      } else {
        setState({
          completed: profile.onboarding_completed ?? false,
          step: (profile.onboarding_step && profile.onboarding_step > 0) ? profile.onboarding_step : 1,
          data: (profile.onboarding_data as OnboardingData) ?? {}
        });
      }

      // Fetch bonus credits
      const { data: bonus } = await supabase
        .from('onboarding_bonus_credits')
        .select('images_used, video_used')
        .eq('user_id', user.id)
        .single();

      if (bonus) {
        setBonusCredits({ imagesUsed: bonus.images_used, videoUsed: bonus.video_used });
      }
    } catch (err) {
      console.error('[useOnboarding] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOnboardingStatus();
  }, [fetchOnboardingStatus]);

  // Save current step and data to database
  const saveProgress = useCallback(async (step: number, data: OnboardingData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_step: step,
          onboarding_data: data as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[useOnboarding] Error saving progress:', error);
      } else {
        setState(prev => ({ ...prev, step, data }));
      }
    } catch (err) {
      console.error('[useOnboarding] Save progress error:', err);
    }
  }, [user]);

  // Move to next step
  const nextStep = useCallback(async (additionalData?: Partial<OnboardingData>) => {
    const newStep = state.step + 1;
    const newData = { ...state.data, ...additionalData };
    await saveProgress(newStep, newData);
  }, [state.step, state.data, saveProgress]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 5,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[useOnboarding] Error completing onboarding:', error);
      } else {
        setState(prev => ({ ...prev, completed: true }));
      }
    } catch (err) {
      console.error('[useOnboarding] Complete onboarding error:', err);
    }
  }, [user]);

  // Generate images using bonus credits
  const generateBonusImages = useCallback(async () => {
    if (!user || bonusCredits.imagesUsed >= 2) {
      return { success: false, error: 'No bonus images remaining' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-generate', {
        body: {
          sourceImageId: state.data.sourceImageId,
          audience: state.data.audience,
          contentType: state.data.contentType
        }
      });

      if (error) throw error;

      setBonusCredits(prev => ({ ...prev, imagesUsed: 2 }));
      return { success: true, images: data.images };
    } catch (err: any) {
      console.error('[useOnboarding] Generate bonus images error:', err);
      return { success: false, error: err.message };
    }
  }, [user, bonusCredits.imagesUsed, state.data]);

  // Generate video using bonus credit
  const generateBonusVideo = useCallback(async (imageUrl: string) => {
    if (!user || bonusCredits.videoUsed) {
      return { success: false, error: 'Bonus video already used' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-video', {
        body: { imageUrl }
      });

      if (error) throw error;

      setBonusCredits(prev => ({ ...prev, videoUsed: true }));
      return { success: true, videoUrl: data.videoUrl, jobId: data.jobId };
    } catch (err: any) {
      console.error('[useOnboarding] Generate bonus video error:', err);
      return { success: false, error: err.message };
    }
  }, [user, bonusCredits.videoUsed]);

  return {
    ...state,
    loading,
    bonusCredits,
    nextStep,
    saveProgress,
    completeOnboarding,
    generateBonusImages,
    generateBonusVideo,
    refetch: fetchOnboardingStatus
  };
};
