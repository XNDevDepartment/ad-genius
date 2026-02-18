import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader, Eye, EyeOff, Phone, ArrowLeft } from 'lucide-react';
import HeaderSection from '../landing/HeaderSection';
import NavigationHeader from '../NavigationHeader';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';

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
      return { allowed: true };
    }
    
    return data;
  } catch (err) {
    console.error('[AuthModal] Domain validation exception:', err);
    return { allowed: true };
  }
};

// Generate unique session ID
const generateSessionId = () => {
  return `signup_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

const GOOGLE_BUTTON_CLASS =
  "w-full bg-white text-[#3c4043] border border-[#dadce0] hover:bg-[#f8f9fa] hover:text-[#3c4043] active:bg-[#f1f3f4] shadow-sm focus-visible:ring-2 focus-visible:ring-[#4285f4] focus-visible:ring-offset-2 dark:bg-white dark:text-[#3c4043]";

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.14-3.09-.4-4.55H24v9.02h12.93c-.56 3.02-2.24 5.58-4.76 7.3l7.29 5.64c4.26-3.93 6.72-9.72 6.72-17.41z"
    />
    <path
      fill="#FBBC05"
      d="M10.54 28.41c-.48-1.45-.76-3-.76-4.41s.27-2.96.76-4.41V13.4H2.56C.92 16.64 0 20.26 0 24s.92 7.36 2.56 10.6l7.98-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.14 15.9-5.82l-7.29-5.64c-2.02 1.36-4.62 2.16-8.61 2.16-6.26 0-11.57-4.22-13.46-9.9l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export const AuthModal = ({ onSuccess, isOpen, onClose, defaultMode = 'signup' }: AuthModalProps) => {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Multi-step signup state
  const [signupStep, setSignupStep] = useState<'form' | 'otp' | 'creating'>('form');
  const [sessionId, setSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const { user } = useAuth();

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Send OTP
  const handleSendOtp = async () => {
    if (!formData.email || !formData.password || !formData.phone) {
      toast.error(t('auth.signup.fillAllFields', 'Please fill in all fields'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('auth.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast.error(t('auth.signup.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }

    // Validate phone format
    const cleanPhone = formData.phone.replace(/\s+/g, '');
    if (!/^\+?\d{9,15}$/.test(cleanPhone)) {
      toast.error(t('auth.signup.invalidPhone', 'Please enter a valid phone number with country code'));
      return;
    }

    // Validate email domain
    setSendingOtp(true);
    const domainCheck = await validateSignupDomain(formData.email);
    if (!domainCheck.allowed) {
      toast.error(domainCheck.message || t('auth.signup.domainNotAllowed', 'This email domain is not allowed'));
      setSendingOtp(false);
      return;
    }

    try {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      const { data, error } = await supabase.functions.invoke('send-otp-signup', {
        body: {
          phone_number: cleanPhone,
          session_id: newSessionId,
        }
      });

      if (error || !data?.success) {
        const errorCode = data?.code;
        let errorMessage = data?.error || error?.message || t('auth.signup.sendCodeError', 'Failed to send verification code');
        
        switch (errorCode) {
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = t('auth.signup.errors.rateLimitExceeded', 'Too many attempts. Please wait before trying again.');
            break;
          case 'INVALID_PHONE_FORMAT':
            errorMessage = t('auth.signup.errors.invalidPhoneFormat', 'Please enter a valid phone number with country code');
            break;
          case 'SMS_FAILED':
            errorMessage = t('auth.signup.errors.smsFailed', 'Could not send SMS. Please check your number and try again.');
            break;
        }
        
        toast.error(errorMessage);
        setSendingOtp(false);
        return;
      }

      toast.success(t('auth.signup.codeSent', 'Verification code sent!'));
      setSignupStep('otp');
      setResendCountdown(60);
    } catch (err: any) {
      console.error('[AuthModal] Send OTP error:', err);
      toast.error(t('auth.signup.sendCodeError', 'Failed to send verification code'));
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error(t('auth.signup.enterFullCode', 'Please enter the 6-digit code'));
      return;
    }

    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-signup', {
        body: {
          code: otpCode,
          session_id: sessionId,
        }
      });

      if (error || !data?.verified) {
        const errorCode = data?.code;
        let errorMessage = data?.error || error?.message || t('auth.signup.invalidCode', 'Invalid verification code');
        
        switch (errorCode) {
          case 'CODE_EXPIRED':
            toast.error(t('auth.signup.errors.codeExpired', 'Your code has expired'), {
              description: t('auth.signup.errors.codeExpiredHint', 'Click "Resend Code" to get a new one.')
            });
            break;
          case 'INVALID_CODE':
            toast.error(t('auth.signup.errors.wrongCode', 'Incorrect code'), {
              description: t('auth.signup.errors.wrongCodeHint', 'Please check your SMS and try again.')
            });
            break;
          case 'MAX_ATTEMPTS_EXCEEDED':
            toast.error(t('auth.signup.errors.maxAttemptsExceeded', 'Too many incorrect attempts'), {
              description: t('auth.signup.errors.maxAttemptsHint', 'Please request a new verification code.')
            });
            setSignupStep('form');
            break;
          case 'SESSION_NOT_FOUND':
            toast.error(t('auth.signup.errors.sessionExpired', 'Verification session expired'), {
              description: t('auth.signup.errors.sessionExpiredHint', 'Please start the verification process again.')
            });
            setSignupStep('form');
            break;
          default:
            toast.error(errorMessage);
        }
        
        setVerifyingOtp(false);
        return;
      }

      setVerifiedPhone(data.phone_number);
      setVerificationToken(data.verification_token);
      
      // Now create the account - pass token directly since state update is async
      await handleCreateAccount(data.phone_number, data.verification_token);
    } catch (err: any) {
      console.error('[AuthModal] Verify OTP error:', err);
      toast.error(t('auth.signup.invalidCode', 'Invalid verification code'));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Create account after phone verification - server-side validated signup
  const handleCreateAccount = async (phoneNumber: string, token?: string) => {
    setSignupStep('creating');
    
    // Use passed token or fall back to state (passed token is more reliable)
    const tokenToUse = token || verificationToken;
    
    console.log('[AuthModal] Creating account with:', {
      hasEmail: !!formData.email,
      hasPassword: !!formData.password,
      hasPhone: !!phoneNumber,
      hasToken: !!tokenToUse,
    });
    
    try {
      // Use secure edge function that validates verification token server-side
      const { data, error } = await supabase.functions.invoke('signup-with-phone', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone_number: phoneNumber,
          verification_token: tokenToUse,
        }
      });

      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'Failed to create account';
        
        if (data?.code === 'PHONE_ALREADY_USED') {
          toast.error(t('auth.signup.phoneAlreadyUsed', 'This phone number is already associated with another account.'));
        } else if (data?.code === 'EMAIL_ALREADY_USED' || errorMessage.includes('already registered')) {
          toast.error(t('auth.signup.emailExists', 'This email is already registered'));
        } else {
          toast.error(errorMessage);
        }
        setSignupStep('form');
        return;
      }

      // Auto-login after successful signup
      const { error: signInError } = await signIn(formData.email, formData.password);
      if (signInError) {
        console.warn('[AuthModal] Auto-login failed:', signInError);
        toast.success(t('auth.signup.accountCreatedPleaseLogin', 'Account created! Please sign in.'));
        setIsSignUp(false);
        setSignupStep('form');
        return;
      }

      toast.success(t('auth.signup.welcomeMessage', 'Welcome! Your account is ready.'));
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error('[AuthModal] Create account error:', err);
      toast.error(err.message || t('auth.signup.createError', 'Failed to create account'));
      setSignupStep('form');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    
    setSendingOtp(true);
    try {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setOtpCode('');

      const cleanPhone = formData.phone.replace(/\s+/g, '');
      const { data, error } = await supabase.functions.invoke('send-otp-signup', {
        body: {
          phone_number: cleanPhone,
          session_id: newSessionId,
        }
      });

      if (error || !data?.success) {
        const errorCode = data?.code;
        let errorMessage = data?.error || error?.message || t('auth.signup.resendError', 'Failed to resend code');
        
        if (errorCode === 'RATE_LIMIT_EXCEEDED') {
          errorMessage = t('auth.signup.errors.rateLimitExceeded', 'Too many attempts. Please wait before trying again.');
        }
        
        toast.error(errorMessage);
        setSendingOtp(false);
        return;
      }

      toast.success(t('auth.signup.codeResent', 'New code sent!'));
      setResendCountdown(60);
    } catch (err: any) {
      toast.error(t('auth.signup.resendError', 'Failed to resend code'));
    } finally {
      setSendingOtp(false);
    }
  };

  // Sign in handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('auth.invalidCredentials', 'Incorrect email or password.'));
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(t('auth.loginSuccess', 'Login successful!'));
        onSuccess?.();
        onClose?.();
      }
    } catch (error) {
      toast.error(t('auth.unexpectedError', 'An unexpected error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  // Reset password handler
  const handleResetPassword = async () => {
    if (!formData.email) {
      toast.error(t('auth.enterEmailForReset', 'Please enter your email above to reset your password.'));
      return;
    }
    try {
      setResetLoading(true);
      if (typeof resetPassword === 'function') {
        const { error } = await resetPassword(formData.email);
        if (error) throw error;
        toast.success(t('auth.resetEmailSent', 'If an account exists with this email, we have sent reset instructions.'));
      } else {
        throw new Error('Password reset function is not configured.');
      }
    } catch (err: any) {
      toast.error(err?.message || t('auth.resetError', 'Unable to send reset email.'));
    } finally {
      setResetLoading(false);
    }
  };

  // Go back from OTP step
  const handleBackFromOtp = () => {
    setSignupStep('form');
    setOtpCode('');
    setSessionId('');
  };

  // Reset form when switching modes
  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setSignupStep('form');
    setOtpCode('');
    setSessionId('');
    setVerifiedPhone('');
    setVerificationToken('');
  };

  if (isOpen === false) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
      
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md bg-card shadow-lg border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSignUp 
                ? signupStep === 'otp' 
                  ? t('auth.signup.verifyPhone', 'Verify Your Phone')
                  : signupStep === 'creating'
                    ? t('auth.signup.creatingAccount', 'Creating Account...')
                    : t('auth.createAccount', 'Create Account')
                : t('auth.signIn', 'Sign In')
              }
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? signupStep === 'otp'
                  ? t('auth.signup.enterCode', 'Enter the 6-digit code sent to your phone')
                  : signupStep === 'creating'
                    ? t('auth.signup.pleaseWait', 'Please wait...')
                    : t('auth.signup.fillDetails', 'Create your account to get started')
                : t('auth.enterCredentials', 'Enter your credentials to continue')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* SIGNUP FLOW */}
            {isSignUp && (
              <>
{/* Google signup option - only show on form step */}
                {signupStep === 'form' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className={GOOGLE_BUTTON_CLASS}
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const { error } = await signInWithGoogle();
                          if (error) {
                            toast.error(error.message || t('auth.googleError', 'Failed to sign in with Google'));
                          }
                        } catch (err: any) {
                          toast.error(err?.message || t('auth.googleError', 'An error occurred with Google sign-in'));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <GoogleLogo className="mr-2 h-4 w-4" />
                      {t('auth.signUpWithGoogle', 'Sign up with Google')}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith', 'Or continue with')}</span>
                      </div>
                    </div>
                  </>
                )}
            
                {/* Step 1: Form */}
                {signupStep === 'form' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('auth.name', 'Name')}</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('auth.namePlaceholder', 'Your name')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={t('auth.passwordPlaceholder', 'Min 6 characters')}
                          required
                          minLength={6}
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
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('auth.phone', 'Phone Number')}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+351 912 345 678"
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.signup.phoneHint', 'Include country code (e.g., +351)')}
                      </p>
                    </div>

                    <Button type="submit" disabled={sendingOtp} className="w-full">
                      {sendingOtp && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.signup.sendCode', 'Send Verification Code')}
                    </Button>
                  </form>
                )}

                {/* Step 2: OTP Verification */}
                {signupStep === 'otp' && (
                  <div className="space-y-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackFromOtp}
                      className="mb-2 -ml-2"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('auth.back', 'Back')}
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('auth.signup.codeSentTo', 'Code sent to')} <span className="font-medium text-foreground">{formData.phone}</span>
                      </p>
                      
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={(value) => setOtpCode(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    <Button 
                      onClick={handleVerifyOtp} 
                      disabled={verifyingOtp || otpCode.length !== 6} 
                      className="w-full"
                    >
                      {verifyingOtp && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.signup.verifyAndCreate', 'Verify & Create Account')}
                    </Button>

                    <div className="text-center">
                      <Button
                        variant="link"
                        onClick={handleResendOtp}
                        disabled={resendCountdown > 0 || sendingOtp}
                        className="text-sm"
                      >
                        {resendCountdown > 0 
                          ? `${t('auth.signup.resendIn', 'Resend in')} ${resendCountdown}s`
                          : t('auth.signup.resendCode', 'Resend Code')
                        }
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Creating Account */}
                {signupStep === 'creating' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">{t('auth.signup.creatingAccount', 'Creating your account...')}</p>
                  </div>
                )}
              </>
            )}

            {/* SIGN IN FLOW */}
            {!isSignUp && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={GOOGLE_BUTTON_CLASS}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const { error } = await signInWithGoogle();
                      if (error) {
                        toast.error(error.message || t('auth.googleError', 'Failed to sign in with Google'));
                      }
                    } catch (err: any) {
                      toast.error(err?.message || t('auth.googleError', 'An error occurred with Google sign-in'));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <GoogleLogo className="mr-2 h-4 w-4" />
                  {t('auth.signInWithGoogle', 'Sign in with Google')}
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith', 'Or continue with')}</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
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

                    <div className="mt-1">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-xs"
                        onClick={handleResetPassword}
                        disabled={resetLoading}
                      >
                        {resetLoading && <Loader className="mr-1 h-3 w-3 animate-spin" />}
                        {t('auth.resetPassword', 'Reset my password')}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        {t('auth.resetHint', 'Insert your email above and we will send you the reset link')}
                      </p>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {t('auth.signIn', 'Sign In')}
                  </Button>
                </form>

              </>
            )}

            {/* Mode switch - hide during OTP/creating steps */}
            {signupStep === 'form' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? t('auth.hasAccount', 'Already have an account?') : t('auth.noAccount', "Don't have an account?")}
                </p>
                <Button
                  variant="link"
                  onClick={handleModeSwitch}
                  className="text-sm"
                >
                  {isSignUp ? t('auth.signIn', 'Sign In') : t('auth.createAccount', 'Create Account')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
