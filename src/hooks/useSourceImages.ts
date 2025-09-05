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

      // Define the DB row type for clarity
      type DBSourceImageRow = {
        id: string;
        file_name: string;
        created_at: string;
        storage_path: string;
        public_url: string;
        file_size: number | null;
        mime_type: string | null;
      };

      // Fetch source images from database (include fields helpful for dedup)
      const { data: images, error: dbError } = await supabase
        .from('source_images')
        .select('id, file_name, created_at, storage_path, public_url, file_size, mime_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Build a robust deduplication key:
      // 1) Prefer public_url if identical
      // 2) Fallback to storage_path
      // 3) Fallback to combo of file_name + file_size + mime_type
      const buildKey = (img: DBSourceImageRow) =>
        img.public_url || `${img.storage_path}` || `${img.file_name}::${img.file_size || ''}::${img.mime_type || ''}`;

      const map = new Map<string, DBSourceImageRow>();
      for (const current of (images || []) as DBSourceImageRow[]) {
        const key = buildKey(current);
        const existing = map.get(key);
        if (!existing || new Date(current.created_at) > new Date(existing.created_at)) {
          map.set(key, current);
        }
      }
      const uniqueImages = Array.from(map.values());

      // Create signed URLs for each unique image (in parallel)
      const imagesWithSignedUrls: SourceImage[] = await Promise.all(
        uniqueImages.map(async (image) => {
          const { data: signedUrlData } = await supabase.storage
            .from('ugc-inputs')
            .createSignedUrl(image.storage_path, 3600); // 1 hour expiry

          if (!signedUrlData?.signedUrl) return null;
          return {
            id: image.id,
            signedUrl: signedUrlData.signedUrl,
            fileName: image.file_name,
            createdAt: image.created_at,
            storage_path: image.storage_path,
          } as SourceImage;
        })
      ).then(list => list.filter(Boolean) as SourceImage[]);

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