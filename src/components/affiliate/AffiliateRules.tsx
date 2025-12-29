import { Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AffiliateRules = () => {
  const { t } = useTranslation();

  const rules = [
    t('affiliate.rules.rule1'),
    t('affiliate.rules.rule2'),
    t('affiliate.rules.rule3'),
    t('affiliate.rules.rule4'),
    t('affiliate.rules.rule5')
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('affiliate.rules.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('affiliate.rules.subtitle')}
            </p>
          </div>
          
          <div className="bg-card rounded-2xl p-8 shadow-apple">
            <div className="flex items-start gap-4 mb-8 p-4 bg-primary/5 rounded-xl">
              <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">{t('affiliate.rules.alertTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('affiliate.rules.alertDesc')}
                </p>
              </div>
            </div>
            
            <ul className="space-y-4">
              {rules.map((rule, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                {t('affiliate.rules.termsLink')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
