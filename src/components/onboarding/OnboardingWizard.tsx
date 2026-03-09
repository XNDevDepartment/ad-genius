import { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingPackSelect } from './OnboardingPackSelect';
import { OnboardingResults } from './OnboardingResults';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import logoHorizontal from '@/assets/logos/logo_horizontal.png';

export const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { step, data, nextStep, completeOnboarding } = useOnboarding();
  const [detectingFashion, setDetectingFashion] = useState(false);

  const totalSteps = 3; // Upload -> Pack Select -> Results
  const progressPercent = step === 0 ? 0 : (Math.min(step, totalSteps) / totalSteps) * 100;

  // Detect fashion after image upload (step transitions from 1 to 2)
  const handleImageUploaded = async (imageUrl: string, sourceImageId: string) => {
    setDetectingFashion(true);
    
    let isFashion = false;
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-product-type', {
        body: { sourceImageUrl: imageUrl },
      });
      
      if (!error && result) {
        isFashion = result.isFashion === true;
      }
      console.log('[OnboardingWizard] Fashion detection result:', isFashion);
    } catch (err) {
      console.warn('[OnboardingWizard] Fashion detection failed, defaulting to false:', err);
    }
    
    setDetectingFashion(false);
    nextStep({ imageUrl, sourceImageId, isFashion });
  };

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
        return detectingFashion ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t('onboarding.packs.analyzing')}</p>
          </div>
        ) : (
          <OnboardingStep1
            onNext={(imageUrl, sourceImageId) => handleImageUploaded(imageUrl, sourceImageId)}
          />
        );
      case 2:
        return (
          <OnboardingPackSelect
            isFashion={data.isFashion ?? false}
            onSelect={(packId) => nextStep({ selectedPack: packId })}
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <img src={logoHorizontal} alt="ProduktPix" className="h-6 w-auto" />
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
        {step > 0 && step <= totalSteps && (
          <Progress value={progressPercent} className="h-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step}-${detectingFashion}`}
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
