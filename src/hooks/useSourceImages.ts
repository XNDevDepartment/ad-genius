import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SourceImage {
  id: string;
  signedUrl: string;
  fileName: string;
  createdAt: string;
  storage_path: string;
}

export const useSourceImages = () => {
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSourceImages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch source images from database
      const { data: images, error: dbError } = await supabase
        .from('source_images')
        .select('id, file_name, created_at, storage_path')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Create signed URLs for each image
      const imagesWithSignedUrls: SourceImage[] = [];
      
      for (const image of images || []) {
        const { data: signedUrlData } = await supabase.storage
          .from('ugc-inputs')
          .createSignedUrl(image.storage_path, 3600); // 1 hour expiry

        if (signedUrlData?.signedUrl) {
          imagesWithSignedUrls.push({
            id: image.id,
            signedUrl: signedUrlData.signedUrl,
            fileName: image.file_name,
            createdAt: image.created_at,
            storage_path: image.storage_path,
          });
        }
      }

      setSourceImages(imagesWithSignedUrls);
    } catch (err) {
      console.error('Error fetching source images:', err);
      setError('Failed to load source images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourceImages();
  }, [user]);

  return {
    sourceImages,
    loading,
    error,
    refetch: fetchSourceImages,
  };
};