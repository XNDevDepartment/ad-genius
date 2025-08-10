import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Cancel() {
  const navigate = useNavigate();

  const handleRetryPayment = () => {
    navigate('/pricing');
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
            <h3 className="font-semibold mb-2">Why upgrade to Pro?</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 100 credits per month (vs 10 free)</li>
              <li>• Priority generation queue</li>
              <li>• Advanced customization options</li>
              <li>• Priority customer support</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleRetryPayment} 
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
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