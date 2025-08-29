
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, CreditCard, Download, Calendar, Zap, Crown, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BillingPanelProps {
  onClose: () => void;
}

export const BillingPanel = ({ onClose }: BillingPanelProps) => {
  const { user, subscriptionData, subscriptionLoading } = useAuth();
  const { 
    getUsagePercentage, 
    getRemainingCredits, 
    getTotalCredits, 
    getUsedCredits, 
    getDaysUntilReset,
    tier
  } = useCredits();
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatSubscriptionEnd = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanPrice = (tier: string) => {
    const prices = {
      'Free': 'Free',
      'Starter': '€29/month',
      'Plus': '€49/month', 
      'Pro': '€99/month'
    };
    return prices[tier as keyof typeof prices] || 'Free';
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Billing & Usage</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Billing & Usage</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
          <CardDescription>Manage your subscription and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{tier} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {getPlanPrice(tier)}
              </p>
            </div>
            <Badge variant={subscriptionData?.subscribed ? "default" : "secondary"}>
              {subscriptionData?.subscribed ? "Active" : "Free"}
            </Badge>
          </div>

          <div className="space-y-2">
            {subscriptionData?.subscribed && (
              <div className="flex justify-between text-sm">
                <span>Next billing date</span>
                <span>{formatSubscriptionEnd(subscriptionData.subscription_end)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Monthly credit allowance</span>
              <span>{getTotalCredits()} credits</span>
            </div>
          </div>

          <div className="flex gap-2">
            {subscriptionData?.subscribed ? (
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleManageSubscription}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credit Usage
          </CardTitle>
          <CardDescription>Track your monthly generation credits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Credits used this month</span>
              <span>{getUsedCredits()} / {getTotalCredits()}</span>
            </div>
            <Progress value={getUsagePercentage()} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-semibold">{getRemainingCredits()}</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-semibold">{getDaysUntilReset()}</div>
              <div className="text-sm text-muted-foreground">Days left</div>
            </div>
          </div>

          {!subscriptionData?.subscribed && (
            <Button 
              className="w-full"
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade for More Credits
            </Button>
          )}
        </CardContent>
      </Card>

      {subscriptionData?.subscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription Management
            </CardTitle>
            <CardDescription>Manage your subscription and billing details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Subscription Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span>{subscriptionData.subscription_tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Renewal:</span>
                    <span>{formatSubscriptionEnd(subscriptionData.subscription_end)}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleManageSubscription}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Customer Portal
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Manage your subscription, update payment methods, and view billing history in Stripe's secure portal.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
