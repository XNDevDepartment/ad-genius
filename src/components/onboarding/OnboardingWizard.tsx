import { useOnboarding } from '@/hooks/useOnboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingStep2 } from './OnboardingStep2';
import { OnboardingStep3 } from './OnboardingStep3';
import { OnboardingStep4 } from './OnboardingStep4';
import { OnboardingStep5 } from './OnboardingStep5';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import logoHorizontal from '@/assets/logos/logo_horizontal.png';

export const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { step, data, nextStep, completeOnboarding, generateBonusVideo } = useOnboarding();

  const totalSteps = 5;
  const progressPercent = step === 0 ? 0 : (step / totalSteps) * 100;

  const handleSkipOnboarding = () => {
    completeOnboarding();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <OnboardingWelcome
            onStart={() => nextStep({})}
            onSkip={handleSkipOnboarding}
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
          <OnboardingStep2
            onNext={(audience) => nextStep({ audience })}
          />
        );
      case 3:
        return (
          <OnboardingStep3
            imageUrl={data.imageUrl}
            sourceImageId={data.sourceImageId}
            audience={data.audience}
            onNext={(selectedScenario) => nextStep({ selectedScenario })}
          />
        );
      case 4:
        return (
          <OnboardingStep4
            data={data}
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
      {/* Header with logo, progress, and skip */}
      <div className="px-6 py-4 border-b border-border">
        <div className="max-w-2xl mx-auto">
          {/* Logo and Skip row */}
          <div className="flex items-center justify-between mb-4">
            <img 
              src={logoHorizontal} 
              alt="ProduktPix" 
              className="h-8 w-auto"
            />
            {step > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                    <X className="w-4 h-4" />
                    {t('onboarding.skip')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('onboarding.skipConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('onboarding.skipConfirm')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSkipOnboarding}>
                      {t('onboarding.skip')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Progress bar - only show after welcome */}
          {step > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('onboarding.progress', { current: step, total: totalSteps })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </>
          )}
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
