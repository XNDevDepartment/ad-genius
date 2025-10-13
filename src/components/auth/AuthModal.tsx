import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader, Eye, EyeOff } from 'lucide-react';
import HeaderSection from '../landing/HeaderSection';
import NavigationHeader from '../NavigationHeader';

interface AuthModalProps {
  onSuccess?: (email?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal = ({ onSuccess, isOpen, onClose, defaultMode = 'signup' }: AuthModalProps) => {
  // ⬇️ Added resetPassword here
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false); // ⬅️ new
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
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name,
          profession: formData.profession,
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please try signing in.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created successfully! Please check your email.');
          onSuccess?.(formData.email);
          onClose?.();
        }
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={isSignUp}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g., Designer, Developer, Marketer"
                  />
                </div>
              </>
            )}
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

              {/* ⬇️ Reset password link (under the password field) */}
              {!isSignUp && (
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
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

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
