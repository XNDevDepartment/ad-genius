import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData } from '@/hooks/useOnboarding';

type WeeklyVolume = '<5' | '5-20' | '20-50' | '+50';

interface QualData {
  usesSupplierPhotos?: boolean;
  hasPhotoSession?: boolean;
  canHireModels?: boolean;
  weeklyVolume?: WeeklyVolume;
}

interface Props {
  data: OnboardingData;
  onNext: (data: QualData) => void;
}

const VOLUME_OPTIONS: { value: WeeklyVolume; label: string }[] = [
  { value: '<5', label: 'Menos de 5' },
  { value: '5-20', label: '5 a 20' },
  { value: '20-50', label: '20 a 50' },
  { value: '+50', label: 'Mais de 50' },
];

const slideVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export const OnboardingQualification = ({ data, onNext }: Props) => {
  const [subStep, setSubStep] = useState(0);
  const [answers, setAnswers] = useState<QualData>({
    usesSupplierPhotos: data.usesSupplierPhotos,
    hasPhotoSession: data.hasPhotoSession,
    canHireModels: data.canHireModels,
    weeklyVolume: data.weeklyVolume,
  });

  // Sub-steps:
  // 0 → usesSupplierPhotos (sim/não)
  // 1 → hasPhotoSession (só se usesSupplierPhotos = true)
  // 2 (or 1 if skipped) → canHireModels
  // 3 (or 2) → weeklyVolume

  const handleSupplierPhotos = (value: boolean) => {
    const next = { ...answers, usesSupplierPhotos: value };
    setAnswers(next);
    // if NO supplier photos, skip "já fizeste sessão" — go straight to models
    setSubStep(value ? 1 : 2);
  };

  const handlePhotoSession = (value: boolean) => {
    setAnswers(prev => ({ ...prev, hasPhotoSession: value }));
    setSubStep(2);
  };

  const handleModels = (value: boolean) => {
    setAnswers(prev => ({ ...prev, canHireModels: value }));
    setSubStep(3);
  };

  const handleVolume = (value: WeeklyVolume) => {
    const final = { ...answers, weeklyVolume: value };
    onNext(final);
  };

  const renderQuestion = () => {
    switch (subStep) {
      case 0:
        return (
          <Question
            key="supplier"
            title="Ainda usas fotos do teu fornecedor?"
            subtitle="As que vêm no catálogo ou no site deles."
            onYes={() => handleSupplierPhotos(true)}
            onNo={() => handleSupplierPhotos(false)}
          />
        );
      case 1:
        return (
          <Question
            key="session"
            title="Já fizeste alguma sessão fotográfica para o teu negócio?"
            subtitle="Com fotógrafo, estúdio ou numa localização."
            onYes={() => handlePhotoSession(true)}
            onNo={() => handlePhotoSession(false)}
          />
        );
      case 2:
        return (
          <Question
            key="models"
            title="Tens facilidade em contratar modelos ou influenciadores?"
            subtitle="Para campanhas, lookbooks ou redes sociais."
            onYes={() => handleModels(true)}
            onNo={() => handleModels(false)}
          />
        );
      case 3:
        return (
          <VolumeQuestion
            key="volume"
            onSelect={handleVolume}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={subStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {renderQuestion()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── helpers ────────────────────────────────────────────────────────────────

interface QuestionProps {
  title: string;
  subtitle: string;
  onYes: () => void;
  onNo: () => void;
}

const Question = ({ title, subtitle, onYes, onNo }: QuestionProps) => (
  <>
    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">{title}</h1>
    <p className="text-muted-foreground text-sm mb-8">{subtitle}</p>
    <div className="flex flex-col gap-3">
      <YesNoButton label="Sim" onClick={onYes} />
      <YesNoButton label="Não" onClick={onNo} />
    </div>
  </>
);

const YesNoButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full py-4 rounded-2xl border-2 border-border text-base font-medium hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98] text-left px-6"
  >
    {label}
  </button>
);

const VolumeQuestion = ({ onSelect }: { onSelect: (v: WeeklyVolume) => void }) => (
  <>
    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
      Quantas imagens precisas por semana?
    </h1>
    <p className="text-muted-foreground text-sm mb-8">
      Para o teu negócio não parar de crescer.
    </p>
    <div className="grid grid-cols-2 gap-3">
      {VOLUME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="py-5 rounded-2xl border-2 border-border text-base font-semibold hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
        >
          {opt.label}
        </button>
      ))}
    </div>
  </>
);
