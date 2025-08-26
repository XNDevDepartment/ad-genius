
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureImage {
  id: string;
  url: string;
  prompt: string;
  settings: any;
  created_at: string;
  source_image_id?: string;
  sourceSignedUrl?: string;
  job_id?: string;
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

      console.log('Submitting image generation request:', {
        prompt: imageData.prompt.substring(0, 50) + '...',
        imageCount: imageData.base64Images.length,
        settings: enhancedSettings
      });

      // Use Supabase storage upload edge function (now with job system)
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

      console.log('Image generation completed successfully:', data);

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
      console.log('Loading images for user:', user.id);
      
      // Load generated images with job information
      const { data, error } = await supabase
        .from('generated_images')
        .select('*, source_image_id, job_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load images:', error);
        return;
      }

      console.log(`Loaded ${data?.length || 0} images from database`);

      // Get unique source image IDs
      const sourceImageIds = [...new Set(data.filter(img => img.source_image_id).map(img => img.source_image_id))];
      
      let sourceImages: any[] = [];
      if (sourceImageIds.length > 0) {
        const { data: sourceData, error: sourceError } = await supabase
          .from('source_images')
          .select('id, storage_path')
          .eq('user_id', user.id)
          .in('id', sourceImageIds);

        if (!sourceError && sourceData) {
          console.log(`Found ${sourceData.length} source images`);
          // Generate signed URLs for source images
          const sourceImagesWithUrls = await Promise.all(
            sourceData.map(async (source) => {
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from('ugc-inputs')
                .createSignedUrl(source.storage_path, 86400); // 24 hours

              return {
                id: source.id,
                signedUrl: urlError ? null : signedUrlData?.signedUrl
              };
            })
          );
          sourceImages = sourceImagesWithUrls;
        }
      }

      const formattedImages: SecureImage[] = data.map(img => {
        const sourceImage = sourceImages.find(src => src.id === img.source_image_id);
        return {
          id: img.id,
          url: img.public_url,
          prompt: img.prompt,
          settings: img.settings,
          created_at: img.created_at,
          source_image_id: img.source_image_id,
          sourceSignedUrl: sourceImage?.signedUrl || undefined,
          job_id: img.job_id,
        };
      });

      setImages(formattedImages);
      console.log(`Successfully formatted ${formattedImages.length} images`);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return;

    try {
      setLoading(true);

      console.log('Deleting image:', imageId);

      // First get the image details to get the storage path
      const { data: imageData, error: fetchError } = await supabase
        .from('generated_images')
        .select('storage_path, job_id')
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

      console.log('Image deleted successfully:', imageId);

      // Check if this was the last image for a job, and if so, clean up the job
      if (imageData?.job_id) {
        const { data: remainingImages } = await supabase
          .from('generated_images')
          .select('id')
          .eq('job_id', imageData.job_id);

        if (!remainingImages || remainingImages.length === 0) {
          console.log('No remaining images for job, cleaning up job:', imageData.job_id);
          await supabase
            .from('image_jobs')
            .delete()
            .eq('id', imageData.job_id)
            .eq('user_id', user.id);
        }
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
    if (user) {
      loadImages();
    }
  }, [user]);

  return {
    images,
    saveImages,
    deleteImage,
    loading,
  };
};
