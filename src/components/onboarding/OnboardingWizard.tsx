import { useOnboarding } from '@/hooks/useOnboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingStep2 } from './OnboardingStep2';
import { OnboardingStep3 } from './OnboardingStep3';
import { OnboardingStep4 } from './OnboardingStep4';
import { OnboardingStep5 } from './OnboardingStep5';
import { Progress } from '@/components/ui/progress';

export const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { step, data, nextStep, completeOnboarding, generateBonusImages, generateBonusVideo } = useOnboarding();

  const totalSteps = 5;
  const progressPercent = (step / totalSteps) * 100;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <OnboardingStep1
            onNext={(imageUrl, sourceImageId) => nextStep({ imageUrl, sourceImageId })}
          />
        );
      case 2:
        return (
          <OnboardingStep2
            onNext={(audience) => nextStep({ audience })}
          />
        );
      case 3:
        return (
          <OnboardingStep3
            onNext={(contentType) => nextStep({ contentType })}
          />
        );
      case 4:
        return (
          <OnboardingStep4
            data={data}
            generateBonusImages={generateBonusImages}
            onNext={(generatedImages) => nextStep({ generatedImages })}
          />
        );
      case 5:
        return (
          <OnboardingStep5
            generatedImages={data.generatedImages || []}
            generateBonusVideo={generateBonusVideo}
            onComplete={completeOnboarding}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with progress */}
      <div className="px-6 py-4 border-b border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t('onboarding.progress', { current: step, total: totalSteps })}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
