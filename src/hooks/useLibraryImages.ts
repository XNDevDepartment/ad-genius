import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LibraryImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  settings: {
    size: string;
    quality: string;
    numberOfImages: number;
    format: string;
  };
  source_image_id?: string;
  sourceSignedUrl?: string;
}

export const useLibraryImages = () => {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchImages = async () => {
    if (!user) {
      setImages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from both ugc_images and generated_images tables
      const [ugcResult, generatedResult] = await Promise.all([
        supabase
          .from('ugc_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('generated_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (ugcResult.error) throw ugcResult.error;
      if (generatedResult.error) throw generatedResult.error;

      // Normalize both data sources to LibraryImage format
      const ugcImages: LibraryImage[] = (ugcResult.data || []).map(img => ({
        id: img.id,
        url: img.public_url,
        prompt: (img.meta as any)?.prompt || 'UGC Image',
        created_at: img.created_at,
        settings: {
          size: (img.meta as any)?.size || '1024x1024',
          quality: (img.meta as any)?.quality || 'standard',
          numberOfImages: 1,
          format: 'png'
        },
        source_image_id: img.source_image_id
      }));

      const generatedImages: LibraryImage[] = (generatedResult.data || []).map(img => ({
        id: img.id,
        url: img.public_url,
        prompt: img.prompt,
        created_at: img.created_at,
        settings: {
          size: (img.settings as any)?.size || '1024x1024',
          quality: (img.settings as any)?.quality || 'standard',
          numberOfImages: (img.settings as any)?.number || 1,
          format: (img.settings as any)?.output_format || 'png'
        },
        source_image_id: img.source_image_id || undefined
      }));

      // Combine and sort by creation date
      const allImages = [...ugcImages, ...generatedImages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Get source image signed URLs for thumbnail overlays
      const sourceImageIds = allImages
        .map(img => img.source_image_id)
        .filter(Boolean) as string[];

      if (sourceImageIds.length > 0) {
        // Fetch source images data
        const { data: sourceImages } = await supabase
          .from('source_images')
          .select('id, storage_path')
          .in('id', sourceImageIds);

        if (sourceImages && sourceImages.length > 0) {
          // Create signed URLs for source images
          const sourceUrlPromises = sourceImages.map(async (sourceImg) => {
            const { data } = await supabase.storage
              .from('ugc-inputs')
              .createSignedUrl(sourceImg.storage_path, 3600);
            return {
              id: sourceImg.id,
              signedUrl: data?.signedUrl || null
            };
          });

          const sourceUrls = await Promise.all(sourceUrlPromises);
          const sourceUrlMap = Object.fromEntries(
            sourceUrls.map(item => [item.id, item.signedUrl])
          );

          // Add source signed URLs to images
          allImages.forEach(img => {
            if (img.source_image_id && sourceUrlMap[img.source_image_id]) {
              img.sourceSignedUrl = sourceUrlMap[img.source_image_id];
            }
          });
        }
      }

      setImages(allImages);
    } catch (err) {
      console.error('Failed to fetch library images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return;

    try {
      // Try deleting from both tables since we don't know which one it's from
      const [ugcResult, generatedResult] = await Promise.all([
        supabase.from('ugc_images').delete().eq('id', imageId).eq('user_id', user.id),
        supabase.from('generated_images').delete().eq('id', imageId).eq('user_id', user.id)
      ]);

      // Refresh the images list
      await fetchImages();
      
      return true;
    } catch (err) {
      console.error('Failed to delete image:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchImages();
  }, [user]);

  return {
    images,
    loading,
    error,
    refetch: fetchImages,
    deleteImage
  };
};