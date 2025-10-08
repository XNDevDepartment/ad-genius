import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UgcImage {
  id: string;
  signedUrl: string;
  fileName: string;
  createdAt: string;
  storage_path: string;
  prompt: string;
}

export const useUgcImages = () => {
  const [ugcImages, setUgcImages] = useState<UgcImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUgcImages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch UGC images from database
      const { data: images, error: dbError } = await supabase
        .from('ugc_images')
        .select('id, prompt, created_at, storage_path, public_url, meta')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // For UGC images, we can use public_url directly since the bucket is public
      // But we'll still create signed URLs for consistency
      const imagesWithUrls: UgcImage[] = await Promise.all(
        (images || []).map(async (image) => {
          // Try to get signed URL, fallback to public URL
          const { data: signedUrlData } = await supabase.storage
            .from('ugc')
            .createSignedUrl(image.storage_path, 3600); // 1 hour expiry

          const url = signedUrlData?.signedUrl || image.public_url;
          
          // Extract filename from storage_path or meta
          const metaData = image.meta as any;
          const fileName = image.storage_path.split('/').pop() || 
                          (metaData && typeof metaData === 'object' && metaData.fileName) || 
                          'Generated Image';
          
          const metaPrompt = metaData && typeof metaData === 'object' && metaData.prompt;

          return {
            id: image.id,
            signedUrl: url,
            fileName: String(fileName),
            createdAt: image.created_at,
            storage_path: image.storage_path,
            prompt: image.prompt || metaPrompt || 'No prompt',
          } as UgcImage;
        })
      ).then(list => list.filter(img => img.signedUrl) as UgcImage[]);

      setUgcImages(imagesWithUrls);
    } catch (err) {
      console.error('Error fetching UGC images:', err);
      setError('Failed to load generated images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUgcImages();
  }, [user]);

  return {
    ugcImages,
    loading,
    error,
    refetch: fetchUgcImages,
  };
};
