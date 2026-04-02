import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { trackPurchase } from '@/lib/metaPixel';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';

// Plan prices for tracking
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 29, yearly: 290 },
  plus: { monthly: 49, yearly: 490 },
  pro: { monthly: 99, yearly: 990 },
  founders: { monthly: 19.99, yearly: 239.88 }
};

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription, subscriptionData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchaseTracked, setPurchaseTracked] = useState(false);
  const pollRef = useRef<boolean>(false);

  // Poll for subscription activation with retries + direct Stripe sync fallback
  useEffect(() => {
    if (pollRef.current) return;
    pollRef.current = true;

    let attempts = 0;
    const maxAttempts = 10;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        // First attempt: try direct Stripe sync via check-subscription
        if (attempts === 0 || attempts === 3) {
          const { data } = await supabase.functions.invoke('check-subscription');
          if (data?.subscribed) {
            await refreshSubscription();
            setLoading(false);
            return;
          }
        } else {
          await refreshSubscription();
        }
      } catch (error) {
        console.error('Error polling subscription:', error);
      }

      attempts++;

      // Check if subscription is now active via subscriptionData
      // We need to re-check after refreshSubscription updates context
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000);
      } else {
        setLoading(false);
      }
    };

    poll();

    return () => { cancelled = true; };
  }, []);

  // Stop polling once subscription is confirmed active
  useEffect(() => {
    if (subscriptionData?.subscribed && loading) {
      setLoading(false);
    }
  }, [subscriptionData?.subscribed, loading]);

  // Track purchase after subscription data is loaded
  useEffect(() => {
    if (!loading && subscriptionData && !purchaseTracked) {
      const tier = subscriptionData.subscription_tier?.toLowerCase() || 'starter';
      const planPrices = PLAN_PRICES[tier] || PLAN_PRICES.starter;
      
      const subscriptionEnd = subscriptionData.subscription_end ? new Date(subscriptionData.subscription_end) : null;
      const now = new Date();
      const monthsUntilEnd = subscriptionEnd ? (subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30) : 1;
      const isYearly = monthsUntilEnd > 6;
      
      const purchaseValue = isYearly ? planPrices.yearly : planPrices.monthly;
      trackPurchase(purchaseValue, 'EUR', tier);
      setPurchaseTracked(true);
    }
  }, [loading, subscriptionData, purchaseTracked]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/account');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageTransition>
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
              : 'Your subscription has been activated successfully.'
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
              onClick={() => navigate('/create/ugc')} 
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
            {loading ? 'Checking subscription status...' : 'Redirecting to your account in 5 seconds...'}
          </p>
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
