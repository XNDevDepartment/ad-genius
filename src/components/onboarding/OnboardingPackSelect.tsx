import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { getPacksForProductType, type Pack, type PackId } from '@/data/onboarding-packs';

interface OnboardingPackSelectProps {
  isFashion: boolean;
  onSelect: (packId: PackId) => void;
}

export const OnboardingPackSelect = ({ isFashion, onSelect }: OnboardingPackSelectProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PackId | null>(null);
  const packs = getPacksForProductType(isFashion);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{t('onboarding.packs.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('onboarding.packs.subtitle')}</p>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {packs.map((pack, index) => (
          <motion.button
            key={pack.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelected(pack.id)}
            className={`relative w-full text-left rounded-xl border-2 p-4 transition-all ${
              selected === pack.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            {/* Selected indicator */}
            {selected === pack.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            )}

            <div className="flex items-start gap-3">
              <span className="text-2xl">{pack.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-base">{t(pack.nameKey)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t(pack.descriptionKey)}</p>
                
                {/* Style tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pack.styles.map(style => (
                    <span
                      key={style.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {t(style.labelKey)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full"
          size="lg"
        >
          {t('onboarding.packs.generate')}
        </Button>
      </div>
    </div>
  );
};
