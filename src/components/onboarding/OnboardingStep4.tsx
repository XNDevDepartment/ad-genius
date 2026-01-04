import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ImageIcon, AlertCircle, Video } from 'lucide-react';
import { OnboardingData, useOnboarding } from '@/hooks/useOnboarding';
import { motion } from 'framer-motion';
import { useGeminiImageJobUnified } from '@/hooks/useGeminiImageJobUnified';
import { createVideoJob } from '@/api/kling';
import { toast } from 'sonner';

interface OnboardingStep4Props {
  data: OnboardingData;
}

export const OnboardingStep4 = ({ data }: OnboardingStep4Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboarding();
  const [hasStarted, setHasStarted] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const startedRef = useRef(false);
  
  // Use the unified gemini hook (same as UGC panel)
  const { job, images: jobImages, createJob, clearJob } = useGeminiImageJobUnified('gemini');

  const isGenerating = job?.status === 'queued' || job?.status === 'processing';
  const isComplete = job?.status === 'completed';
  const hasFailed = job?.status === 'failed' || job?.status === 'canceled';

  // Start generation when component mounts
  useEffect(() => {
    if (startedRef.current) return;
    if (!data.sourceImageId || !data.selectedScenario) {
      console.error('[OnboardingStep4] Missing required data:', { 
        sourceImageId: data.sourceImageId, 
        selectedScenario: data.selectedScenario 
      });
      return;
    }

    startedRef.current = true;
    setHasStarted(true);
    startGeneration();
  }, [data.sourceImageId, data.selectedScenario]);

  const startGeneration = async () => {
    try {
      clearJob();
      
      const scenario = data.selectedScenario;
      const audience = data.audience || 'general consumers';

      // Build prompt using same structure as UGC Gemini panel
      const prompt = `
TASK: Create authentic UGC photo featuring this product.

SCENARIO: ${scenario?.description || 'Natural lifestyle moment'}
AUDIENCE: ${audience}

MANDATORY RULES:

1. PRODUCT INTEGRITY:
   - Use EXACT product from reference image
   - Keep all labels, colors, shapes, branding unchanged
   - Product is hero - 40-60% of frame

2. AUTHENTICITY:
   - iPhone-quality photography
   - Natural lighting, real environments
   - Slight imperfections (soft focus, natural shadows)
   - Casual, off-center framing

3. STYLE:
   - lifestyle photography aesthetic
   - natural lighting

4. QUALITY:
   - No AI artifacts, watermarks, text
   - Natural human anatomy if people appear
   - No invented branding

--negative "AI artifacts, text overlays, watermark, extreme bokeh, macro close-up, center-composed product, invented branding, extra limbs, low resolution, duplicated faces, similar persons"

OUTPUT: Single authentic UGC photo ready for social media.
`.trim();

      console.log('[OnboardingStep4] Creating job with:', {
        sourceImageId: data.sourceImageId,
        prompt: prompt.slice(0, 100) + '...'
      });

      const result = await createJob({
        prompt,
        settings: {
          number: 2,
          quality: 'high',
          style: 'lifestyle',
          timeOfDay: 'natural',
          highlight: 'yes',
          output_format: 'png',
          aspectRatio: '1:1',
        },
        source_image_ids: [data.sourceImageId!],
        desiredAudience: audience,
      });

      if (!result) {
        throw new Error('Failed to create generation job');
      }

      console.log('[OnboardingStep4] Job created:', result.jobId);
    } catch (error) {
      console.error('[OnboardingStep4] Generation error:', error);
      toast.error(t('onboarding.step4.error'));
    }
  };

  // Handle completion
  useEffect(() => {
    if (isComplete && jobImages.length > 0) {
      const imageUrls = jobImages
        .filter(img => img.public_url)
        .map(img => img.public_url);
      
      console.log('[OnboardingStep4] Generation complete, images:', imageUrls.length);
    }
  }, [isComplete, jobImages]);

  const handleAnimate = async () => {
    if (readyImages.length === 0) return;
    
    setIsCreatingVideo(true);
    
    try {
      const firstImage = readyImages[0];
      
      const result = await createVideoJob({
        ugc_image_id: firstImage.id,
        prompt: "Give natural, subtle movement to this image. Make it feel alive with gentle motion while maintaining authenticity.",
        duration: 5,
        model: "fal-ai/kling-video/v2.6/pro/image-to-video"
      });
      
      if (result.success) {
        await completeOnboarding();
        toast.success(t('onboarding.step4.videoStarted'));
        navigate('/videos');
      } else {
        throw new Error(result.error || 'Failed to create video job');
      }
    } catch (error) {
      console.error('[OnboardingStep4] Video creation error:', error);
      toast.error(t('onboarding.step4.videoError'));
    } finally {
      setIsCreatingVideo(false);
    }
  };

  const handleSkipVideo = async () => {
    await completeOnboarding();
    navigate('/create/ugc-gemini');
  };

  const readyImages = jobImages.filter(img => img.public_url);
  const progress = job?.progress || 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          {isGenerating ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : hasFailed ? (
            <AlertCircle className="w-8 h-8 text-destructive" />
          ) : (
            <Sparkles className="w-8 h-8 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step4.title')}</h1>
        <p className="text-muted-foreground">
          {isGenerating
            ? t('onboarding.step4.generating')
            : isComplete
            ? t('onboarding.step4.complete')
            : hasFailed
            ? t('onboarding.step4.failed')
            : t('onboarding.step4.preparing')
          }
        </p>
        {isGenerating && progress > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {Math.round(progress)}% complete
          </p>
        )}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 gap-4">
        {isGenerating || !hasStarted ? (
          // Placeholders while generating
          [1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted animate-pulse flex items-center justify-center"
            >
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          ))
        ) : readyImages.length > 0 ? (
          // Show generated images
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="contents"
          >
            {readyImages.map((img, i) => (
              <div
                key={img.id || i}
                className="aspect-square rounded-lg overflow-hidden border border-border shadow-lg"
              >
                <img 
                  src={img.public_url} 
                  alt={`Generated ${i + 1}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </motion.div>
        ) : hasFailed ? (
          // Error state
          <div className="col-span-2 text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              {job?.error || t('onboarding.step4.errorMessage')}
            </p>
            <Button variant="outline" onClick={startGeneration}>
              {t('onboarding.step4.retry')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-primary font-medium">
          ✨ {t('onboarding.step4.freeNote')}
        </p>
      </div>

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!isComplete || readyImages.length === 0 || isCreatingVideo}
        onClick={handleAnimate}
      >
        {isCreatingVideo ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('onboarding.step4.creatingVideo')}
          </>
        ) : (
          <>
            <Video className="w-4 h-4 mr-2" />
            {t('onboarding.step4.animateImage')}
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        className="w-full mt-2"
        disabled={!isComplete || isCreatingVideo}
        onClick={handleSkipVideo}
      >
        {t('onboarding.step4.skipAndFinish')}
      </Button>
    </div>
  );
};
