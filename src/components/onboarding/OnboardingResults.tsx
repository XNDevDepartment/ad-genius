import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Gift, ChevronLeft, ChevronRight, Crown, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOnboarding, OnboardingData } from '@/hooks/useOnboarding';
import { useGeminiImageJobUnified } from '@/hooks/useGeminiImageJobUnified';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import '@/costumn.css';

interface OnboardingResultsProps {
  data: OnboardingData;
}

const LOADING_MESSAGES = [
  'onboarding.loading.creating',
  'onboarding.loading.addingLighting',
  'onboarding.loading.almostDone'
];

// Placeholder cell component matching UGC Gemini panel
const PlaceholderCell = () => (
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
        <Image className="h-8 w-8 text-white/90 mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-white/90 font-medium">Generating...</p>
      </div>
    </div>
  </div>
);

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
  const [isStartingGeneration, setIsStartingGeneration] = useState(true); // Start true to show loading immediately
  const startedRef = useRef(false);

  const { job, images: jobImages, createJob } = useGeminiImageJobUnified('gemini');
  // Include isStartingGeneration to handle the time before job is created
  const isGenerating = isStartingGeneration || job?.status === 'queued' || job?.status === 'processing';
  const isComplete = job?.status === 'completed' && !isStartingGeneration;
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
    }).finally(() => {
      setIsStartingGeneration(false);
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
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          {isGenerating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-7 h-7 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <Sparkles className="w-7 h-7 text-primary" />
            </motion.div>
          )}
        </div>
        <h1 className="text-xl font-bold">
          {isGenerating ? t('onboarding.loading.creating') : t('onboarding.results.title')}
        </h1>
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
              className="flex flex-col items-center justify-center py-6 w-full max-w-md mx-auto"
            >
              {/* Progress header */}
              <div className="text-center mb-6">
                <motion.p 
                  key={job?.progress}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-foreground mb-2"
                >
                  {job?.progress || 0}%
                </motion.p>
                
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground"
                  >
                    {t(LOADING_MESSAGES[loadingMessageIndex])}
                  </motion.p>
                </AnimatePresence>
              </div>
              
              {/* Image grid with placeholders - matches UGC panel */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {[0, 1].map((index) => {
                  const image = readyImages[index];
                  return (
                    <motion.div 
                      key={index} 
                      className="relative aspect-square rounded-xl overflow-hidden bg-muted/20"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {image ? (
                        <motion.img
                          src={image.public_url}
                          alt="Generated"
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      ) : (
                        <PlaceholderCell />
                      )}
                    </motion.div>
                  );
                })}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading your images...</p>
            </div>
          )}
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
