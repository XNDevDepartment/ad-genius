import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, CreditCard, Download, Calendar, Zap, Crown, ExternalLink, RotateCcw, ChevronDown, Images, Sparkles, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { InvoicesList } from "./InvoicesList";
import { CreditTransactionsList } from "./CreditTransactionsList";
import { PromoCodeRedemption } from "./PromoCodeRedemption";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BillingPanelProps {
  onClose: () => void;
}

export const BillingPanel = ({ onClose }: BillingPanelProps) => {
  const { user, subscriptionData, subscriptionLoading, refreshSubscription } = useAuth();
  const { 
    getUsagePercentage, 
    getRemainingCredits, 
    getTotalCredits, 
    getUsedCredits, 
    getDaysUntilReset,
    tier,
    isFreeTier
  } = useCredits();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Customer portal error:', error);
        
        if (error.message?.includes('billing portal') || error.message?.includes('not configured')) {
          toast({
            title: t("common.error"),
            description: "The billing portal is not configured. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: t("common.error"),
            description: error.message || t("account.errorSaving"),
            variant: "destructive",
          });
        }
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("account.errorSaving"),
        variant: "destructive",
      });
    }
  };

  const handleRefreshSubscription = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refreshSubscription();
      toast({
        title: "Subscription Refreshed",
        description: "Your subscription data has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: t("common.error"),
        description: "Failed to refresh subscription data.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const isSubscribed = () => {
    if (!subscriptionData) return false;
    const isNotFree = subscriptionData.subscription_tier !== 'Free';
    const hasValidSubscription = subscriptionData.subscribed;
    return isNotFree || hasValidSubscription;
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
      'Free': t("account.billing.free"),
      'Founders': '€19.99/month',
      'Starter': '€29/month',
      'Plus': '€49/month', 
      'Pro': '€99/month'
    };
    return prices[tier as keyof typeof prices] || t("account.billing.free");
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t("account.billing.title")}</h2>
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

  // ===== MOBILE LAYOUT =====
  const MobileBillingLayout = () => (
    <div className="lg:hidden space-y-5">
      {/* 1. Current Plan Badge */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <p className="text-sm font-medium opacity-80">{t('mobileUpgrade.billing.currentPlan')}</p>
        <h2 className="text-3xl font-bold mt-1">{tier}</h2>
        <p className="text-sm opacity-70 mt-1">{getPlanPrice(tier)}</p>
        {isSubscribed() && (
          <Badge variant="secondary" className="mt-3 bg-primary-foreground/20 text-primary-foreground border-0">
            {t("account.billing.active")}
          </Badge>
        )}
      </div>

      {/* 2. What you unlock with Plus (Free tier only) */}
      {isFreeTier() && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-base font-bold text-foreground">{t('mobileUpgrade.billing.whatYouUnlock')}</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Images className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{t('mobileUpgrade.billing.creditsPerMonth')}</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{t('mobileUpgrade.billing.highResolution')}</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{t('mobileUpgrade.billing.prioritySupport')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* 3. Primary CTA */}
      {isFreeTier() ? (
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/80"
          onClick={() => window.location.href = '/pricing'}
        >
          {t('mobileUpgrade.billing.unlockPlus')}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleManageSubscription}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t("account.billing.manageSubscription")}
        </Button>
      )}

      {/* 4. Billing details (collapsed) */}
      <Collapsible open={billingOpen} onOpenChange={setBillingOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            {t('mobileUpgrade.billing.billingDetails')}
            <ChevronDown className={`h-4 w-4 transition-transform ${billingOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Credit usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t("account.billing.creditUsage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("account.billing.creditsUsed")}</span>
                  <span>{getUsedCredits()} / {getTotalCredits()}</span>
                </div>
                <Progress value={getUsagePercentage()} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 border rounded-lg">
                  <div className="text-xl font-semibold">{getRemainingCredits()}</div>
                  <div className="text-xs text-muted-foreground">{t("account.billing.remaining")}</div>
                </div>
                <div className="p-2 border rounded-lg">
                  <div className="text-xl font-semibold">{getDaysUntilReset()}</div>
                  <div className="text-xs text-muted-foreground">{t("account.billing.daysLeft")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PromoCodeRedemption onSuccess={handleRefreshSubscription} />

          {isSubscribed() && (
            <>
              <PaymentMethodCard />
              <InvoicesList />
            </>
          )}

          <CreditTransactionsList />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ===== DESKTOP LAYOUT (unchanged) =====
  const DesktopBillingLayout = () => (
    <div className="hidden lg:block space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {t("account.billing.currentPlan")}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshSubscription}
              disabled={refreshing}
              className="ml-auto"
            >
              <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>{t("account.billing.currentPlanDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{tier} {t("account.billing.plan")}</h3>
              <p className="text-sm text-muted-foreground">
                {getPlanPrice(tier)}
              </p>
            </div>
            <Badge variant={isSubscribed() ? "default" : "secondary"}>
              {isSubscribed() ? t("account.billing.active") : t("account.billing.free")}
            </Badge>
          </div>

          <div className="space-y-2">
            {subscriptionData?.subscribed && (
              <div className="flex justify-between text-sm">
                <span>{t("account.billing.nextBilling")}</span>
                <span>{formatSubscriptionEnd(subscriptionData.subscription_end)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>{t("account.billing.monthlyCredits")}</span>
              <span>{getTotalCredits()} {t("account.billing.credits")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {isSubscribed() ? (
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleManageSubscription}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("account.billing.manageSubscription")}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/pricing'}
              >
                {t("account.billing.upgradePlan")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t("account.billing.creditUsage")}
          </CardTitle>
          <CardDescription>{t("account.billing.creditUsageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("account.billing.creditsUsed")}</span>
              <span>{getUsedCredits()} / {getTotalCredits()}</span>
            </div>
            <Progress value={getUsagePercentage()} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-semibold">{getRemainingCredits()}</div>
              <div className="text-sm text-muted-foreground">{t("account.billing.remaining")}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-semibold">{getDaysUntilReset()}</div>
              <div className="text-sm text-muted-foreground">{t("account.billing.daysLeft")}</div>
            </div>
          </div>

          {!isSubscribed() && (
            <Button 
              className="w-full"
              onClick={() => window.location.href = '/pricing'}
            >
              {t("account.billing.upgradeForMore")}
            </Button>
          )}
        </CardContent>
      </Card>

      <PromoCodeRedemption onSuccess={handleRefreshSubscription} />

      {isSubscribed() && (
        <>
          <PaymentMethodCard />
          <InvoicesList />
        </>
      )}

      <CreditTransactionsList />

      {isSubscribed() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("account.billing.subscriptionManagement")}
            </CardTitle>
            <CardDescription>{t("account.billing.subscriptionManagementDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{t("account.billing.subscriptionDetails")}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("account.billing.plan")}:</span>
                    <span>{subscriptionData.subscription_tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("account.billing.status")}:</span>
                    <span className="text-green-600">{t("account.billing.active")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("account.billing.renewal")}:</span>
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
                {t("account.billing.openStripePortal")}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                {t("account.billing.stripePortalDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div>
      <MobileBillingLayout />
      <DesktopBillingLayout />
    </div>
  );
};
