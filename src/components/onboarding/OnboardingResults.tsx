import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Gift, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOnboarding, OnboardingData } from '@/hooks/useOnboarding';
import { useGeminiImageJobUnified } from '@/hooks/useGeminiImageJobUnified';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingResultsProps {
  data: OnboardingData;
}

const LOADING_MESSAGES = [
  'onboarding.loading.creating',
  'onboarding.loading.addingLighting',
  'onboarding.loading.almostDone'
];

export const OnboardingResults = ({ data }: OnboardingResultsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeOnboarding, awardCredits } = useOnboarding();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [creditsAwarded, setCreditsAwarded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [offerExpiry, setOfferExpiry] = useState<Date | null>(null);
  const startedRef = useRef(false);

  const { job, images: jobImages, createJob } = useGeminiImageJobUnified('gemini');
  const isGenerating = job?.status === 'queued' || job?.status === 'processing';
  const isComplete = job?.status === 'completed';
  const readyImages = jobImages.filter(img => img.public_url);

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
    if (startedRef.current || !data.sourceImageId || !data.selectedScenario) return;
    startedRef.current = true;

    // Get prompt from either custom prompt field or description
    const scenarioPrompt = data.selectedScenario.prompt || data.selectedScenario.description;
    
    const prompt = `
TASK: Create authentic UGC photo featuring this product.

SCENARIO: ${scenarioPrompt}

MANDATORY RULES:
1. PRODUCT INTEGRITY: Use EXACT product from reference image. Keep all labels, colors, shapes, branding unchanged.
2. AUTHENTICITY: iPhone-quality photography, natural lighting, real environments.
3. QUALITY: No AI artifacts, watermarks, text. Natural human anatomy if people appear.

OUTPUT: Single authentic UGC photo ready for social media.
`.trim();

    createJob({
      prompt,
      settings: {
        number: 2,
        quality: 'high',
        style: 'lifestyle',
        aspectRatio: '1:1',
      },
      source_image_ids: [data.sourceImageId],
    });

    // Set offer expiry (48 hours from now)
    setOfferExpiry(new Date(Date.now() + 48 * 60 * 60 * 1000));
  }, [data, createJob]);

  // Award credits when generation completes
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
    if (!user) return;
    
    setIsCheckingOut(true);
    try {
      const { data: checkoutData, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: 'onboarding_first_month',
          interval: 'month',
          is_onboarding_offer: true
        }
      });

      if (error) throw error;
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(t('common.error'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleStartFree = async () => {
    await completeOnboarding();
    navigate('/create/ugc-gemini');
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % readyImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + readyImages.length) % readyImages.length);
  };

  // Format countdown
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
        <h1 className="text-xl font-bold">
          {isGenerating ? t('onboarding.loading.creating') : t('onboarding.results.title')}
        </h1>
        {isGenerating && (
          <p className="text-sm text-muted-foreground mt-1">
            {t(LOADING_MESSAGES[loadingMessageIndex])}
          </p>
        )}
      </div>

      {/* Image Display */}
      <div className="relative flex-1 flex items-center justify-center mb-4">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm aspect-square rounded-2xl bg-muted animate-pulse flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{job?.progress || 0}%</p>
              </div>
            </motion.div>
          ) : readyImages.length > 0 ? (
            <motion.div
              key="images"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-sm"
            >
              {/* Main Image */}
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img
                  src={readyImages[currentImageIndex]?.public_url}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Navigation Arrows */}
              {readyImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {readyImages.length > 1 && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {readyImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t('onboarding.offer.firstMonth')}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold">€19.99</span>
                  <span className="text-sm text-muted-foreground line-through">€29</span>
                  <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                    {t('onboarding.offer.saveAmount')}
                  </span>
                </div>
                {getCountdown() && (
                  <p className="text-xs text-muted-foreground mt-1">{getCountdown()}</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleGetOffer}
              disabled={isCheckingOut}
              className="w-full mt-4"
              size="lg"
            >
              {isCheckingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('onboarding.offer.getOffer')
              )}
            </Button>
          </Card>

          <Button
            onClick={handleStartFree}
            variant="ghost"
            className="w-full mt-3 text-muted-foreground"
          >
            {t('onboarding.offer.startFree')}
          </Button>
        </motion.div>
      )}
    </div>
  );
};
