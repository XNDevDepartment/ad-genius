import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ActivationState {
  isActivated: boolean;
  loading: boolean;
  isOAuthUser: boolean;
}

export const useAccountActivation = () => {
  const { user, session } = useAuth();
  const [state, setState] = useState<ActivationState>({
    isActivated: true, // Default to true for non-OAuth users
    loading: true,
    isOAuthUser: false,
  });

  const checkActivationStatus = useCallback(async () => {
    if (!user) {
      setState({ isActivated: true, loading: false, isOAuthUser: false });
      return;
    }

    // Check if this is an OAuth user (Google)
    const isOAuthUser = session?.user?.app_metadata?.provider === 'google';

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_activated')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[useAccountActivation] Error fetching profile:', error);
        // Default to activated if we can't fetch (fail open for existing users)
        setState({ isActivated: true, loading: false, isOAuthUser });
        return;
      }

      // If account_activated is null (old users before this feature), treat as activated
      const isActivated = profile?.account_activated !== false;
      
      setState({ isActivated, loading: false, isOAuthUser });
    } catch (err) {
      console.error('[useAccountActivation] Exception:', err);
      setState({ isActivated: true, loading: false, isOAuthUser });
    }
  }, [user, session]);

  useEffect(() => {
    checkActivationStatus();
  }, [checkActivationStatus]);

  const refreshActivationStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await checkActivationStatus();
  }, [checkActivationStatus]);

  const requestActivation = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error } = await supabase.functions.invoke('generate-activation-token');
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user]);

  return {
    isActivated: state.isActivated,
    isOAuthUser: state.isOAuthUser,
    loading: state.loading,
    needsActivation: !state.loading && state.isOAuthUser && !state.isActivated,
    refreshActivationStatus,
    requestActivation,
  };
};
