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

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('Uploading source image directly to storage:', file.name);

      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storagePath = `${user.id}/${uniqueFileName}`;

      // 1. Upload directly to Supabase Storage (no base64, no edge function)
      const { error: uploadError } = await supabase.storage
        .from('source-images')
        .upload(storagePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('source-images')
        .getPublicUrl(storagePath);

      console.log('Source image uploaded to storage, creating database record');

      // 3. Save to database
      const { data: sourceImage, error: dbError } = await supabase
        .from('source_images')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'image/jpeg'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Cleanup uploaded file if database insert fails
        await supabase.storage
          .from('source-images')
          .remove([storagePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Source image saved successfully:', sourceImage.id);

      return {
        id: sourceImage.id,
        publicUrl: sourceImage.public_url,
        fileName: sourceImage.file_name,
        fileSize: sourceImage.file_size,
        mimeType: sourceImage.mime_type,
        createdAt: sourceImage.created_at
      };
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
