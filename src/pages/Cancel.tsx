import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { trackCheckoutAbandoned } from '@/lib/metaPixel';

export default function Cancel() {
  const navigate = useNavigate();

  useEffect(() => {
    // Track checkout abandonment
    trackCheckoutAbandoned();
  }, []);

  const handleRetryPayment = () => {
    navigate('/pricing');
  };

  const handleGetDiscount = () => {
    navigate('/promo/3meses');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges were made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-left">
            <h3 className="font-semibold mb-2">Why upgrade?</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Up to 400 credits per month (vs 10 free)</li>
              <li>• All resolutions: 1K, 2K, 4K</li>
              <li>• All aspect ratios including 9:16 & 4:5</li>
              <li>• Video generation & Photoshoot sessions</li>
              <li>• Priority customer support</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button
              onClick={handleGetDiscount}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get 3 Months at €19.99/mo
            </Button>
            <Button
              onClick={handleRetryPayment}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              See All Plans
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Need help? Contact our support team
            </p>
            <Button variant="link" className="text-sm">
              Get Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}