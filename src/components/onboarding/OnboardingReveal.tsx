import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { geminiV3Api, UgcImageRow, JobRow } from '@/api/ugc-gemini-unified';

const LOADING_MESSAGES = [
  'A criar as tuas imagens...',
  'A analisar o produto...',
  'A preparar a cena...',
  'A calibrar a iluminação...',
  'Quase pronto...',
];

interface Props {
  jobId?: string;
  onLiked: (liked: boolean) => void;
}

export const OnboardingReveal = ({ jobId, onLiked }: Props) => {
  const [images, setImages] = useState<UgcImageRow[]>([]);
  const [jobStatus, setJobStatus] = useState<JobRow['status'] | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  const isLoading = !revealed && (jobStatus !== 'completed' && jobStatus !== 'failed');
  const hasImages = images.filter(i => i.public_url).length > 0;

  // Rotate loading messages
  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(t);
  }, [isLoading]);

  // Poll job status
  useEffect(() => {
    if (!jobId) {
      // no job — skip straight to reveal with empty state
      setJobStatus('failed');
      return;
    }

    unmountedRef.current = false;

    const poll = async () => {
      try {
        const { job } = await geminiV3Api.getJob(jobId);
        if (unmountedRef.current) return;
        setJobStatus(job.status);

        if (job.status === 'completed' || job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);

          if (job.status === 'completed') {
            const { images: imgs } = await geminiV3Api.getJobImages(jobId);
            if (!unmountedRef.current) {
              setImages(imgs.filter(i => i.public_url));
              setRevealed(true);
            }
          } else {
            setRevealed(true);
          }
        }
      } catch {
        // silently ignore poll errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2500);

    return () => {
      unmountedRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  // Trigger reveal animation once images are ready
  useEffect(() => {
    if (jobStatus === 'failed') setRevealed(true);
  }, [jobStatus]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-10 h-10 text-primary" />
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-muted-foreground text-sm text-center"
                >
                  {LOADING_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>
              <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
                Podes continuar a responder — quando estiver pronto aparece aqui automaticamente.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-7 h-7 text-primary" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
                  Olha o que fizemos com o teu produto
                </h1>
                {!hasImages && (
                  <p className="text-sm text-muted-foreground">
                    A geração demorou mais do que esperado — experimenta criar imagens no dashboard.
                  </p>
                )}
              </div>

              {/* 2×2 grid */}
              {hasImages && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[0, 1, 2, 3].map((i) => {
                    const img = images[i];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.35, delay: 0.2 + i * 0.15 }}
                        className="relative aspect-square rounded-2xl overflow-hidden bg-muted"
                      >
                        {img ? (
                          <img
                            src={img.public_url}
                            alt={`Imagem gerada ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Liked? */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: hasImages ? 0.8 : 0.3, duration: 0.35 }}
              >
                <p className="text-base font-medium text-center mb-4">
                  {hasImages ? 'Gostaste do resultado?' : 'Queres experimentar na mesma?'}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => onLiked(true)}
                    className="w-full py-4 rounded-2xl border-2 border-border font-medium text-base hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                  >
                    {hasImages ? 'Sim, adorei! 🙌' : 'Quero ver mais'}
                  </button>
                  <button
                    onClick={() => onLiked(false)}
                    className="w-full py-4 rounded-2xl border-2 border-border font-medium text-base hover:border-border/60 hover:bg-muted/50 transition-all active:scale-[0.98] text-muted-foreground"
                  >
                    {hasImages ? 'Não muito...' : 'Não tenho interesse'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
