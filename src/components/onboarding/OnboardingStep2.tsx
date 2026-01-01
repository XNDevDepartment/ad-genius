import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users } from 'lucide-react';

interface OnboardingStep2Props {
  onNext: (audience: string) => void;
}

export const OnboardingStep2 = ({ onNext }: OnboardingStep2Props) => {
  const { t } = useTranslation();
  const [audience, setAudience] = useState('');

  const examples = [
    t('onboarding.step2.example1'),
    t('onboarding.step2.example2'),
    t('onboarding.step2.example3'),
  ];

  const handleContinue = () => {
    if (audience.trim()) {
      onNext(audience.trim());
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step2.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.step2.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <Textarea
          placeholder={t('onboarding.step2.placeholder')}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="min-h-[120px] resize-none"
        />

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('onboarding.step2.examples')}</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => setAudience(example)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!audience.trim()}
        onClick={handleContinue}
      >
        {t('onboarding.continue')}
      </Button>
    </div>
  );
};
