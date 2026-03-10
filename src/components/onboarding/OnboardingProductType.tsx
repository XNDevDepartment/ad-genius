import { useTranslation } from 'react-i18next';
import { Shirt, Package } from 'lucide-react';

interface OnboardingProductTypeProps {
  onNext: (isFashion: boolean) => void;
}

export const OnboardingProductType = ({ onNext }: OnboardingProductTypeProps) => {
  const { t } = useTranslation();

  const options = [
    {
      isFashion: true,
      icon: Shirt,
      label: t('onboarding.productType.fashion'),
      description: t('onboarding.productType.fashionDesc'),
    },
    {
      isFashion: false,
      icon: Package,
      label: t('onboarding.productType.product'),
      description: t('onboarding.productType.productDesc'),
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.productType.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.productType.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => onNext(option.isFashion)}
            className="flex items-center gap-4 p-6 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <option.icon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-base text-foreground">{option.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
