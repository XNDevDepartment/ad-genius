import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Link, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MultiImageUploader from '@/components/MultiImageUploader';
import { useSourceImageUpload, SourceImage } from '@/hooks/useSourceImageUpload';
import { SAMPLE_PRODUCTS } from '@/data/onboarding-scenarios';
import { motion } from 'framer-motion';

interface OnboardingStep1Props {
  onNext: (imageUrl: string, sourceImageId: string) => void;
}

export const OnboardingStep1 = ({ onNext }: OnboardingStep1Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [urlUploading, setUrlUploading] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  
  const { uploadSourceImage, uploading } = useSourceImageUpload();

  const handleImagesSelect = useCallback(async (files: File[]) => {
    setProductImages(files);
    
    if (files.length > 0 && files[0] !== productImages[0]) {
      try {
        const uploaded = await uploadSourceImage(files[0]);
        if (uploaded) {
          setSourceImage(uploaded);
          toast.success(t('onboarding.step1.uploadSuccess'));
          // Auto-advance after successful upload
          setTimeout(() => onNext(uploaded.publicUrl, uploaded.id), 500);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setProductImages([]);
      }
    }
    
    if (files.length === 0) {
      setSourceImage(null);
    }
  }, [productImages, uploadSourceImage, t, onNext]);

  const handleUrlSubmit = useCallback(async () => {
    if (!imageUrl || !user) return;
    
    setUrlUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl }
      });

      if (error) throw error;

      const uploaded = {
        id: data.sourceImage.id,
        publicUrl: data.sourceImage.public_url,
        fileName: data.sourceImage.file_name,
        fileSize: data.sourceImage.file_size,
        mimeType: data.sourceImage.mime_type,
        createdAt: data.sourceImage.created_at
      };
      setSourceImage(uploaded);
      toast.success(t('onboarding.step1.uploadSuccess'));
      // Auto-advance
      setTimeout(() => onNext(uploaded.publicUrl, uploaded.id), 500);
    } catch (error: any) {
      console.error('URL upload error:', error);
      toast.error(t('onboarding.step1.urlError'));
    } finally {
      setUrlUploading(false);
    }
  }, [imageUrl, user, t, onNext]);

  const handleSampleSelect = useCallback(async (sample: typeof SAMPLE_PRODUCTS[0]) => {
    if (!user) return;
    
    setLoadingSampleId(sample.id);
    try {
      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: sample.url }
      });

      if (error) throw error;

      const uploaded = {
        id: data.sourceImage.id,
        publicUrl: data.sourceImage.public_url,
        fileName: data.sourceImage.file_name,
        fileSize: data.sourceImage.file_size,
        mimeType: data.sourceImage.mime_type,
        createdAt: data.sourceImage.created_at
      };
      setSourceImage(uploaded);
      toast.success(t('onboarding.step1.uploadSuccess'));
      // Auto-advance
      setTimeout(() => onNext(uploaded.publicUrl, uploaded.id), 500);
    } catch (error: any) {
      console.error('Sample upload error:', error);
      toast.error(t('onboarding.step1.uploadError'));
    } finally {
      setLoadingSampleId(null);
    }
  }, [user, t, onNext]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <ImageIcon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-1">{t('onboarding.step1.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('onboarding.step1.subtitle')}</p>
      </div>

      {/* Upload Area */}
      <div className="flex-1">
        <MultiImageUploader
          onImagesSelect={handleImagesSelect}
          selectedImages={productImages}
          isAnalyzing={uploading ? [true] : []}
          analyzingText={t('onboarding.step1.uploading')}
          maxImages={1}
        />

        {/* URL Input Toggle */}
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            <Link className="w-4 h-4" />
            {t('onboarding.step1.urlTab')}
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-2"
          >
            <div className="flex gap-2">
              <Input
                placeholder={t('onboarding.step1.placeholder')}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleUrlSubmit} 
                disabled={!imageUrl || urlUploading}
                size="sm"
              >
                {urlUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('onboarding.step1.fetch')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Sample Products */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t('onboarding.samples.title')}
          </p>
          <div className="grid grid-cols-4 gap-3">
            {SAMPLE_PRODUCTS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSampleSelect(sample)}
                disabled={loadingSampleId !== null}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <img
                  src={sample.url}
                  alt={t(sample.labelKey)}
                  className="w-full h-full object-cover"
                />
                {loadingSampleId === sample.id && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {t('onboarding.samples.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
};
