import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MultiImageUploader from '@/components/MultiImageUploader';
import { useSourceImageUpload, SourceImage } from '@/hooks/useSourceImageUpload';

interface OnboardingStep1Props {
  onNext: (imageUrl: string, sourceImageId: string) => void;
}

export const OnboardingStep1 = ({ onNext }: OnboardingStep1Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [urlUploading, setUrlUploading] = useState(false);
  
  const { uploadSourceImage, uploading } = useSourceImageUpload();

  const handleImagesSelect = useCallback(async (files: File[]) => {
    setProductImages(files);
    
    // If a file is added and we don't have a source image yet, upload it
    if (files.length > 0 && files[0] !== productImages[0]) {
      try {
        const uploaded = await uploadSourceImage(files[0]);
        if (uploaded) {
          setSourceImage(uploaded);
          toast.success(t('onboarding.step1.uploadSuccess'));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setProductImages([]);
      }
    }
    
    // If file is removed, clear the source image
    if (files.length === 0) {
      setSourceImage(null);
    }
  }, [productImages, uploadSourceImage, t]);

  const handleUrlSubmit = useCallback(async () => {
    if (!imageUrl || !user) return;
    
    setUrlUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl }
      });

      if (error) throw error;

      setSourceImage({
        id: data.sourceImage.id,
        publicUrl: data.sourceImage.public_url,
        fileName: data.sourceImage.file_name,
        fileSize: data.sourceImage.file_size,
        mimeType: data.sourceImage.mime_type,
        createdAt: data.sourceImage.created_at
      });
      toast.success(t('onboarding.step1.uploadSuccess'));
    } catch (error: any) {
      console.error('URL upload error:', error);
      toast.error(t('onboarding.step1.urlError'));
    } finally {
      setUrlUploading(false);
    }
  }, [imageUrl, user, t]);

  const handleContinue = () => {
    if (sourceImage) {
      onNext(sourceImage.publicUrl, sourceImage.id);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step1.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.step1.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {t('onboarding.step1.uploadTab')}
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            {t('onboarding.step1.urlTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <MultiImageUploader
            onImagesSelect={handleImagesSelect}
            selectedImages={productImages}
            isAnalyzing={uploading ? [true] : []}
            analyzingText={t('onboarding.step1.uploading')}
            maxImages={1}
          />
        </TabsContent>

        <TabsContent value="url">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('onboarding.step1.placeholder')}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button onClick={handleUrlSubmit} disabled={!imageUrl || urlUploading}>
                {urlUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('onboarding.step1.fetch')}
              </Button>
            </div>
            {sourceImage && activeTab === 'url' && (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img 
                  src={sourceImage.publicUrl} 
                  alt="Preview" 
                  className="w-full aspect-square object-contain bg-muted"
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!sourceImage}
        onClick={handleContinue}
      >
        {t('onboarding.continue')}
      </Button>
    </div>
  );
};
