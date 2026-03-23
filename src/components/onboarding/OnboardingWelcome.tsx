import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sparkles, Image, Gift, ArrowRight, Crown } from 'lucide-react';
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
    { icon: Gift, text: t('onboarding.welcome.benefit3') },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-5 py-8">
      {/* Bonus Credits Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-700 dark:text-green-300">
              {t('onboarding.offer.bonusCredits')}
            </p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              +20 {t('pricing.creditsPerMonth').replace('{{count}}', '')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col"
      >

        {/* Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            {t('onboarding.welcome.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('onboarding.welcome.subtitle')}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 bg-muted/50 rounded-xl p-5 mb-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <benefit.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{benefit.text}</span>
            </motion.div>
          ))}
        </div>

        {/* First Month Offer Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 py-3 mt-6"
        >
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {t('onboarding.offer.firstMonth')}
          </span>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3 mt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full gap-2 h-12 text-base"
          >
            {t('onboarding.welcome.getStarted')}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground text-sm"
          >
            {t('onboarding.welcome.skip')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
