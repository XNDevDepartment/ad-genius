import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
  credits_balance: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionData: SubscriptionData | null;
  subscriptionLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>;
  signInWithGoogle: () => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  refreshSubscription: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const fetchSubscriptionData = async (forceRefresh = false) => {
    if (!user) return;
    
    setSubscriptionLoading(true);
    try {
      // Store old tier for comparison
      const oldTier = subscriptionData?.subscription_tier;

      // First call check-subscription to ensure Stripe data is synced
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-subscription');
      if (checkError) throw checkError;

      // Then get the updated data from subscribers table
      const { data: subscriberData, error: subscriberError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subscriberError) {
        console.error('Error fetching subscriber data:', subscriberError);
        throw subscriberError;
      }

      const newSubscriptionData = {
        subscribed: subscriberData.subscribed || false,
        subscription_tier: subscriberData.subscription_tier || 'Free',
        subscription_end: subscriberData.subscription_end || null,
        credits_balance: subscriberData.credits_balance || 0
      };

      setSubscriptionData(newSubscriptionData);

      // Sync to MailerLite if subscription tier changed
      const newTier = newSubscriptionData.subscription_tier;
      if (oldTier && oldTier !== newTier) {
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('sync-mailerlite', {
              body: {
                action: 'update',
                email: user.email,
                userId: user.id,
                oldTier,
                newTier
              }
            });
          } catch (syncError) {
            console.error('[AuthContext] MailerLite tier sync error:', syncError);
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setSubscriptionData({
        subscribed: false,
        subscription_tier: 'Free',
        subscription_end: null,
        credits_balance: 0
      });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscriptionData();
  };

  useEffect(() => {
    // Listen for auth changes FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth event:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('[AuthContext] User signed out or no session');
        localStorage.clear();
        setSession(null);
        setUser(null);
        setSubscriptionData(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // THEN get and validate initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Session error:', error);
          localStorage.clear();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session) {
          // Validate session is not expired
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();
          
          if (expiresAt < now) {
            console.warn('[AuthContext] Session expired, clearing');
            localStorage.clear();
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.log('[AuthContext] Valid session found');
            setSession(session);
            setUser(session.user);
          }
        } else {
          console.log('[AuthContext] No session found');
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Init session error:', err);
        localStorage.clear();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  // Fetch subscription data when user changes
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        fetchSubscriptionData();
      }, 0);
    } else {
      setSubscriptionData(null);
    }
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: redirectUrl,
      },
    });

    // Sync to MailerLite after successful signup
    if (!error && data.user) {
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('sync-mailerlite', {
            body: {
              action: 'subscribe',
              email: data.user!.email,
              userId: data.user!.id,
              name: userData?.name || userData?.first_name || '',
              subscriptionTier: 'Free'
            }
          });
        } catch (syncError) {
          console.error('[AuthContext] MailerLite sync error:', syncError);
        }
      }, 0);
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setSubscriptionData(null);
  };

  const updateProfile = async (updates: any) => {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const resendConfirmationEmail = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    subscriptionData,
    subscriptionLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
        updateProfile,
        resetPassword,
        refreshSubscription,
        resendConfirmationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
