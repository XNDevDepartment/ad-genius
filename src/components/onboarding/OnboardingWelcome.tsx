import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sparkles, Image, Video, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface OnboardingWelcomeProps {
  onStart: () => void;
  onSkip: () => void;
}

export const OnboardingWelcome = ({ onStart, onSkip }: OnboardingWelcomeProps) => {
  const { t } = useTranslation();

  const benefits = [
    { icon: Image, text: t('onboarding.welcome.benefit1') },
    { icon: Sparkles, text: t('onboarding.welcome.benefit2') },
    { icon: Video, text: t('onboarding.welcome.benefit3') },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('onboarding.welcome.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('onboarding.welcome.subtitle')}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4 text-left bg-muted/50 rounded-xl p-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{benefit.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full gap-2"
          >
            {t('onboarding.welcome.getStarted')}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            {t('onboarding.welcome.skip')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
