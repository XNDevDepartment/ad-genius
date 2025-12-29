import { Euro, Calendar, CreditCard, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AffiliateCommissionDetails = () => {
  const { t } = useTranslation();

  const details = [
    { icon: Euro, text: t('affiliate.commission.bullet1') },
    { icon: Calendar, text: t('affiliate.commission.bullet2') },
    { icon: CreditCard, text: t('affiliate.commission.bullet3') },
    { icon: Shield, text: t('affiliate.commission.bullet4') },
    { icon: Users, text: t('affiliate.commission.bullet5') }
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('affiliate.commission.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('affiliate.commission.subtitle')}
            </p>
          </div>
          
          <div className="bg-card rounded-3xl p-8 md:p-12 shadow-apple">
            {/* Highlight box */}
            <div className="bg-gradient-hero rounded-2xl p-6 md:p-8 text-primary-foreground text-center mb-10">
              <div className="text-5xl md:text-6xl font-bold mb-2">{t('affiliate.commission.percentage')}</div>
              <div className="text-xl opacity-90">{t('affiliate.commission.percentageLabel')}</div>
            </div>
            
            {/* Details list */}
            <div className="space-y-4">
              {details.map((detail, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <detail.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg">{detail.text}</span>
                </div>
              ))}
            </div>
            
            {/* Example calculation */}
            <div className="mt-10 p-6 bg-muted/30 rounded-xl">
              <h4 className="font-semibold mb-3">{t('affiliate.commission.exampleTitle')}</h4>
              <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('affiliate.commission.example') }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
