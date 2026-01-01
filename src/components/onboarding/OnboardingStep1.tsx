import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingStep1Props {
  onNext: (imageUrl: string, sourceImageId: string) => void;
}

export const OnboardingStep1 = ({ onNext }: OnboardingStep1Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('source-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('source-images')
        .getPublicUrl(fileName);

      // Save to source_images table
      const { data: sourceImage, error: dbError } = await supabase
        .from('source_images')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          public_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setPreviewUrl(publicUrl);
      setSourceImageId(sourceImage.id);
      toast.success(t('onboarding.step1.uploadSuccess'));
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(t('onboarding.step1.uploadError'));
    } finally {
      setUploading(false);
    }
  }, [user, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUrlSubmit = useCallback(async () => {
    if (!imageUrl || !user) return;
    
    setUploading(true);
    try {
      // Use the upload-source-image-from-url edge function
      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { url: imageUrl }
      });

      if (error) throw error;

      setPreviewUrl(data.public_url);
      setSourceImageId(data.id);
      toast.success(t('onboarding.step1.uploadSuccess'));
    } catch (error: any) {
      console.error('URL upload error:', error);
      toast.error(t('onboarding.step1.urlError'));
    } finally {
      setUploading(false);
    }
  }, [imageUrl, user, t]);

  const handleContinue = () => {
    if (previewUrl && sourceImageId) {
      onNext(previewUrl, sourceImageId);
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
          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full aspect-square object-contain bg-muted"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPreviewUrl(null);
                  setSourceImageId(null);
                }}
              >
                {t('common.remove')}
              </Button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {uploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {t('onboarding.step1.dropzone')}
              </p>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="url">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('onboarding.step1.placeholder')}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button onClick={handleUrlSubmit} disabled={!imageUrl || uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('onboarding.step1.fetch')}
              </Button>
            </div>
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img 
                  src={previewUrl} 
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
        disabled={!previewUrl || !sourceImageId}
        onClick={handleContinue}
      >
        {t('onboarding.continue')}
      </Button>
    </div>
  );
};
