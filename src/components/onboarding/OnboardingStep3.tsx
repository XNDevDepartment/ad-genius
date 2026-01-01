import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Camera, Sparkles, Users, Megaphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingData } from '@/hooks/useOnboarding';

interface OnboardingStep3Props {
  onNext: (contentType: OnboardingData['contentType']) => void;
}

const contentTypes = [
  {
    id: 'product_showcase' as const,
    icon: Camera,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'lifestyle' as const,
    icon: Sparkles,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'social_proof' as const,
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'ad_creative' as const,
    icon: Megaphone,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export const OnboardingStep3 = ({ onNext }: OnboardingStep3Props) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<OnboardingData['contentType'] | null>(null);

  const handleContinue = () => {
    if (selected) {
      onNext(selected);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step3.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.step3.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contentTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;
          
          return (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={cn(
                "relative p-6 rounded-xl border-2 text-left transition-all",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", type.bgColor)}>
                <Icon className={cn("w-6 h-6", type.color)} />
              </div>
              
              <h3 className="font-semibold mb-1">
                {t(`onboarding.step3.${type.id}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`onboarding.step3.${type.id}.description`)}
              </p>
            </button>
          );
        })}
      </div>

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!selected}
        onClick={handleContinue}
      >
        {t('onboarding.continue')}
      </Button>
    </div>
  );
};
