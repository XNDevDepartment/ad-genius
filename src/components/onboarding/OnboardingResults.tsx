import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Gift, Crown, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOnboarding, OnboardingData } from '@/hooks/useOnboarding';
import { useGeminiImageJobUnified } from '@/hooks/useGeminiImageJobUnified';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getPack, buildPackPrompt, type PackId } from '@/data/onboarding-packs';
import '@/costumn.css';

// Refresh session on mobile
const useSessionRefresh = () => {
  useEffect(() => {
    supabase.auth.refreshSession().catch(() => {});
  }, []);
};

interface OnboardingResultsProps {
  data: OnboardingData;
}

const LOADING_MESSAGES = [
  'onboarding.loading.creating',
  'onboarding.loading.analyzingProduct',
  'onboarding.loading.preparingScene',
  'onboarding.loading.calibratingLighting',
  'onboarding.loading.generatingVisuals',
  'onboarding.loading.optimizingDetails',
  'onboarding.loading.finalizingOutput',
  'onboarding.loading.almostDone',
];

const PlaceholderCell = ({ label }: { label: string }) => (
  <div className="absolute inset-0">
    <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
      }}
    />
    <div className="absolute inset-0 gen-glow flex items-center justify-center">
      <div className="text-center relative z-10">
        <Image className="h-6 w-6 text-white/90 mx-auto mb-1 animate-pulse" />
        <p className="text-[10px] text-white/90 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

export const OnboardingResults = ({ data }: OnboardingResultsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { completeOnboarding, awardCredits } = useOnboarding();
  useSessionRefresh();

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [creditsAwarded, setCreditsAwarded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [offerExpiry, setOfferExpiry] = useState<Date | null>(null);
  const [isStartingGeneration, setIsStartingGeneration] = useState(true);
  const startedRef = useRef(false);

  const { job, images: jobImages, createJob } = useGeminiImageJobUnified('gemini');
  const isGenerating = isStartingGeneration || job?.status === 'queued' || job?.status === 'processing';
  const isComplete = job?.status === 'completed' && !isStartingGeneration;
  const readyImages = jobImages.filter(img => img.public_url);

  // Get pack info for labels
  const packId = (data.selectedPack || 'ecommerce') as PackId;
  const isFashion = data.isFashion ?? false;
  const pack = getPack(isFashion, packId);
  const styleLabels = pack?.styles.map(s => t(s.labelKey)) || ['Image 1', 'Image 2', 'Image 3', 'Image 4'];

  // Rotate loading messages
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Start generation on mount
  useEffect(() => {
    if (startedRef.current || !data.sourceImageId || !pack) return;
    startedRef.current = true;

    const prompt = buildPackPrompt(pack, isFashion);

    createJob({
      prompt,
      settings: {
        number: 4,
        quality: 'high' as const,
        aspectRatio: pack.ratio === '3:4' ? '3:4' : '1:1',
      },
      source_image_ids: [data.sourceImageId],
    }).finally(() => {
      setIsStartingGeneration(false);
    });

    setOfferExpiry(new Date(Date.now() + 48 * 60 * 60 * 1000));
  }, [data, pack, isFashion, createJob]);

  // Award credits when complete
  useEffect(() => {
    if (isComplete && !creditsAwarded && user) {
      awardCredits().then(success => {
        if (success) {
          setCreditsAwarded(true);
          toast.success(t('onboarding.results.creditsAwarded'));
        }
      });
    }
  }, [isComplete, creditsAwarded, user, awardCredits, t]);

  const handleGetOffer = async () => {
    if (authLoading) { toast.error(t('onboarding.offer.pleaseWait')); return; }
    if (!user) { toast.error(t('onboarding.offer.authRequired')); return; }
    
    setIsCheckingOut(true);
    try {
      const { data: checkoutData, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: 'starter', interval: 'month', promoCode: 'ONB1ST' },
      });
      if (error) throw new Error(error.message || 'Checkout failed');
      if (!checkoutData?.url) throw new Error('No checkout URL received');
      window.location.href = checkoutData.url;
    } catch (error: any) {
      if (error?.message?.includes('not authenticated')) {
        toast.error(t('onboarding.offer.sessionExpired'));
      } else {
        toast.error(t('onboarding.offer.checkoutError'));
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleStartFree = async () => {
    await completeOnboarding();
    navigate('/create/ugc-gemini');
  };

  const getCountdown = () => {
    if (!offerExpiry) return null;
    const diff = offerExpiry.getTime() - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return t('onboarding.offer.expiresIn', { hours, minutes });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          {isGenerating ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-7 h-7 text-primary" />
            </motion.div>
          ) : (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
              <Sparkles className="w-7 h-7 text-primary" />
            </motion.div>
          )}
        </div>
        <h1 className="text-xl font-bold">
          {isGenerating ? t('onboarding.loading.almostDone') : t('onboarding.results.title')}
        </h1>
        {isGenerating && (
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-muted-foreground mt-1"
            >
              {t(LOADING_MESSAGES[loadingMessageIndex])}
            </motion.p>
          </AnimatePresence>
        )}
      </div>

      {/* 2×2 Image Grid */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {[0, 1, 2, 3].map((index) => {
            const image = readyImages[index];
            const label = styleLabels[index] || `Image ${index + 1}`;
            return (
              <motion.div
                key={index}
                className={`relative overflow-hidden rounded-xl bg-muted/20 ${
                  pack?.ratio === '3:4' ? 'aspect-[3/4]' : 'aspect-square'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {image ? (
                  <>
                    <motion.img
                      src={image.public_url}
                      alt={label}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    {/* Style label badge */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-background/70 text-foreground backdrop-blur-sm">
                        {label}
                      </span>
                    </div>
                  </>
                ) : (
                  <PlaceholderCell label={label} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Credits Awarded Banner */}
      {creditsAwarded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg mb-4"
        >
          <Gift className="w-4 h-4" />
          <span className="text-sm font-medium">{t('onboarding.results.creditsAwarded')}</span>
        </motion.div>
      )}

      {/* Pricing Offer Card */}
      {isComplete && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t('onboarding.offer.title')}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t('onboarding.offer.subtitle')}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-bold">€9.99</span>
                  <span className="text-sm text-muted-foreground line-through">€29</span>
                  <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                    {t('onboarding.offer.saveAmount')}
                  </span>
                </div>
              </div>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {['oneTimePayment', 'noSubscription', 'noAutoRenewal'].map((key) => (
                <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                  ✓ {t(`onboarding.offer.${key}`)}
                </span>
              ))}
            </div>
            {getCountdown() && (
              <p className="text-xs text-muted-foreground mt-2">{getCountdown()}</p>
            )}
            <Button onClick={handleGetOffer} disabled={isCheckingOut} className="w-full mt-3" size="lg">
              {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : t('onboarding.offer.getOffer')}
            </Button>
          </Card>
          <Button onClick={handleStartFree} variant="ghost" className="w-full mt-3 text-muted-foreground">
            {t('onboarding.offer.startFree')}
          </Button>
        </motion.div>
      )}
    </div>
  );
};
