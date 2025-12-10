import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import HeaderSection from '../landing/HeaderSection';
import NavigationHeader from '../NavigationHeader';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthModalProps {
  onSuccess?: (email?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  defaultMode?: 'signin' | 'signup';
}

// Domain validation helper
const validateSignupDomain = async (email: string): Promise<{ allowed: boolean; reason?: string; message?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-signup-domain', {
      body: { email }
    });
    
    if (error) {
      console.error('[AuthModal] Domain validation error:', error);
      return { allowed: true }; // Fail open on error
    }
    
    return data;
  } catch (err) {
    console.error('[AuthModal] Domain validation exception:', err);
    return { allowed: true }; // Fail open on error
  }
};

export const AuthModal = ({ onSuccess, isOpen, onClose, defaultMode = 'signup' }: AuthModalProps) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    profession: '',
  });

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Block email/password signups - only Google allowed
        toast.info('We are currently only accepting new accounts via Google Sign-In while we reinforce our security. Please use the Google button below.');
        setLoading(false);
        return;
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Incorrect email or password.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login successful!');
          onSuccess?.();
          onClose?.();
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ⬇️ New: reset password handler
  const handleResetPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email above to reset your password.');
      return;
    }
    try {
      setResetLoading(true);
      if (typeof resetPassword === 'function') {
        const { error } = await resetPassword(formData.email);
        if (error) throw error;
        toast.success('If an account exists with this email, we have sent reset instructions.');
      } else {
        // If your AuthContext uses a different method name,
        // replace the call above and remove this toast.
        throw new Error('Password reset function is not configured.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  // If using as modal, check isOpen
  if (isOpen === false) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Navigation */}
      {!user && (
        <div className="hidden lg:block">
          <HeaderSection />
        </div>
      )}
      {!user && (
        <div className="lg:hidden">
          <NavigationHeader />
        </div>
      )}
      
      {/* Centered Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md bg-card shadow-lg border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create your account to access the system' 
              : 'Enter your credentials to continue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Security notice for signup mode */}
          {isSignUp && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                We are currently only accepting new accounts via Google Sign-In while we reinforce our security. Please use the Google button below.
              </AlertDescription>
            </Alert>
          )}

          {/* Only show email/password form for sign-in */}
          {!isSignUp && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Reset password link (under the password field) */}
                <div className="mt-1">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading && <Loader className="mr-1 h-3 w-3 animate-spin" />}
                    Reset my password
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Insert your email above and we will send you the reset link
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          )}

          {/* Divider - only show for sign-in */}
          {!isSignUp && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button - Prominent for signup */}
          <Button
            type="button"
            variant={isSignUp ? "default" : "outline"}
            className={`w-full ${isSignUp ? 'mt-2' : ''}`}
            onClick={async () => {
              try {
                setLoading(true);
                const { error } = await signInWithGoogle();
                if (error) {
                  toast.error(error.message || 'Failed to sign in with Google');
                }
              } catch (err: any) {
                toast.error(err?.message || 'An error occurred with Google sign-in');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};
