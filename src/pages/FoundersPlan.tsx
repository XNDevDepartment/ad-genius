import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, Star, Video, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useState, useEffect } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { buildProductSchema } from "@/lib/schema";

const FoundersPlan = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();

  const monthlyPrice = 19.99;
  const yearlyPrice = 239.88;
  const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2);

  useEffect(() => {
    trackViewContent('Founders Plan');
  }, []);

  const handleSubscribe = async () => {
    if (loading) {
      console.log('[FoundersPlan] Authentication still loading, please wait...');
      return;
    }

    if (!user) {
      navigate('/account');
      return;
    }

    const checkoutValue = isYearly ? yearlyPrice : monthlyPrice;
    trackInitiateCheckout('founders', checkoutValue, 'EUR');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: 'founders',
          interval: isYearly ? 'year' : 'month'
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setIsProcessing(false);
    }
  };

  const foundersPlanSchema = buildProductSchema({
    name: 'ProduktPix Founders Plan',
    description: 'Exclusive Founders pricing with lifetime access to premium AI product photography features',
    price: isYearly ? yearlyPrice : monthlyPrice,
    priceCurrency: 'EUR',
    features: ['80 credits/month', 'AI Product Photos', 'Video Generation', 'Priority Support'],
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Founders Plan - Special Offer"
        description="Exclusive Founders pricing at €19.99/month. Lock in lifetime access to premium AI product photography features with ProduktPix."
        path="/founders"
        type="product"
        schema={foundersPlanSchema}
      />
      <HeaderSection />
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <Badge variant="secondary" className="mb-4 text-lg px-4 py-2 bg-gradient-primary">
            <Crown className="h-4 w-4 mr-2 inline" />
            {t('foundersPlan.badge')}
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-primary">
            {t('foundersPlan.title')}
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('foundersPlan.subtitle')}
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>{t('foundersPlan.limitedTime')}</span>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
            {t('foundersPlan.monthly')}
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 bg-secondary rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-primary rounded-full transition-transform ${
                isYearly ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
            {t('foundersPlan.yearly')}
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              {t('foundersPlan.save2Months')}
            </Badge>
          )}
        </div>

        {/* Main Card */}
        <Card className="max-w-2xl mx-auto border-2 border-primary shadow-2xl">
          <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">
                  {t('foundersPlan.planName')}
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  {t('foundersPlan.planDescription')}
                </CardDescription>
              </div>
              <Crown className="h-12 w-12" />
            </div>
          </CardHeader>

          <CardContent className="pt-8 pb-8">
            {/* Pricing Display */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">
                  €{isYearly ? yearlyMonthlyEquivalent : monthlyPrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {t('foundersPlan.perMonth')}
                </span>
              </div>
              {isYearly && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('foundersPlan.billedAnnually', { total: yearlyPrice.toFixed(2) })}
                </p>
              )}
              {!isYearly && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('foundersPlan.billedMonthly')}
                </p>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-lg mb-4">
                {t('foundersPlan.whatsIncluded')}
              </h3>
              
              {[
                { icon: Star, key: 'credits' },
                { icon: Check, key: 'images' },
                { icon: Video, key: 'video' },
                { icon: Check, key: 'allScenarios' },
                { icon: Check, key: 'allQualities' },
                { icon: Check, key: 'commercial' },
                { icon: Check, key: 'prioritySupport' },
                { icon: Crown, key: 'lifetimePricing' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {t(`foundersPlan.features.${feature.key}.title`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`foundersPlan.features.${feature.key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleSubscribe}
              disabled={loading || isProcessing}
              className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? t('foundersPlan.loading') : isProcessing ? t('foundersPlan.processing') : t('foundersPlan.cta')}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              {t('foundersPlan.guarantee')}
            </p>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="max-w-2xl mx-auto mt-12 space-y-6">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {t('foundersPlan.whyFounders.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{t('foundersPlan.whyFounders.reason1')}</p>
              <p>{t('foundersPlan.whyFounders.reason2')}</p>
              <p>{t('foundersPlan.whyFounders.reason3')}</p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              {t('foundersPlan.viewOtherPlans')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoundersPlan;
