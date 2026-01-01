import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { OnboardingData } from '@/hooks/useOnboarding';
import { motion } from 'framer-motion';

interface OnboardingStep4Props {
  data: OnboardingData;
  generateBonusImages: () => Promise<{ success: boolean; images?: string[]; error?: string }>;
  onNext: (generatedImages: string[]) => void;
}

export const OnboardingStep4 = ({ data, generateBonusImages, onNext }: OnboardingStep4Props) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'generating' | 'complete' | 'error'>('generating');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generate = async () => {
      const result = await generateBonusImages();
      
      if (result.success && result.images) {
        setImages(result.images);
        setStatus('complete');
      } else {
        setError(result.error || 'Generation failed');
        setStatus('error');
      }
    };

    generate();
  }, [generateBonusImages]);

  const handleContinue = () => {
    onNext(images);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          {status === 'generating' ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Sparkles className="w-8 h-8 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step4.title')}</h1>
        <p className="text-muted-foreground">
          {status === 'generating' 
            ? t('onboarding.step4.generating')
            : status === 'complete'
            ? t('onboarding.step4.complete')
            : error
          }
        </p>
      </div>

      {status === 'generating' && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted animate-pulse flex items-center justify-center"
            >
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      )}

      {status === 'complete' && images.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          {images.map((url, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg overflow-hidden border border-border shadow-lg"
            >
              <img 
                src={url} 
                alt={`Generated ${i + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </motion.div>
      )}

      {status === 'error' && (
        <div className="text-center py-8">
          <Button onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm text-primary font-medium">
          ✨ {t('onboarding.step4.freeNote')}
        </p>
      </div>

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={status !== 'complete'}
        onClick={handleContinue}
      >
        {t('onboarding.step4.continueToVideo')}
      </Button>
    </div>
  );
};
