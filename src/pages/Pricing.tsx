import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Star, Zap, Shield, Crown, Video as VideoIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useEffect, useState, useCallback } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { buildProductSchema } from "@/lib/schema";
import useEmblaCarousel from "embla-carousel-react";
import { useIsMobile } from "@/hooks/use-mobile";

const plans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24.17,
    period: "/month",
    description: "Perfect for small businesses and content creators",
    credits: 80,
    features: ["credits", "images", "maxImages", "scenarios", "support"],
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
    features: ["credits", "images", "maxImages", "scenarios", "support", "commercial"],
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
    features: ["credits", "images", "maxImages", "scenarios", "support"],
    limitations: [],
    cta: "Go Pro",
    popular: false,
    icon: <Shield className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-accent to-secondary"
  }
];

const comparisonFeatures = [
  { featureKey: "monthlyCredits", starter: "80", plus: "200", pro: "400" },
  { featureKey: "imagesPerMonth", starter: "80", plus: "200", pro: "400" },
  { featureKey: "maxImagesPerGeneration", starter: "3", plus: "3", pro: "3" },
  { featureKey: "imageToVideo", starter: true, plus: true, pro: true },
  { featureKey: "videoDuration", starter: "5s & 10s", plus: "5s & 10s", pro: "5s & 10s" },
  { featureKey: "ugcScenarios", starter: "unlimited", plus: "unlimited", pro: "unlimited" },
  { featureKey: "allQualityLevels", starter: true, plus: true, pro: true },
  { featureKey: "commercialUsage", starter: true, plus: true, pro: true },
  { featureKey: "prioritySupport", starter: false, plus: true, pro: true },
  { featureKey: "dedicatedManager", starter: false, plus: false, pro: true },
  { featureKey: "freeBetaFeatures", starter: false, plus: false, pro: true },
  { featureKey: "earlyAccess", starter: false, plus: false, pro: true },
  { featureKey: "businessConsulting", starter: false, plus: false, pro: true }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'center',
    startIndex: 1, // Start on Plus (most popular)
  });
  const [selectedIndex, setSelectedIndex] = useState(1);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const calculatePricePerImage = (monthlyPrice: number, credits: number): string => {
    if (isYearly) {
      const totalPrice = monthlyPrice * 10;
      const totalCredits = credits * 12;
      return (totalPrice / totalCredits).toFixed(2);
    }
    return (monthlyPrice / credits).toFixed(2);
  };

  useEffect(() => {
    localStorage.removeItem("billing");
    trackViewContent('Pricing');
  }, []);

  const handlePlanSelect = async (planId: string) => {
    if (planId === "free") {
      navigate('/account');
      return;
    }

    if (loading) return;

    if (!user) {
      navigate('/account');
      return;
    }

    const selectedPlan = plans.find(p => p.id === planId);
    const checkoutValue = selectedPlan ? (isYearly ? selectedPlan.yearlyPrice * 12 : selectedPlan.monthlyPrice) : undefined;
    trackInitiateCheckout(planId, checkoutValue, 'EUR');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId, interval: isYearly ? 'year' : 'month' }
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
    <div className="min-h-screen bg-background lg:mt-0">
      <SEO
        title="Pricing Plans"
        description="Choose the perfect plan for your business. From Starter to Pro, get AI-powered product photos and videos with flexible credits."
        path="/pricing"
        type="product"
        schema={buildProductSchema({ name: 'ProduktPix Plans', description: 'AI Product Photography Plans', price: 29, features: ['AI Photos', 'Video Generation', 'Fashion Swaps'] })}
      />
      {!user &&
        <div className="lg:block">
          <HeaderSection />
        </div>
      }

      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground py-20">
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

        {/* ===== MOBILE: Swipeable carousel ===== */}
        {isMobile ? (
          <div className="mb-20">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex-[0_0_85%] min-w-0 px-2">
                    <div className={`rounded-2xl border p-6 flex flex-col h-full ${
                      plan.popular
                        ? 'border-primary bg-card shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                        : 'border-border bg-card'
                    }`}>
                      {/* Plan name + badge */}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-foreground">{t(`pricing.plans.${plan.id}.name`)}</h3>
                        {plan.popular && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {t('pricing.plans.plus.popular')}
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-4">{t(`pricing.plans.${plan.id}.description`)}</p>

                      {/* Price */}
                      <div className="mb-1">
                        <span className="text-4xl font-bold text-foreground">{getDisplayPrice(plan)}</span>
                        <span className="text-muted-foreground text-sm">{t(`pricing.plans.${plan.id}.period`)}</span>
                      </div>
                      {isYearly && plan.yearlyPrice && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {t('pricing.billedAnnually', { amount: (plan.yearlyPrice * 12).toFixed(0) })}
                        </div>
                      )}

                      {/* Cost per image */}
                      <div className="text-sm font-semibold text-primary mb-5">
                        €{calculatePricePerImage(plan.monthlyPrice, plan.credits)} {t('mobileUpgrade.pricing.perImage')}
                      </div>

                      {/* CTA */}
                      <Button
                        onClick={() => handlePlanSelect(plan.id)}
                        className="w-full h-12 text-base font-bold mb-5"
                        variant={plan.popular ? "default" : "outline"}
                        disabled={loading}
                      >
                        {loading ? t('pricing.loading') : t(`pricing.cta.${plan.id === 'starter' ? 'start' : plan.id === 'plus' ? 'goPlus' : 'goPro'}`)}
                      </Button>

                      {/* Divider */}
                      <Separator className="mb-4" />

                      {/* What's included */}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t('pricing.whatsIncluded', "What's included")}
                      </p>

                      <ul className="space-y-2 flex-1">
                        {plan.features.map((featureKey, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-foreground">{t(`pricing.plans.${plan.id}.features.${featureKey}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {plans.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === selectedIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                  }`}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  aria-label={`Go to plan ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ===== DESKTOP: Higgsfield-inspired layout ===== */
          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-20">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative flex flex-col border transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <CardHeader className="pb-4">
                  {/* Plan name + badge */}
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">{t(`pricing.plans.${plan.id}.name`)}</CardTitle>
                    {plan.popular && (
                      <Badge className="bg-primary text-primary-foreground">
                        {t('pricing.plans.plus.popular')}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <CardDescription className="text-sm mt-1">
                    {t(`pricing.plans.${plan.id}.description`)}
                  </CardDescription>

                  {/* Price */}
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{getDisplayPrice(plan)}</span>
                    {plan.period && (
                      <span className="text-muted-foreground text-sm">{t(`pricing.plans.${plan.id}.period`)}</span>
                    )}
                    {isYearly && plan.monthlyPrice && plan.yearlyPrice && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('pricing.billedAnnually', { amount: (plan.yearlyPrice * 12).toFixed(0) })}
                      </div>
                    )}
                  </div>

                  {/* Cost per image */}
                  <div className="text-sm font-semibold text-primary mt-1">
                    {t('pricing.perImage', { price: calculatePricePerImage(plan.monthlyPrice, plan.credits) })}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 space-y-5">
                  {/* CTA */}
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={loading}
                  >
                    {loading ? t('pricing.loading') : t(`pricing.cta.${plan.id === 'starter' ? 'start' : plan.id === 'plus' ? 'goPlus' : 'goPro'}`)}
                  </Button>

                  {/* Divider */}
                  <Separator />

                  {/* What's included */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {t('pricing.whatsIncluded', "What's included")}
                    </p>

                    <ul className="space-y-2.5">
                      {plan.features.map((featureKey, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{t(`pricing.plans.${plan.id}.features.${featureKey}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Detailed Comparison Table - hidden on mobile */}
        <div className="max-w-6xl mx-auto hidden lg:block">
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
                          item.starter ? <Check className="h-5 w-5 text-primary mx-auto" /> : <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        ) : (
                          <span className="font-medium">{item.starter}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        {typeof item.plus === 'boolean' ? (
                          item.plus ? <Check className="h-5 w-5 text-primary mx-auto" /> : <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        ) : (
                          <span className="font-medium">{item.plus}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof item.pro === 'boolean' ? (
                          item.pro ? <Check className="h-5 w-5 text-primary mx-auto" /> : <X className="h-5 w-5 text-muted-foreground mx-auto" />
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
                <div className="text-lg font-medium mb-2">{t('pricing.creditSystem.anyQuality.title')}</div>
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
