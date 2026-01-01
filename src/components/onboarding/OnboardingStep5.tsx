import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Video, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep5Props {
  generatedImages: string[];
  generateBonusVideo: (imageUrl: string) => Promise<{ success: boolean; videoUrl?: string; jobId?: string; error?: string }>;
  onComplete: () => void;
}

export const OnboardingStep5 = ({ generatedImages, generateBonusVideo, onComplete }: OnboardingStep5Props) => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(generatedImages[0] || null);
  const [status, setStatus] = useState<'select' | 'generating' | 'complete'>('select');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleAnimate = async () => {
    if (!selectedImage) return;
    
    setStatus('generating');
    const result = await generateBonusVideo(selectedImage);
    
    if (result.success) {
      setJobId(result.jobId || null);
      // Poll for video completion
      if (result.jobId) {
        pollForVideo(result.jobId);
      } else if (result.videoUrl) {
        setVideoUrl(result.videoUrl);
        setStatus('complete');
      }
    } else {
      setStatus('select');
    }
  };

  const pollForVideo = async (id: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      const { data: job } = await supabase
        .from('kling_jobs')
        .select('status, video_url')
        .eq('id', id)
        .single();

      if (job?.status === 'completed' && job?.video_url) {
        setVideoUrl(job.video_url);
        setStatus('complete');
      } else if (job?.status === 'failed' || attempts >= maxAttempts) {
        setStatus('select');
      } else {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step5.title')}</h1>
        <p className="text-muted-foreground">
          {status === 'generating' 
            ? t('onboarding.step5.animating')
            : status === 'complete'
            ? t('onboarding.step5.complete')
            : t('onboarding.step5.subtitle')
          }
        </p>
      </div>

      {status === 'select' && (
        <>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t('onboarding.step5.selectImage')}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {generatedImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(url)}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  selectedImage === url 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <img src={url} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
                {selectedImage === url && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedImage}
            onClick={handleAnimate}
          >
            <Play className="w-4 h-4 mr-2" />
            {t('onboarding.step5.animate')}
          </Button>
        </>
      )}

      {status === 'generating' && (
        <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{t('onboarding.step5.generatingVideo')}</p>
          </div>
        </div>
      )}

      {status === 'complete' && videoUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="aspect-video rounded-lg overflow-hidden border border-border shadow-lg"
        >
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            loop 
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm text-primary font-medium">
          ✨ {t('onboarding.step5.freeNote')}
        </p>
      </div>

      {(status === 'complete' || status === 'select') && (
        <Button
          className="w-full mt-8"
          size="lg"
          onClick={handleComplete}
          variant={status === 'complete' ? 'default' : 'outline'}
        >
          {status === 'complete' ? t('onboarding.finish') : t('onboarding.skipVideo')}
        </Button>
      )}
    </div>
  );
};
