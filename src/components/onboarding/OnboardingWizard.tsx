import { useOnboarding } from '@/hooks/useOnboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingScenarioSelect } from './OnboardingScenarioSelect';
import { OnboardingResults } from './OnboardingResults';
import { Progress } from '@/components/ui/progress';
import logoHorizontal from '@/assets/logos/logo_horizontal.png';

export const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { step, data, nextStep, completeOnboarding } = useOnboarding();

  const totalSteps = 2; // Simplified: Upload -> Scenario -> Results
  const progressPercent = step === 0 ? 0 : (Math.min(step, totalSteps) / totalSteps) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <OnboardingWelcome
            onStart={() => nextStep({})}
            onSkip={completeOnboarding}
          />
        );
      case 1:
        return (
          <OnboardingStep1
            onNext={(imageUrl, sourceImageId) => nextStep({ imageUrl, sourceImageId })}
          />
        );
      case 2:
        return (
          <OnboardingScenarioSelect
            onSelect={(scenario) => nextStep({ 
              selectedScenario: {
                idea: scenario.nameKey,
                description: scenario.prompt,
                'small-description': scenario.descriptionKey
              }
            })}
          />
        );
      case 3:
        return <OnboardingResults data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-inset">
      {/* Compact Mobile Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <img 
              src={logoHorizontal} 
              alt="ProduktPix" 
              className="h-6 w-auto"
            />
          </div>
          {step > 0 && step <= totalSteps && (
            <span className="text-xs text-muted-foreground">
              {t('onboarding.progress', { current: step, total: totalSteps })}
            </span>
          )}
          {step > 0 && (
            <button
              onClick={completeOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" />
              {t('onboarding.skip')}
            </button>
          )}
        </div>

        {/* Progress bar - only show during steps */}
        {step > 0 && step <= totalSteps && (
          <Progress value={progressPercent} className="h-1" />
        )}
      </div>

      {/* Step content - full height mobile optimized */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
