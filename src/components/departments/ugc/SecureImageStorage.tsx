
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureImage {
  id: string;
  url: string;
  prompt: string;
  settings: any;
  created_at: string;
}

export const useSecureImageStorage = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<SecureImage[]>([]);
  const [loading, setLoading] = useState(false);

  const saveImages = async (imageData: {
    base64Images: string[];
    prompt: string;
    settings: any;
  }) => {
    if (!user) return [];

    try {
      setLoading(true);
      const savedImages: SecureImage[] = [];

      for (const [index, base64] of imageData.base64Images.entries()) {
        // Convert base64 to blob
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });

        // Generate unique filename
        const fileName = `${user.id}/${crypto.randomUUID()}.png`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Failed to upload image ${index + 1}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        // Save metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('generated_images')
          .insert({
            user_id: user.id,
            storage_path: fileName,
            public_url: urlData.publicUrl,
            prompt: imageData.prompt,
            settings: imageData.settings
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          // Clean up uploaded file if database insert fails
          await supabase.storage.from('generated-images').remove([fileName]);
          throw new Error(`Failed to save image metadata: ${dbError.message}`);
        }

        const imageRecord: SecureImage = {
          id: dbData.id,
          url: urlData.publicUrl,
          prompt: dbData.prompt,
          settings: dbData.settings,
          created_at: dbData.created_at,
        };

        savedImages.push(imageRecord);
      }

      // Refresh the images list
      await loadImages();
      return savedImages;
    } catch (error) {
      console.error('Failed to save images:', error);
      throw new Error('Failed to save images securely');
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    if (!user) {
      setImages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load images:', error);
        return;
      }

      const formattedImages: SecureImage[] = data.map(img => ({
        id: img.id,
        url: img.public_url,
        prompt: img.prompt,
        settings: img.settings,
        created_at: img.created_at,
      }));

      setImages(formattedImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return;

    try {
      setLoading(true);

      // First get the image record to find the storage path
      const { data: imageData, error: fetchError } = await supabase
        .from('generated_images')
        .select('storage_path')
        .eq('id', imageId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !imageData) {
        throw new Error('Image not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('generated-images')
        .remove([imageData.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (dbError) {
        throw new Error(`Failed to delete image: ${dbError.message}`);
      }

      // Refresh the images list
      await loadImages();
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [user]);

  return {
    images,
    saveImages,
    deleteImage,
    loading,
  };
};
