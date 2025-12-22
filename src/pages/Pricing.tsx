
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Star, Zap, Shield, Crown, Video as VideoIcon, TreePine, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useEffect, useState } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { useTranslation } from "react-i18next";

// Features will be translated dynamically using t() in the component
const plans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24.17,
    period: "/month",
    description: "Perfect for small businesses and content creators",
    credits: 80,
    features: [
      "credits",
      "images",
      "maxImages",
      "scenarios",
      "support"
    ],
    limitations: [],
    cta: "Start Creating",
    popular: false,
    icon: <Star className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-primary/10 to-primary/5"
  },
  {
    id: "plus",
    name: "Plus",
    monthlyPrice: 49,
    yearlyPrice: 40.83,
    period: "/month",
    description: "Best for agencies and growing businesses",
    credits: 200,
    features: [
      "credits",
      "images",
      "maxImages",
      "scenarios",
      "support",
      "commercial"
    ],
    limitations: [],
    cta: "Go Plus",
    popular: true,
    icon: <Crown className="h-6 w-6" />,
    bgClass: "bg-gradient-primary"
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 99,
    yearlyPrice: 82.50,
    period: "/month",
    description: "For high-volume users and enterprises",
    credits: 400,
    features: [
      "credits",
      "images",
      "maxImages",
      "scenarios",
      "support"
    ],
    limitations: [],
    cta: "Go Pro",
    popular: false,
    icon: <Shield className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-accent to-secondary"
  }
];

// const comparisonFeatures = [
//   { feature: "Monthly Credits", founders: "80", starter: "80", plus: "200", pro: "400" },
//   { feature: "Max Images per Generation", founders: "3", starter: "3", plus: "3", pro: "3" },
//   { feature: "High Quality Images/Month", founders: "40", starter: "40", plus: "100", pro: "200" },
//   { feature: "Medium Quality Images/Month", founders: "53", starter: "53", plus: "133", pro: "266" },
//   { feature: "Low Quality Images/Month", founders: "80", starter: "80", plus: "200", pro: "400" },
//   { feature: "Image-to-Video Generation", founders: true, starter: false, plus: true, pro: true },
//   { feature: "Video Duration Options", founders: "5s & 10s", starter: "-", plus: "5s & 10s", pro: "5s & 10s" },
//   { feature: "Video Cost (5s)", founders: "5 credits", starter: "-", plus: "5 credits", pro: "5 credits" },
//   { feature: "Video Cost (10s)", founders: "10 credits", starter: "-", plus: "10 credits", pro: "10 credits" },
//   { feature: "UGC Scenarios Available", founders: "unlimited", starter: "unlimited", plus: "unlimited", pro: "unlimited" },
//   { feature: "All Quality Levels", founders: true, starter: true, plus: true, pro: true },
//   { feature: "Commercial Usage", founders: true, starter: true, plus: true, pro: true },
//   { feature: "Priority Support", founders: true, starter: true, plus: true, pro: true },
//   { feature: "Live Chat Support", founders: false, starter: false, plus: true, pro: true },
//   { feature: "Dedicated Manager", founders: false, starter: false, plus: false, pro: true },
//   { feature: "Lifetime Pricing", founders: true, starter: false, plus: false, pro: false }
// ];
  // Features will be translated dynamically using t()
  const comparisonFeatures = [
    { featureKey: "monthlyCredits", starter: "80", plus: "200", pro: "400" },
    { featureKey: "imagesPerMonth", starter: "80", plus: "200", pro: "400" },
    { featureKey: "maxImagesPerGeneration", starter: "3", plus: "3", pro: "3" },
    { featureKey: "imageToVideo", starter: false, plus: true, pro: true },
    { featureKey: "videoDuration", starter: "-", plus: "5s & 10s", pro: "5s & 10s" },
    { featureKey: "ugcScenarios", starter: "unlimited", plus: "unlimited", pro: "unlimited" },
    { featureKey: "allQualityLevels", starter: true, plus: true, pro: true },
    { featureKey: "commercialUsage", starter: true, plus: true, pro: true },
    { featureKey: "prioritySupport", starter: true, plus: true, pro: true },
    { featureKey: "liveChat", starter: false, plus: true, pro: true },
    { featureKey: "dedicatedManager", starter: false, plus: false, pro: true }
  ];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useTranslation();

  // Christmas promo expiration check
  const promoEndDate = new Date('2025-12-31T23:59:59');
  const showChristmasPromo = new Date() <= promoEndDate;

  useEffect(() => {
    localStorage.removeItem("billing");
    trackViewContent('Pricing');
  }, [])

  const handlePlanSelect = async (planId: string) => {
    if (planId === "free") {
      // Free plan - redirect to account to sign up
      navigate('/account');
      return;
    }

    // Wait for authentication to finish loading
    if (loading) {
      console.log('[Pricing] Authentication still loading, please wait...');
      return;
    }

    if (!user) {
      // Redirect to account page to sign up first
      navigate('/account');
      return;
    }

    // Track checkout initiation in Meta Pixel with plan details
    const selectedPlan = plans.find(p => p.id === planId);
    const checkoutValue = selectedPlan ? (isYearly ? selectedPlan.yearlyPrice * 12 : selectedPlan.monthlyPrice) : undefined;
    trackInitiateCheckout(planId, checkoutValue, 'EUR');

    try {
      // For paid plans, create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId,
          interval: isYearly ? 'year' : 'month'
        }
      });
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        console.error('Error creating checkout:', error);
        navigate('/account');
      }
    } catch (error) {
      console.error('Error:', error);
      navigate('/account');
    }
  };

  const getDisplayPrice = (plan: any) => {
    if (plan.price === "Free") return "Free";

    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    return `€${price}`;
  };

  return (
    <div className="min-h-screen bg-background mt-10 lg:mt-0">
      {!user &&
        <div className="lg:block">
          <HeaderSection />
        </div>
      }

      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground py-20 ">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            {t('pricing.title')}
          </h1>
          <p className="text-xl lg:text-2xl text-primary-foreground/90 max-w-3xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>
          
          {/* Billing Toggle */}
          <div className="flex flex-col items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-4">
              <span className={`text-sm ${!isYearly ? 'text-primary-foreground' : 'text-primary-foreground/70'}`}>
                {t('pricing.monthly')}
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isYearly ? 'bg-primary' : 'bg-primary-foreground/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isYearly ? 'text-primary-foreground' : 'text-primary-foreground/70'}`}>
                {t('pricing.yearly')}
              </span>
              <Badge variant="secondary" className="ml-2">
                {t('pricing.saveMonths')}
              </Badge>
            </div>
            <p className="text-xs text-primary-foreground/70">
              {t('pricing.promoCode')}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{t('pricing.footer.trial')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{t('pricing.footer.noCard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{t('pricing.footer.cancel')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-6 py-16">
        {loading && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span>{t('pricing.loadingAccount')}</span>
            </div>
          </div>
        )}

        {/* Christmas Promo Banner */}
        {showChristmasPromo && (
          <div className="mb-8 max-w-7xl mx-auto">
            <Card className="border-2 border-red-500/50 bg-gradient-to-r from-red-500/10 via-green-500/5 to-red-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                Oferta Limitada
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <TreePine className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
                        🎄 Promoção de Natal 2025
                      </h3>
                      <p className="text-muted-foreground">
                        <strong className="text-red-500">€19.99/mês</strong> durante 12 meses — Poupa 31% no plano Starter!
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate('/natal')}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Ver Oferta de Natal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? "border-primary shadow-lg scale-105 bg-white dark:bg-card"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    {t('pricing.plans.plus.popular')}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {plan.icon}
                  </div>
                </div>
                {(plan.id === 'founders' || plan.id === 'plus' || plan.id === 'pro') && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full">
                      <VideoIcon className="h-3 w-3" />
                      {t('pricing.includesVideo')}
                    </span>
                  </div>
                )}
                <CardTitle className="text-xl font-bold">{t(`pricing.plans.${plan.id}.name`)}</CardTitle>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">{getDisplayPrice(plan)}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{t(`pricing.plans.${plan.id}.period`)}</span>
                  )}
                  {isYearly && plan.monthlyPrice && plan.yearlyPrice && (
                    <div className="text-xs text-muted-foreground">
                      {t('pricing.billedAnnually', { amount: (plan.yearlyPrice * 12).toFixed(0) })}
                    </div>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {t(`pricing.plans.${plan.id}.description`)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xl font-bold text-primary">{plan.credits}</div>
                  <div className="text-xs text-muted-foreground">{t('pricing.creditsPerMonth')}</div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((featureKey, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{t(`pricing.plans.${plan.id}.features.${featureKey}`)}</span>
                    </li>
                  ))}
                </ul>


                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "variant-outline"
                  }`}
                  size="sm"
                  disabled={loading}
                >
                  {loading ? t('pricing.loading') : t(`pricing.cta.${plan.id === 'starter' ? 'start' : plan.id === 'plus' ? 'goPlus' : 'goPro'}`)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Comparison Table */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('pricing.comparisonTable.title')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('pricing.comparisonTable.subtitle')}
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/5">{t('pricing.comparisonTable.headers.feature')}</TableHead>
                    <TableHead className="text-center">{t('pricing.comparisonTable.headers.starter')}</TableHead>
                    <TableHead className="text-center bg-primary/5">
                      {t('pricing.comparisonTable.headers.plus')}
                      <Badge variant="secondary" className="ml-2">{t('pricing.comparisonTable.headers.popular')}</Badge>
                    </TableHead>
                    <TableHead className="text-center">{t('pricing.comparisonTable.headers.pro')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{t(`pricing.comparisonTable.features.${item.featureKey}`)}</TableCell>
                      <TableCell className="text-center">
                        {typeof item.starter === 'boolean' ? (
                          item.starter ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.starter}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        {typeof item.plus === 'boolean' ? (
                          item.plus ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.plus}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof item.pro === 'boolean' ? (
                          item.pro ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.pro}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Credit System Explanation */}
        <div className="max-w-5xl mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-2">{t('pricing.creditSystem.title')}</CardTitle>
              <CardDescription>
                {t('pricing.creditSystem.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <div className="text-4xl font-bold text-primary mb-3">{t('pricing.creditSystem.imageCredit')}</div>
                <div className="text-lg font-medium mb-2">{t('pricing.creditSystem.anyQuality')}</div>
                <div className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  {t('pricing.creditSystem.description')}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">{t('pricing.creditSystem.video5s')}</div>
                  <div className="text-sm font-medium">{t('pricing.creditSystem.video5sLabel')}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('pricing.creditSystem.imageToVideo')}</div>
                </div>
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">{t('pricing.creditSystem.video10s')}</div>
                  <div className="text-sm font-medium">{t('pricing.creditSystem.video10sLabel')}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('pricing.creditSystem.extendedDuration')}</div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                {t('pricing.creditSystem.rollover')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20 text-center">
          <h2 className="text-2xl font-bold mb-8">{t('pricing.faq.title')}</h2>
          <div className="space-y-6 text-left">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
              <div key={index}>
                <h3 className="font-medium mb-2">{t(`pricing.faq.questions.${index}.question`)}</h3>
                <p className="text-muted-foreground text-sm">
                  {t(`pricing.faq.questions.${index}.answer`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
