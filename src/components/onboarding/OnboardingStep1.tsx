import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSourceImageUpload } from '@/hooks/useSourceImageUpload';
import { geminiV3Api } from '@/api/ugc-gemini-unified';
import { SAMPLE_PRODUCTS } from '@/data/onboarding-scenarios';
import { useTranslation } from 'react-i18next';

const ONBOARDING_PROMPT =
  'Professional product photography on a clean minimal background, natural light, sharp details, commercial quality, lifestyle context';

interface Props {
  onNext: (imageUrl: string, sourceImageId: string, jobId: string) => void;
}

export const OnboardingStep1 = ({ onNext }: Props) => {
  const { t } = useTranslation();
  const { uploadSourceImage, uploading } = useSourceImageUpload();
  const [generatingJobId, setGeneratingJobId] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const isLoading = uploading || generatingJobId;

  const processUpload = useCallback(async (file: File) => {
    const uploaded = await uploadSourceImage(file);
    if (!uploaded) return;

    // fire generation in background — don't await full completion
    setGeneratingJobId(true);
    try {
      const result = await geminiV3Api.createImageJob({
        prompt: ONBOARDING_PROMPT,
        settings: {
          number: 4,
          quality: 'medium',
          aspectRatio: '1:1',
          imageSize: '1K',
        },
        source_image_ids: [uploaded.id],
      });
      onNext(uploaded.publicUrl, uploaded.id, result.jobId);
    } catch (err) {
      console.error('[Onboarding] Background generation failed:', err);
      // still advance — reveal page will handle missing job gracefully
      onNext(uploaded.publicUrl, uploaded.id, '');
    } finally {
      setGeneratingJobId(false);
    }
  }, [uploadSourceImage, onNext]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processUpload(file);
  }, [processUpload]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) await processUpload(file);
  }, [processUpload]);

  const handleSampleSelect = useCallback(async (sample: typeof SAMPLE_PRODUCTS[0]) => {
    if (isLoading) return;
    setLoadingSampleId(sample.id);
    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], `${sample.id}.png`, { type: 'image/png' });
      await processUpload(file);
    } catch {
      toast.error('Erro ao carregar a imagem de exemplo.');
    } finally {
      setLoadingSampleId(null);
    }
  }, [isLoading, processUpload]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Carrega uma foto do teu produto
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Vamos gerar imagens profissionais em segundos — já estamos a preparar tudo enquanto continuas.
          </p>

          {/* Drop zone */}
          <label
            htmlFor="product-upload"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all min-h-[180px] ${
              isLoading
                ? 'border-primary/50 bg-primary/5 cursor-wait'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'A carregar...' : 'A iniciar geração...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Arrasta aqui ou clica para escolher</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP · máx. 10MB</p>
                </div>
              </div>
            )}
            <input
              id="product-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>

          {/* Sample products */}
          <div className="mt-8">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Ou experimenta com um produto de exemplo
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLE_PRODUCTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSampleSelect(sample)}
                  disabled={isLoading}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all active:scale-95 disabled:opacity-40"
                >
                  <img
                    src={sample.url}
                    alt={t(sample.labelKey)}
                    className="w-full h-full object-cover"
                  />
                  {loadingSampleId === sample.id && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
