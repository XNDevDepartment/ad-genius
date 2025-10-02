import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SourceImage {
  id: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export const useSourceImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadSourceImage = async (file: File): Promise<SourceImage | null> => {
    if (!file) return null;

    try {
      setUploading(true);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('Uploading source image:', file.name);

      // Call the upload-source-image edge function
      const { data, error } = await supabase.functions.invoke('upload-source-image', {
        body: {
          base64Image: base64,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      });

      if (error) {
        console.error('Upload source image error:', error);
        throw new Error(error.message || 'Failed to upload source image');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload source image');
      }

      console.log('Source image uploaded successfully:', data.sourceImage);
      // toast.success('Source image uploaded successfully');

      return data.sourceImage;
    } catch (error) {
      console.error('Error uploading source image:', error);
      toast.error('Failed to upload source image');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadSourceImage,
    uploading
  };
};