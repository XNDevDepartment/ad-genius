import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Success() {
  const navigate = useNavigate();
  const { refreshSubscription, subscriptionData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      // Wait a moment for Stripe webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await refreshSubscription();
        toast({
          title: "Subscription activated!",
          description: "Your Pro subscription is now active. You can start creating unlimited content.",
        });
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [refreshSubscription, toast]);

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/account');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {loading ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {loading ? 'Processing Payment...' : 'Payment Successful!'}
          </CardTitle>
          <CardDescription>
            {loading 
              ? 'Please wait while we activate your subscription.'
              : 'Your Pro subscription has been activated successfully.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && subscriptionData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Plan Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="font-medium">{subscriptionData.subscription_tier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits:</span>
                  <span className="font-medium">{subscriptionData.credits_balance}</span>
                </div>
                {subscriptionData.subscription_end && (
                  <div className="flex justify-between">
                    <span>Next billing:</span>
                    <span className="font-medium">
                      {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/create-ugc')} 
              className="w-full"
              disabled={loading}
            >
              Start Creating Content
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/account')}
              className="w-full"
              disabled={loading}
            >
              Go to Account
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Redirecting to your account in 5 seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}