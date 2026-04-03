import { useOnboarding } from '@/hooks/useOnboarding';
import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingProductType } from './OnboardingProductType';
import { OnboardingQualification } from './OnboardingQualification';
import { OnboardingReveal } from './OnboardingReveal';
import { OnboardingOffer } from './OnboardingOffer';
import { OnboardingRecovery } from './OnboardingRecovery';
import logoHorizontal from '@/assets/logos/logo_horizontal.png';

// Steps:
// 0 = Nome (P1)
// 1 = O que vendes (P2)
// 2 = Upload produto (P3) → dispara geração em background
// 3 = Tipo de loja (P4)
// 4 = Qualificação P5–P7 (fornecedor, sessão, modelos, volume)
// 5 = Reveal P8 (imagens geradas + "gostaste?")
// 6 = Oferta P9a (liked = true)
// 7 = Recovery P9b (liked = false)

const TOTAL_PROGRESS_STEPS = 5; // steps 0–4 preenchem a barra

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -32 : 32 }),
};

export const OnboardingWizard = () => {
  const { step, data, nextStep, saveProgress, completeOnboarding } = useOnboarding();

  // progress bar only advances through qualification steps (0–4)
  const progressStep = Math.min(step, TOTAL_PROGRESS_STEPS);
  const progressPercent = (progressStep / TOTAL_PROGRESS_STEPS) * 100;

  // direction: forward for steps advancing
  const direction = 1;

  // After reveal: jump to offer (6) or recovery (7) based on liked
  const handleLiked = useCallback(async (liked: boolean) => {
    const newData = { ...data, liked };
    await saveProgress(liked ? 6 : 7, newData);
  }, [data, saveProgress]);

  const showHeader = step <= 5;
  const showSkip = step >= 1 && step <= 4;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <OnboardingWelcome
            initialValue={data.name}
            onNext={(name) => nextStep({ name })}
          />
        );
      case 1:
        return (
          <OnboardingWelcome
            mode="whatSell"
            name={data.name}
            initialValue={data.whatSell}
            onNext={(whatSell) => nextStep({ whatSell })}
          />
        );
      case 2:
        return (
          <OnboardingStep1
            onNext={(imageUrl, sourceImageId, jobId) =>
              nextStep({ imageUrl, sourceImageId, onboardingJobId: jobId })
            }
          />
        );
      case 3:
        return (
          <OnboardingProductType
            onNext={(storeType) => nextStep({ storeType })}
          />
        );
      case 4:
        return (
          <OnboardingQualification
            data={data}
            onNext={(qualData) => nextStep(qualData)}
          />
        );
      case 5:
        return (
          <OnboardingReveal
            jobId={data.onboardingJobId}
            onLiked={handleLiked}
          />
        );
      case 6:
        return (
          <OnboardingOffer
            name={data.name}
            onComplete={completeOnboarding}
          />
        );
      case 7:
        return (
          <OnboardingRecovery
            onComplete={completeOnboarding}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-inset">
      {/* Header */}
      {showHeader && (
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <img src={logoHorizontal} alt="ProduktPix" className="h-6 w-auto" />
            {showSkip && (
              <button
                onClick={completeOnboarding}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors py-1 px-2 rounded-md hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
                Saltar
              </button>
            )}
          </div>
          {/* Ultra-thin progress bar */}
          <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,16px)]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
