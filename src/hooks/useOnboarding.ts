import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
  prompt?: string; // Added for custom scenarios from onboarding
}

export interface OnboardingData {
  imageUrl?: string;
  sourceImageId?: string;
  audience?: string;
  selectedScenario?: AIScenario;
  generatedImages?: string[];
  generatedVideoUrl?: string;
}

export interface OnboardingState {
  completed: boolean;
  step: number;
  data: OnboardingData;
}

// Admin emails that bypass onboarding (empty for testing)
const ADMIN_BYPASS_EMAILS: string[] = [];

// LocalStorage key for onboarding state backup
const getStorageKey = (userId: string) => `onboarding_state_${userId}`;

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    completed: true, // Default to true to avoid flash
    step: 0,
    data: {}
  });
  const [loading, setLoading] = useState(true);
  const [bonusCredits, setBonusCredits] = useState({ imagesUsed: 0, videoUsed: false });
  
  // Track if we've initialized to prevent multiple fetches
  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Save state to localStorage as backup
  const saveToLocalStorage = useCallback((userId: string, newState: OnboardingState) => {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(newState));
    } catch (err) {
      console.warn('[useOnboarding] Failed to save to localStorage:', err);
    }
  }, []);

  // Load state from localStorage
  const loadFromLocalStorage = useCallback((userId: string): OnboardingState | null => {
    try {
      const cached = localStorage.getItem(getStorageKey(userId));
      if (cached) {
        return JSON.parse(cached) as OnboardingState;
      }
    } catch (err) {
      console.warn('[useOnboarding] Failed to load from localStorage:', err);
    }
    return null;
  }, []);

  // Create profile if it doesn't exist
  const ensureProfileExists = useCallback(async (userId: string, email: string): Promise<boolean> => {
    try {
      // First check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (existing) {
        return true; // Profile already exists
      }

      // Create profile with required account_id field
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          account_id: `ACC${Date.now()}`,
          onboarding_completed: false,
          onboarding_step: 0,
          onboarding_data: {}
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('[useOnboarding] Error ensuring profile exists:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[useOnboarding] Unexpected error ensuring profile:', err);
      return false;
    }
  }, []);

  // Fetch onboarding status from profiles
  const fetchOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // ALWAYS ensure profile exists first before any checks
    await ensureProfileExists(user.id, user.email || '');

    // Check for admin bypass AFTER profile is ensured
    if (user.email && ADMIN_BYPASS_EMAILS.includes(user.email)) {
      console.log('[useOnboarding] Admin bypass - skipping onboarding');
      const bypassState = { completed: true, step: 4, data: {} };
      setState(bypassState);
      saveToLocalStorage(user.id, bypassState);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step, onboarding_data')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useOnboarding] Error fetching profile:', error);
        // If profile doesn't exist, create it
        await ensureProfileExists(user.id, user.email || '');
        const newState = { completed: false, step: 0, data: {} };
        setState(newState);
        saveToLocalStorage(user.id, newState);
      } else if (!profile) {
        // No profile exists - create one
        console.log('[useOnboarding] No profile found, creating one');
        await ensureProfileExists(user.id, user.email || '');
        const newState = { completed: false, step: 0, data: {} };
        setState(newState);
        saveToLocalStorage(user.id, newState);
      } else {
        const newState = {
          completed: profile.onboarding_completed ?? false,
          step: profile.onboarding_step ?? 0,
          data: (profile.onboarding_data as OnboardingData) ?? {}
        };
        setState(newState);
        saveToLocalStorage(user.id, newState);
      }

      // Fetch bonus credits
      const { data: bonus } = await supabase
        .from('onboarding_bonus_credits')
        .select('images_used, video_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (bonus) {
        setBonusCredits({ imagesUsed: bonus.images_used, videoUsed: bonus.video_used });
      }
    } catch (err) {
      console.error('[useOnboarding] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, ensureProfileExists, loadFromLocalStorage, saveToLocalStorage]);

  // Effect to handle user changes and prevent re-fetching on window focus
  useEffect(() => {
    // Only fetch if user changed
    if (user?.id !== userIdRef.current) {
      userIdRef.current = user?.id || null;
      initializedRef.current = false;
    }

    if (!initializedRef.current && user) {
      initializedRef.current = true;
      fetchOnboardingStatus();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, fetchOnboardingStatus]);

  // Save current step and data to database
  const saveProgress = useCallback(async (step: number, data: OnboardingData) => {
    if (!user) return;

    const newState = { ...state, step, data };
    
    // Optimistically update local state and localStorage
    setState(newState);
    saveToLocalStorage(user.id, newState);

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
        // Try upsert if update fails (profile might not exist)
        await ensureProfileExists(user.id, user.email || '');
        await supabase
          .from('profiles')
          .update({
            onboarding_step: step,
            onboarding_data: data as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('[useOnboarding] Save progress error:', err);
    }
  }, [user, state, saveToLocalStorage, ensureProfileExists]);

  // Move to next step
  const nextStep = useCallback(async (additionalData?: Partial<OnboardingData>) => {
    const newStep = state.step + 1;
    const newData = { ...state.data, ...additionalData };
    await saveProgress(newStep, newData);
  }, [state.step, state.data, saveProgress]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    // Optimistically update state immediately - NEVER revert to avoid blank screen
    const completedState = { ...state, completed: true, step: 4 };
    setState(completedState);
    saveToLocalStorage(user.id, completedState);

    try {
      // Ensure profile exists first, then update
      await ensureProfileExists(user.id, user.email || '');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 4,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[useOnboarding] Error completing onboarding:', error);
        // DO NOT revert state - let user proceed regardless
      }
    } catch (err) {
      console.error('[useOnboarding] Complete onboarding error:', err);
      // DO NOT revert state - let user proceed regardless
    }
  }, [user, state, saveToLocalStorage, ensureProfileExists]);

  // Award 20 credits for completing onboarding
  const awardCredits = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('award_onboarding_credits', {
        p_user_id: user.id
      });

      if (error) {
        console.error('[useOnboarding] Error awarding credits:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('[useOnboarding] Award credits error:', err);
      return false;
    }
  }, [user]);

  // Restart onboarding from scratch
  const restartOnboarding = useCallback(async () => {
    if (!user) return;

    const newState = { completed: false, step: 0, data: {} };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: false,
          onboarding_step: 0,
          onboarding_data: {},
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[useOnboarding] Error restarting onboarding:', error);
        return false;
      } else {
        setState(newState);
        saveToLocalStorage(user.id, newState);
        return true;
      }
    } catch (err) {
      console.error('[useOnboarding] Restart onboarding error:', err);
      return false;
    }
  }, [user, saveToLocalStorage]);

  // Generate images using bonus credits (deprecated - now using ugc-gemini directly)
  const generateBonusImages = useCallback(async () => {
    if (!user || bonusCredits.imagesUsed >= 2) {
      return { success: false, error: 'No bonus images remaining' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-generate', {
        body: {
          sourceImageId: state.data.sourceImageId,
          audience: state.data.audience,
          scenario: state.data.selectedScenario?.description
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

  return {
    ...state,
    loading,
    bonusCredits,
    nextStep,
    saveProgress,
    completeOnboarding,
    restartOnboarding,
    generateBonusImages,
    awardCredits,
    refetch: fetchOnboardingStatus
  };
};
