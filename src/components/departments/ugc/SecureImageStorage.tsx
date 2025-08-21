
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
    source_image_id?: string;
  }) => {
    if (!user) return [];

    try {
      setLoading(true);

      // Ensure settings include quality (defaulting to high if not specified)
      const enhancedSettings = {
        ...imageData.settings,
        quality: imageData.settings.quality || 'high'
      };

      // Use Supabase storage upload edge function
      const { data, error } = await supabase.functions.invoke('supabase-upload', {
        body: {
          base64Images: imageData.base64Images,
          prompt: imageData.prompt,
          settings: enhancedSettings,
          user_id: user.id,
          source_image_id: imageData.source_image_id
        }
      });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload images: ${error.message}`);
      }

      // Refresh the images list
      await loadImages();
      return data.savedImages;
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

      // First get the image details to get the storage path
      const { data: imageData, error: fetchError } = await supabase
        .from('generated_images')
        .select('storage_path')
        .eq('id', imageId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch image details: ${fetchError.message}`);
      }

      // Delete from Supabase storage
      if (imageData?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('generated-images')
          .remove([imageData.storage_path]);

        if (storageError) {
          console.warn('Failed to delete from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
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
