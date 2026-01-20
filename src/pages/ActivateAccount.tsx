import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ActivationState = 'loading' | 'success' | 'already_activated' | 'expired' | 'invalid' | 'error';

const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshSubscription } = useAuth();
  const [state, setState] = useState<ActivationState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setErrorMessage('No activation token provided.');
      return;
    }

    activateAccount(token);
  }, [token]);

  const activateAccount = async (activationToken: string) => {
    setState('loading');
    
    try {
      const { data, error } = await supabase.functions.invoke('activate-account', {
        body: { token: activationToken }
      });

      if (error) {
        console.error('Activation error:', error);
        setState('error');
        setErrorMessage(error.message || 'Failed to activate account');
        return;
      }

      if (data.alreadyActivated) {
        setState('already_activated');
      } else if (data.success) {
        setState('success');
        // Refresh auth context to update activation status
        if (refreshSubscription) {
          await refreshSubscription();
        }
      } else if (data.code === 'TOKEN_EXPIRED') {
        setState('expired');
        setErrorMessage(data.error);
      } else if (data.code === 'INVALID_TOKEN') {
        setState('invalid');
        setErrorMessage(data.error);
      } else {
        setState('error');
        setErrorMessage(data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      console.error('Activation exception:', err);
      setState('error');
      setErrorMessage(err.message || 'Failed to activate account');
    }
  };

  const handleResendActivation = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.functions.invoke('generate-activation-token');
      if (error) throw error;
      
      setState('loading');
      setErrorMessage('');
      // Show success message
      alert('Activation email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setErrorMessage('Failed to resend activation email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Activating your account...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Activated!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been successfully activated. You now have full access to all features, including video generation.
            </p>
            <Button onClick={() => navigate('/create')} size="lg">
              Start Creating
            </Button>
          </div>
        );

      case 'already_activated':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Already Activated</h2>
            <p className="text-muted-foreground mb-6">
              Your account is already activated. Enjoy full access to all features!
            </p>
            <Button onClick={() => navigate('/create')} size="lg">
              Go to Dashboard
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage || 'This activation link has expired. Please request a new one.'}
            </p>
            {user ? (
              <Button onClick={handleResendActivation} disabled={resendLoading} size="lg">
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Activation Email
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => navigate('/signin')} size="lg">
                Sign In to Resend
              </Button>
            )}
          </div>
        );

      case 'invalid':
      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Activation Failed</h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage || 'We could not activate your account. The link may be invalid or already used.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Button onClick={handleResendActivation} disabled={resendLoading}>
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Activation Email
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => navigate('/signin')}>
                  Sign In
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Account Activation</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivateAccount;
