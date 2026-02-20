import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Star, DollarSign, Clock, TrendingUp, Image, Video, Zap, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { MinimalHeader } from "@/components/landing-v2/MinimalHeader";
import { MinimalFooter } from "@/components/landing-v2/MinimalFooter";
import { TestimonialsSection } from "@/components/landing-v2/TestimonialsSection";
import { useEffect, useState, useCallback } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { buildProductSchema } from "@/lib/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const plans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24.17,
    period: "/month",
    credits: 80,
    popular: false,
    bestValue: false,
    featureKeys: ["images", "scenarios", "tryon", "video", "photoshoots", "support", "commercial"],
  },
  {
    id: "plus",
    name: "Plus",
    monthlyPrice: 49,
    yearlyPrice: 40.83,
    period: "/month",
    credits: 200,
    popular: true,
    bestValue: false,
    featureKeys: ["images", "scenarios", "tryon", "video", "photoshoots", "support", "commercial"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 99,
    yearlyPrice: 82.50,
    period: "/month",
    credits: 400,
    popular: false,
    bestValue: true,
    featureKeys: ["images", "scenarios", "tryon", "video", "photoshoots", "support", "commercial", "earlyAccess"],
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
  { featureKey: "earlyAccess", starter: false, plus: false, pro: true },
  { featureKey: "businessConsulting", starter: false, plus: false, pro: true }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isYearly, setIsYearly] = useState(true);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const calculatePricePerImage = (monthlyPrice: number, credits: number): string => {
    if (isYearly) {
      const totalPrice = monthlyPrice * 10;
      const totalCredits = credits * 12;
      return (totalPrice / totalCredits).toFixed(2);
    }
    return (monthlyPrice / credits).toFixed(2);
  };

  const calculateYearlySavings = (plan: typeof plans[0]): number => {
    return Math.round((plan.monthlyPrice * 12) - (plan.yearlyPrice * 12));
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
        window.location.href = data.url;
      } else {
        console.error('Error creating checkout:', error);
        navigate('/account');
      }
    } catch (error) {
      console.error('Error:', error);
      navigate('/account');
    }
  };

  const getDisplayPrice = (plan: typeof plans[0]) => {
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    return `€${price}`;
  };

  const faqKeys = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing Plans"
        description="Choose the perfect plan for your business. From Starter to Pro, get AI-powered product photos and videos with flexible credits."
        path="/pricing"
        type="product"
        schema={buildProductSchema({ name: 'ProduktPix Plans', description: 'AI Product Photography Plans', price: 29, features: ['AI Photos', 'Video Generation', 'Fashion Swaps'] })}
      />
      {!user && <MinimalHeader />}

      <main className={!user ? 'pt-16' : ''}>
      {/* ===== SECTION 1: Hero (Value-Anchored) ===== */}
      <section className="relative py-20 px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {t('pricing.v2.hero.badge', 'AI-Powered Product Photography')}
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="text-foreground">{t('pricing.v2.hero.titleLine1', 'Professional Product Photos')}</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              {t('pricing.v2.hero.titleLine2', 'from €0.20 each')}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('pricing.v2.hero.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('pricing.monthly')}
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isYearly ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('pricing.yearly')}
              </span>
              <Badge className="bg-primary/10 text-primary border-0">
                {t('pricing.saveMonths')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pricing.promoCode')}
            </p>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              <span>{t('pricing.v2.trustChips.trial')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              <span>{t('pricing.v2.trustChips.noCard')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              <span>{t('pricing.v2.trustChips.cancel')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: Plan Cards ===== */}
      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          {loading && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>{t('pricing.loadingAccount')}</span>
              </div>
            </div>
          )}

          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 md:p-8 flex flex-col transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? 'border-primary shadow-lg ring-1 ring-primary/20 bg-card'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                {/* Plan name + badges */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-xl font-bold text-foreground">{t(`pricing.plans.${plan.id}.name`)}</h3>
                  {plan.popular && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {t('pricing.plans.plus.popular')}
                    </Badge>
                  )}
                  {plan.bestValue && (
                    <Badge variant="secondary" className="text-xs">
                      {t('pricing.bestValue')}
                    </Badge>
                  )}
                </div>

                {/* Best for */}
                <p className="text-sm text-muted-foreground mb-4">
                  {t(`pricing.v2.plans.${plan.id}.bestFor`)}
                </p>

                {/* Price */}
                <div className="mb-1">
                  {isYearly && (
                    <span className="text-lg text-muted-foreground line-through mr-2">€{plan.monthlyPrice}</span>
                  )}
                  <span className="text-4xl font-bold text-foreground">{getDisplayPrice(plan)}</span>
                  <span className="text-muted-foreground text-sm">{t(`pricing.plans.${plan.id}.period`)}</span>
                </div>
                {isYearly && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {t('pricing.billedAnnually', { amount: (plan.yearlyPrice * 12).toFixed(0) })}
                  </div>
                )}

                {/* Savings */}
                {isYearly && (
                  <div className="mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-medium">
                      {t('pricing.saveCompared', { amount: calculateYearlySavings(plan) })}
                    </Badge>
                  </div>
                )}

                {/* Value anchor: cost per image */}
                <div className="text-sm font-semibold text-primary mb-1">
                  {t('pricing.v2.costPerImage', { price: calculatePricePerImage(plan.monthlyPrice, plan.credits) })}
                </div>
                <div className="text-xs text-muted-foreground mb-5">
                  {t('pricing.v2.vsPhotographer')}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full h-12 text-base font-bold mb-5 rounded-full ${plan.popular ? 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30' : ''} transition-all`}
                  variant={plan.popular ? "default" : "outline"}
                  disabled={loading}
                >
                  {loading ? t('pricing.loading') : t(`pricing.cta.${plan.id === 'starter' ? 'start' : plan.id === 'plus' ? 'goPlus' : 'goPro'}`)}
                </Button>

                {/* Separator */}
                <Separator className="mb-4" />

                {/* What's included */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t('pricing.v2.whatsIncluded')}
                </p>

                <ul className="space-y-2.5 flex-1">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">
                        {t(`pricing.v2.plans.${plan.id}.features.${featureKey}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: Why It's Worth It ===== */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('pricing.v2.valueProps.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('pricing.v2.valueProps.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: DollarSign, key: 'save' },
              { icon: Clock, key: 'speed' },
              { icon: TrendingUp, key: 'results' },
            ].map((prop, index) => (
              <div
                key={index}
                className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <prop.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {t(`pricing.v2.valueProps.${prop.key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`pricing.v2.valueProps.${prop.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: What 1 Credit Gets You ===== */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('pricing.v2.creditExplainer.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('pricing.v2.creditExplainer.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Image, key: 'image' },
              { icon: Video, key: 'video5' },
              { icon: Zap, key: 'video10' },
            ].map((item, index) => (
              <div key={index} className="text-center p-8 rounded-2xl bg-card border border-border">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-2">
                  {t(`pricing.v2.creditExplainer.${item.key}.credits`)}
                </div>
                <div className="text-base font-medium text-foreground mb-1">
                  {t(`pricing.v2.creditExplainer.${item.key}.label`)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(`pricing.v2.creditExplainer.${item.key}.detail`)}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {t('pricing.v2.creditExplainer.rollover')}
          </p>
        </div>
      </section>

      {/* ===== SECTION 5: Social Proof ===== */}
      <TestimonialsSection />

      {/* ===== SECTION 6: Comparison Table (Desktop Only) ===== */}
      <section className="py-20 px-4 hidden lg:block">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('pricing.comparisonTable.title')}</h2>
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
      </section>

      {/* ===== SECTION 7: FAQ (Accordion) ===== */}
      <section className="py-20 px-4" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('pricing.v2.faq.title')}
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqKeys.map((index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-lg transition-shadow"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                  {t(`pricing.v2.faq.questions.${index}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {t(`pricing.v2.faq.questions.${index}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Still have questions? */}
          <div className="mt-12 text-center p-8 rounded-2xl bg-primary/5 border border-primary/10">
            <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('landingV2.faq.stillHaveQuestions', 'Still have questions?')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('landingV2.faq.contactDescription', 'Our team is here to help you get started.')}
            </p>
            <a 
              href="mailto:info@produktpix.com" 
              className="text-primary hover:underline font-medium"
            >
              info@produktpix.com
            </a>
          </div>
        </div>
      </section>

      {/* ===== SECTION 8: Final CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-2xl bg-card border border-border p-10 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('pricing.v2.finalCta.title')}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('pricing.v2.finalCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/signup')} className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all font-semibold">
                {t('pricing.v2.finalCta.primary')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.open('https://calendly.com/produktpix/demo', '_blank')} className="text-lg px-8 py-6 rounded-full font-semibold">
                {t('pricing.v2.finalCta.secondary')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      </main>
      {!user && <MinimalFooter />}
    </div>
  );
};

export default Pricing;
