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
  job_id?: string;
  desiredAudience?: string;
  prodSpecs?: string;
  source_image_ids?: string[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export const useLibraryImages = (options: PaginationOptions = {}) => {
  const { page = 1, limit = 20 } = options;
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  const fetchImages = async (pageNumber = page, shouldAppend = false) => {
    console.log('[useLibraryImages] Fetch started', { user: user?.id, pageNumber, shouldAppend });
    
    if (!user) {
      console.log('[useLibraryImages] No user found, clearing images');
      setImages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify session token before making queries
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[useLibraryImages] Session error:', sessionError);
        setError('Session error: ' + sessionError.message);
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.error('[useLibraryImages] No active session found');
        setError('No active session. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('[useLibraryImages] Session verified, fetching images for user:', user.id);

      const offset = (pageNumber - 1) * limit;

      // Fetch from both tables separately with pagination for better performance
      // Also join with image_jobs to get desiredAudience and ProdSpces and source_image_ids
      const [ugcResult, generatedResult] = await Promise.all([
        supabase
          .from('ugc_images')
          .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),

        supabase
          .from('generated_images')
          .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      console.log('[useLibraryImages] Query results:', { 
        ugcCount: ugcResult.data?.length || 0, 
        generatedCount: generatedResult.data?.length || 0,
        ugcError: ugcResult.error,
        generatedError: generatedResult.error
      });

      if (ugcResult.error) {
        console.error('[useLibraryImages] UGC images query error:', ugcResult.error);
        throw ugcResult.error;
      }
      if (generatedResult.error) {
        console.error('[useLibraryImages] Generated images query error:', generatedResult.error);
        throw generatedResult.error;
      }

      // Normalize both data sources to LibraryImage format
      const ugcImages: LibraryImage[] = (ugcResult.data || []).map(img => {
        const jobData = Array.isArray(img.image_jobs) ? img.image_jobs[0] : img.image_jobs;
        return {
          id: img.id,
          url: img.public_url,
          prompt: (img.meta as any)?.prompt || 'UGC Image',
          created_at: img.created_at,
          settings: jobData?.settings || {
            size: (img.meta as any)?.size || '1024x1024',
            quality: (img.meta as any)?.quality || 'high',
            numberOfImages: 1,
            format: (img.meta as any)?.format || 'png'
          },
          source_image_id: img.source_image_id,
          job_id: img.job_id,
          desiredAudience: jobData?.desiredAudience,
          prodSpecs: jobData?.prodSpecs,
          source_image_ids: jobData?.source_image_ids
        };
      });

      const generatedImages: LibraryImage[] = (generatedResult.data || []).map(img => {
        const jobData = Array.isArray(img.image_jobs) ? img.image_jobs[0] : img.image_jobs;
        return {
          id: img.id,
          url: img.public_url,
          prompt: img.prompt,
          created_at: img.created_at,
          settings: jobData?.settings || {
            size: (img.settings as any)?.size || '1024x1024',
            quality: (img.settings as any)?.quality || 'high',
            numberOfImages: (img.settings as any)?.number || 1,
            format: (img.settings as any)?.output_format || 'webp'
          },
          source_image_id: img.source_image_id || undefined,
          job_id: img.job_id,
          desiredAudience: jobData?.desiredAudience,
          prodSpecs: jobData?.prodSpecs,
          source_image_ids: jobData?.source_image_ids
        };
      });

      // Combine and sort by creation date
      const processedImages = [...ugcImages, ...generatedImages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('[useLibraryImages] Processed images:', processedImages.length);

      // Estimate total count and hasMore status
      const currentCount = ugcImages.length + generatedImages.length;
      setHasMore(currentCount === limit);

      // Get source image signed URLs for thumbnail overlays (batch optimized)
      const sourceImageIds = processedImages
        .map(img => img.source_image_id)
        .filter(Boolean) as string[];

      if (sourceImageIds.length > 0) {
        // Batch fetch source images with signed URLs
        const { data: sourceImages } = await supabase
          .from('source_images')
          .select('id, storage_path')
          .in('id', sourceImageIds);

        if (sourceImages && sourceImages.length > 0) {
          // Create signed URLs in parallel with better error handling
          const sourceUrlResults = await Promise.allSettled(
            sourceImages.map(async (sourceImg) => {
              const { data } = await supabase.storage
                .from('ugc-inputs')
                .createSignedUrl(sourceImg.storage_path, 3600);
              return {
                id: sourceImg.id,
                signedUrl: data?.signedUrl || null
              };
            })
          );

          const sourceUrlMap = new Map<string, string>();
          sourceUrlResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.signedUrl) {
              sourceUrlMap.set(result.value.id, result.value.signedUrl);
            }
          });

          // Add source signed URLs to images
          processedImages.forEach(img => {
            if (img.source_image_id && sourceUrlMap.has(img.source_image_id)) {
              img.sourceSignedUrl = sourceUrlMap.get(img.source_image_id);
            }
          });
        }
      }

      // Append or replace images based on pagination
      if (shouldAppend) {
        setImages(prev => [...prev, ...processedImages]);
      } else {
        setImages(processedImages);
      }
    } catch (err) {
      console.error('[useLibraryImages] Failed to fetch library images:', err);
      console.error('[useLibraryImages] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        code: (err as any)?.code,
        details: (err as any)?.details,
        hint: (err as any)?.hint
      });
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
      await fetchImages(1, false);
    } catch (err) {
      console.error('Failed to delete image:', err);
      throw err;
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchImages(nextPage, true);
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchImages(1, false);
  }, [user, limit]);

  return {
    images,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    refetch: () => {
      setCurrentPage(1);
      fetchImages(1, false);
    },
    deleteImage
  };
};