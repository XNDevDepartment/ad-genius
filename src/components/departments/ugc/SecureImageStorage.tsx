
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

      // Use Hetzner upload edge function
      const { data, error } = await supabase.functions.invoke('hetzner-upload', {
        body: {
          base64Images: imageData.base64Images,
          prompt: imageData.prompt,
          settings: imageData.settings,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Hetzner upload error:', error);
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

      // Delete from database only (Hetzner deletion would require additional edge function)
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
