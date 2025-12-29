import { Share2, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export const AffiliateHowItWorks = () => {
  const { t } = useTranslation();
  
  const steps = [
    {
      icon: Share2,
      title: t('affiliate.howItWorks.step1Title'),
      description: t('affiliate.howItWorks.step1Desc'),
      step: '01'
    },
    {
      icon: Users,
      title: t('affiliate.howItWorks.step2Title'),
      description: t('affiliate.howItWorks.step2Desc'),
      step: '02'
    },
    {
      icon: Wallet,
      title: t('affiliate.howItWorks.step3Title'),
      description: t('affiliate.howItWorks.step3Desc'),
      step: '03'
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('affiliate.howItWorks.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('affiliate.howItWorks.subtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="relative border-0 shadow-apple bg-card overflow-hidden">
              <CardContent className="p-8">
                {/* Step number */}
                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                  {step.step}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Connection line for desktop */}
        <div className="hidden md:flex justify-center mt-8">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="w-16 h-px bg-border" />
            <span>{t('affiliate.howItWorks.automated')}</span>
            <div className="w-16 h-px bg-border" />
          </div>
        </div>
      </div>
    </section>
  );
};
