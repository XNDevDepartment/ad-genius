import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_status: string;
  subscription_end: string | null;
  credits_balance: number;
  payment_failed_at: string | null;
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
        subscription_status: (subscriberData as any).subscription_status || 'active',
        subscription_end: subscriberData.subscription_end || null,
        credits_balance: subscriberData.credits_balance || 0,
        payment_failed_at: subscriberData.payment_failed_at || null
      };

      setSubscriptionData(newSubscriptionData);

      // Sync to MailerLite if subscription tier changed
      const newTier = newSubscriptionData.subscription_tier;
      if (oldTier && oldTier !== newTier) {
        setTimeout(async () => {
          try {
            // Fetch user name from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', user.id)
              .single();

            await supabase.functions.invoke('sync-mailerlite', {
              body: {
                action: 'update',
                email: user.email,
                name: profileData?.name || '',
                subscription_tier: newTier,
                newsletter_subscribed: true
              }
            });
            console.log('[AuthContext] MailerLite tier sync completed');
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
        subscription_status: 'active',
        subscription_end: null,
        credits_balance: 0,
        payment_failed_at: null
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
        
        // For Google OAuth SIGNED_IN, validate domain and trigger activation
        if (event === 'SIGNED_IN' && session?.user) {
          const userEmail = session.user.email;
          const isOAuthUser = session.user.app_metadata?.provider === 'google';
          
          // Only validate domain for new OAuth users
          if (isOAuthUser && userEmail) {
            const domainCheckKey = `domain_checked_${session.user.id}`;
            const alreadyChecked = sessionStorage.getItem(domainCheckKey);
            
            if (!alreadyChecked) {
              sessionStorage.setItem(domainCheckKey, 'true');
              
              // Check domain validity and handle new user activation
              setTimeout(async () => {
                try {
                  // First check if user already has a profile
                  const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id, account_activated, created_at')
                    .eq('id', session.user.id)
                    .single();

                  // Determine if this is a truly NEW user by checking if profile was created recently (within 30 seconds)
                  const profileCreatedAt = existingProfile?.created_at ? new Date(existingProfile.created_at).getTime() : 0;
                  const now = Date.now();
                  const isNewUser = (now - profileCreatedAt) < 30000; // Created within last 30 seconds

                  console.log('[AuthContext] Profile check:', { 
                    exists: !!existingProfile, 
                    accountActivated: existingProfile?.account_activated,
                    isNewUser,
                    profileAge: now - profileCreatedAt 
                  });

                  // If this is a NEW OAuth user OR account is not activated
                  if (isNewUser || (existingProfile && existingProfile.account_activated === false)) {
                    // Validate domain for new users
                    if (isNewUser) {
                      const { data: domainValidation, error: domainError } = await supabase.functions.invoke('validate-signup-domain', {
                        body: { email: userEmail }
                      });
                      
                      if (!domainError && domainValidation && !domainValidation.allowed) {
                        console.log('[AuthContext] Domain validation failed for OAuth user:', domainValidation.reason);
                        await supabase.auth.signOut();
                        if (domainValidation.reason === 'domain_blocked') {
                          alert('This email domain is not allowed for registration. Please use a different email provider.');
                        } else if (domainValidation.reason === 'domain_limit_reached') {
                          alert('An account already exists with this email domain. For additional accounts, please contact info@produktpix.com');
                        }
                        return;
                      }
                    }
                    
                    // For new OAuth users, set account_activated = false and send activation email
                    console.log('[AuthContext] New/unactivated OAuth user - triggering activation flow');
                    
                    // Wait for profile to be fully created, then update it
                    setTimeout(async () => {
                      try {
                        // Update profile to set account_activated = false
                        const { error: updateError } = await supabase
                          .from('profiles')
                          .update({ account_activated: false })
                          .eq('id', session.user.id);
                        
                        if (updateError) {
                          console.error('[AuthContext] Failed to update profile:', updateError);
                        }
                        
                        // Trigger activation email
                        console.log('[AuthContext] Invoking generate-activation-token...');
                        const { error: activationError, data: activationData } = await supabase.functions.invoke('generate-activation-token');
                        
                        if (activationError) {
                          console.error('[AuthContext] Failed to send activation email:', activationError);
                        } else {
                          console.log('[AuthContext] Activation email sent:', activationData);
                        }
                      } catch (activationErr) {
                        console.error('[AuthContext] Activation setup error:', activationErr);
                      }
                    }, 1000);
                  } else {
                    console.log('[AuthContext] Existing activated OAuth user - skipping activation');
                  }
                } catch (validationError) {
                  console.error('[AuthContext] Domain validation error:', validationError);
                  // Fail open - allow user to continue
                }
              }, 500);
            }
          }
          
          // Sync Google OAuth users to MailerLite on first login
          const syncKey = `mailerlite_synced_${session.user.id}`;
          const alreadySynced = sessionStorage.getItem(syncKey);
          
          if (!alreadySynced) {
            sessionStorage.setItem(syncKey, 'true');
            
            // Check if user is already synced in database
            setTimeout(async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('mailerlite_subscriber_id, name')
                  .eq('id', session.user.id)
                  .single();
                
                // Only sync if not already synced
                if (!profile?.mailerlite_subscriber_id) {
                  console.log('[AuthContext] Syncing new user to MailerLite:', session.user.email);
                  
                  await supabase.functions.invoke('sync-mailerlite', {
                    body: {
                      action: 'subscribe',
                      email: session.user.email,
                      name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name || '',
                      subscription_tier: 'Free',
                      newsletter_subscribed: true
                    }
                  });
                  
                  console.log('[AuthContext] MailerLite sync completed for new user');
                }
              } catch (syncError) {
                console.error('[AuthContext] MailerLite sync error:', syncError);
              }
            }, 1000);
          }
        }
      }
      setLoading(false);
    });

    // THEN get and validate initial session
    const initSession = async () => {
      console.log('[AuthContext] Initializing session...');
      
      // Set a timeout - if we're still loading after 10 seconds, force completion
      const timeout = setTimeout(() => {
        console.error('[AuthContext] Session initialization timeout - forcing completion');
        setSession(null);
        setUser(null);
        setLoading(false);
      }, 10000);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeout);
        
        console.log('[AuthContext] Session retrieved:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          error: error?.message 
        });
        
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
          
          console.log('[AuthContext] Session validation:', {
            expiresAt: new Date(expiresAt).toISOString(),
            now: new Date(now).toISOString(),
            isExpired: expiresAt < now
          });
          
          if (expiresAt < now) {
            console.warn('[AuthContext] Session expired, clearing');
            localStorage.clear();
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.log('[AuthContext] Valid session found, user:', session.user.email);
            setSession(session);
            setUser(session.user);
          }
        } else {
          console.log('[AuthContext] No session found');
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error('[AuthContext] Init session error:', err);
        localStorage.clear();
        setSession(null);
        setUser(null);
      } finally {
        console.log('[AuthContext] Session initialization complete, loading=false');
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
              subscription_tier: 'Free',
              newsletter_subscribed: true
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
