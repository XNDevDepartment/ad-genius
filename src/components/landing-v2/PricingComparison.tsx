import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PricingComparison = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const plans = [
    {
      name: t('landingV2.pricing.free.name', 'Free'),
      price: "€0",
      period: t('landingV2.pricing.period', '/month'),
      description: t('landingV2.pricing.free.description', 'Perfect for trying out'),
      features: [
        t('landingV2.pricing.free.feature1', '10 credits/month'),
        t('landingV2.pricing.free.feature2', 'Basic AI models'),
        t('landingV2.pricing.free.feature3', 'Standard resolution'),
        t('landingV2.pricing.free.feature4', 'Email support'),
      ],
      cta: t('landingV2.pricing.free.cta', 'Get Started'),
      popular: false,
    },
    {
      name: t('landingV2.pricing.starter.name', 'Starter'),
      price: "€29",
      period: t('landingV2.pricing.period', '/month'),
      description: t('landingV2.pricing.starter.description', 'For small businesses'),
      features: [
        t('landingV2.pricing.starter.feature1', '80 credits/month'),
        t('landingV2.pricing.starter.feature2', 'Advanced Models'),
        t('landingV2.pricing.starter.feature3', 'High resolution'),
        t('landingV2.pricing.starter.feature4', 'Team support'),
        t('landingV2.pricing.starter.feature5', 'Video generation'),
        t('landingV2.pricing.starter.feature6', 'Commercial usage'),
      ],
      cta: t('landingV2.pricing.starter.cta', 'Start Free Trial'),
      popular: true,
    },
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.pricing.title', 'Simple, Transparent Pricing')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landingV2.pricing.subtitle', 'Start free, upgrade when you need more')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.popular 
                  ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/25 scale-105' 
                  : 'bg-card border border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-background text-foreground text-sm font-medium">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  {t('landingV2.pricing.mostPopular', 'Most Popular')}
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-bold ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.price}
                </span>
                <span className={plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <Check className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className={plan.popular ? 'text-primary-foreground/90' : 'text-foreground'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-background text-foreground hover:bg-background/90' 
                    : ''
                }`}
                variant={plan.popular ? 'secondary' : 'default'}
                size="lg"
                onClick={() => navigate(plan.popular ? '/pricing' : '/signup')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('landingV2.pricing.viewAll', 'View all plans and features on our')}{' '}
          <button 
            onClick={() => navigate('/pricing')} 
            className="text-primary hover:underline font-medium"
          >
            {t('landingV2.pricing.pricingPage', 'pricing page')}
          </button>
        </p>
      </div>
    </section>
  );
};
