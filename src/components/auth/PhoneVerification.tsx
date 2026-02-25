import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Phone, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

// Runtime guard for WebView compatibility (Instagram iOS, etc.)
const OTP_AVAILABLE = typeof InputOTP === 'function';

interface PhoneVerificationProps {
  onVerified?: () => void;
  initialPhone?: string;
}

export const PhoneVerification = ({ onVerified, initialPhone = '' }: PhoneVerificationProps) => {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 'otp') {
      setCanResend(true);
    }
  }, [countdown, step]);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: t('phoneVerification.errors.phoneRequired', 'Phone number required'),
        description: t('phoneVerification.errors.enterPhone', 'Please enter your phone number'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: phoneNumber },
      });

      if (error) throw error;

      if (data?.success) {
        setStep('otp');
        setCountdown(60); // 60 seconds before resend
        setCanResend(false);
        toast({
          title: t('phoneVerification.otpSent', 'Code sent'),
          description: t('phoneVerification.checkPhone', 'Check your phone for the verification code'),
        });
      } else {
        const errorCode = data?.code;
        let errorTitle = t('phoneVerification.errors.sendFailed', 'Failed to send code');
        let errorDesc = data?.error || t('phoneVerification.errors.tryAgain', 'Please try again');
        
        switch (errorCode) {
          case 'RATE_LIMIT_EXCEEDED':
            errorTitle = t('phoneVerification.errors.tooManyAttempts', 'Too many attempts');
            errorDesc = t('phoneVerification.errors.tooManyAttemptsDesc', 'Please wait a few minutes before trying again.');
            break;
          case 'INVALID_PHONE_FORMAT':
            errorTitle = t('phoneVerification.errors.invalidFormat', 'Invalid phone number');
            errorDesc = t('phoneVerification.errors.invalidFormatDesc', 'Please enter a valid number with country code.');
            break;
          case 'SMS_FAILED':
            errorTitle = t('phoneVerification.errors.smsFailed', 'SMS could not be delivered');
            errorDesc = t('phoneVerification.errors.smsFailedDesc', 'Please check your phone number and try again.');
            break;
        }
        
        toast({
          title: errorTitle,
          description: errorDesc,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: t('phoneVerification.errors.sendFailed', 'Failed to send code'),
        description: t('phoneVerification.errors.tryAgain', 'Please try again'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: t('phoneVerification.errors.invalidCode', 'Invalid code'),
        description: t('phoneVerification.errors.enterFullCode', 'Please enter the 6-digit code'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone_number: phoneNumber, code: otpCode },
      });

      if (error) throw error;

      if (data?.verified) {
        setStep('verified');
        toast({
          title: t('phoneVerification.verified', 'Phone verified'),
          description: t('phoneVerification.verifiedDesc', 'Your phone number has been verified successfully'),
        });
        onVerified?.();
      } else {
        const errorCode = data?.code;
        let errorTitle = t('phoneVerification.errors.verifyFailed', 'Verification failed');
        let errorDesc = data?.error || t('phoneVerification.errors.invalidOrExpired', 'Invalid or expired code');
        
        switch (errorCode) {
          case 'CODE_EXPIRED':
            errorTitle = t('phoneVerification.errors.codeExpired', 'Code expired');
            errorDesc = t('phoneVerification.errors.codeExpiredDesc', 'Your code has expired. Please request a new one.');
            break;
          case 'INVALID_CODE':
            errorTitle = t('phoneVerification.errors.wrongCode', 'Wrong code');
            errorDesc = t('phoneVerification.errors.wrongCodeDesc', "The code you entered doesn't match. Please try again.");
            break;
          case 'MAX_ATTEMPTS_EXCEEDED':
            errorTitle = t('phoneVerification.errors.tooManyAttempts', 'Too many attempts');
            errorDesc = t('phoneVerification.errors.tooManyAttemptsDesc', 'Please wait a few minutes before trying again.');
            setStep('phone');
            break;
          case 'SESSION_NOT_FOUND':
            errorTitle = t('phoneVerification.errors.sessionExpired', 'Session expired');
            errorDesc = t('phoneVerification.errors.sessionExpiredDesc', 'Please start the verification process again.');
            setStep('phone');
            break;
        }
        
        toast({
          title: errorTitle,
          description: errorDesc,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: t('phoneVerification.errors.verifyFailed', 'Verification failed'),
        description: t('phoneVerification.errors.invalidOrExpired', 'Invalid or expired code'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setOtpCode('');
    handleSendOtp();
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtpCode('');
    setCountdown(0);
    setCanResend(false);
  };

  if (step === 'verified') {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <p className="text-lg font-medium text-foreground">
          {t('phoneVerification.phoneVerified', 'Phone number verified')}
        </p>
        <p className="text-sm text-muted-foreground">{phoneNumber}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'phone' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t('phoneVerification.phoneNumber', 'Phone Number')}
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+351 912 345 678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('phoneVerification.includeCountryCode', 'Include country code (e.g., +351 for Portugal)')}
            </p>
          </div>
          <Button
            onClick={handleSendOtp}
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('phoneVerification.sending', 'Sending...')}
              </>
            ) : (
              t('phoneVerification.sendCode', 'Send Verification Code')
            )}
          </Button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('phoneVerification.codeSentTo', 'Code sent to')}
            </p>
            <p className="font-medium">{phoneNumber}</p>
            <button
              onClick={handleChangeNumber}
              className="text-xs text-primary hover:underline"
              disabled={isLoading}
            >
              {t('phoneVerification.changeNumber', 'Change number')}
            </button>
          </div>

          <div className="flex justify-center">
            {OTP_AVAILABLE ? (
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={isLoading}
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
            ) : (
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono max-w-[200px]"
                autoComplete="one-time-code"
                disabled={isLoading}
              />
            )}
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={isLoading || otpCode.length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('phoneVerification.verifying', 'Verifying...')}
              </>
            ) : (
              t('phoneVerification.verify', 'Verify Code')
            )}
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('phoneVerification.resendIn', 'Resend code in')} {countdown}s
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isLoading || !canResend}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('phoneVerification.resendCode', 'Resend Code')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
