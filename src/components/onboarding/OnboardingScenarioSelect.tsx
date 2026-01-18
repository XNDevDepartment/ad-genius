import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONBOARDING_SCENARIOS, OnboardingScenario } from '@/data/onboarding-scenarios';
import { Textarea } from '@/components/ui/textarea';

interface OnboardingScenarioSelectProps {
  onSelect: (scenario: OnboardingScenario) => void;
}

export const OnboardingScenarioSelect = ({ onSelect }: OnboardingScenarioSelectProps) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleScenarioSelect = (scenario: OnboardingScenario) => {
    setSelectedId(scenario.id);
    setCustomMode(false);
    // Auto-advance after selection
    setTimeout(() => onSelect(scenario), 300);
  };

  const handleCustomSelect = () => {
    setSelectedId(null);
    setCustomMode(true);
  };

  const handleCustomSubmit = () => {
    if (customPrompt.trim()) {
      onSelect({
        id: 'custom',
        icon: '✏️',
        nameKey: 'onboarding.scenarios.custom',
        descriptionKey: '',
        prompt: customPrompt.trim()
      });
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{t('onboarding.scenarios.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('onboarding.scenarios.subtitle')}</p>
      </div>

      {/* Scenario Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {ONBOARDING_SCENARIOS.map((scenario, index) => {
          const isSelected = selectedId === scenario.id && !customMode;
          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleScenarioSelect(scenario)}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all min-h-[100px] flex flex-col",
                isSelected
                  ? "border-primary bg-primary/5 scale-[0.98]"
                  : "border-border hover:border-primary/50 active:scale-[0.98]"
              )}
            >
              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}
              <span className="text-2xl mb-2">{scenario.icon}</span>
              <h3 className="font-semibold text-sm leading-tight">
                {t(scenario.nameKey)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {t(scenario.descriptionKey)}
              </p>
            </motion.button>
          );
        })}

        {/* Custom scenario option */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleCustomSelect}
          className={cn(
            "relative p-4 rounded-xl border-2 border-dashed text-left transition-all min-h-[100px] flex flex-col col-span-2",
            customMode
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          {customMode && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-primary-foreground" />
            </motion.div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{t('onboarding.scenarios.custom')}</h3>
          </div>
          
          {customMode ? (
            <div className="flex-1 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t('onboarding.scenarios.customPlaceholder')}
                className="min-h-[80px] resize-none text-sm"
                autoFocus
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customPrompt.trim()}
                className="self-end px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {t('onboarding.continue')}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('onboarding.scenarios.customDescription')}
            </p>
          )}
        </motion.button>
      </div>
    </div>
  );
};
