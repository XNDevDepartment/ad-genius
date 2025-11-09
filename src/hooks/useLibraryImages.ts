import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LibraryImage {
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
  source_type?: 'ugc' | 'outfit_swap' | 'photoshoot' | 'ecommerce';
  photoshoot_id?: string;
  angle_type?: 'front' | 'three_quarter' | 'back' | 'side';
  style_prompt?: string;
  original_result_id?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  filter?: 'all' | 'ugc' | 'outfit_swap';
}

export const useLibraryImages = (options: PaginationOptions = {}) => {
  const { page = 1, limit = 20, filter = 'all' } = options;
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
        
        // Try to refresh the session once
        console.log('[useLibraryImages] Attempting to refresh session...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('[useLibraryImages] Session refresh failed, forcing logout');
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log('[useLibraryImages] Session refreshed successfully');
      }
      
      if (!session) {
        console.error('[useLibraryImages] No active session found');
        
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('[useLibraryImages] No valid session, forcing logout');
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log('[useLibraryImages] Session recovered after refresh');
      }

      console.log('[useLibraryImages] Session verified, fetching images for user:', user.id);

      const offset = (pageNumber - 1) * limit;
      console.log('[useLibraryImages] Fetching images:', { pageNumber, offset, limit, filter });

      // Conditionally fetch based on filter
      let ugcResult = { data: null, error: null };
      let outfitSwapResult = { data: null, error: null };
      let photoshootResult = { data: null, error: null };
      let ecommerceResult = { data: null, error: null };

      if (filter === 'all' || filter === 'ugc') {
        ugcResult = await supabase
          .from('ugc_images')
          .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
      }

      if (filter === 'all' || filter === 'outfit_swap') {
        outfitSwapResult = await supabase
          .from('outfit_swap_results')
          .select('*, outfit_swap_jobs(settings, metadata)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        photoshootResult = await supabase
          .from('outfit_swap_photoshoots')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        ecommerceResult = await supabase
          .from('outfit_swap_ecommerce_photos')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
      }

      console.log('[useLibraryImages] Query results:', { 
        ugcCount: ugcResult.data?.length || 0, 
        outfitSwapCount: outfitSwapResult.data?.length || 0,
        photoshootCount: photoshootResult.data?.length || 0,
        ecommerceCount: ecommerceResult.data?.length || 0,
        ugcError: ugcResult.error,
        outfitSwapError: outfitSwapResult.error,
        photoshootError: photoshootResult.error,
        ecommerceError: ecommerceResult.error
      });

      if (ugcResult.error) {
        console.error('[useLibraryImages] UGC images query error:', ugcResult.error);
        throw ugcResult.error;
      }
      if (outfitSwapResult.error) {
        console.error('[useLibraryImages] Outfit swap results query error:', outfitSwapResult.error);
        throw outfitSwapResult.error;
      }
      if (photoshootResult.error) {
        console.error('[useLibraryImages] Photoshoot query error:', photoshootResult.error);
        throw photoshootResult.error;
      }
      if (ecommerceResult.error) {
        console.error('[useLibraryImages] E-commerce query error:', ecommerceResult.error);
        throw ecommerceResult.error;
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
          source_image_ids: jobData?.source_image_ids,
          source_type: 'ugc'
        };
      });

      const outfitSwapImages: LibraryImage[] = (outfitSwapResult.data || []).map((result: any) => {
        const jobData = result.outfit_swap_jobs;
        return {
          id: result.id,
          url: result.public_url || result.jpg_url,
          prompt: 'Outfit Swap Result',
          created_at: result.created_at,
          settings: {
            size: '1024x1024',
            quality: 'high',
            numberOfImages: 1,
            format: 'jpg',
            ...jobData?.settings
          },
          job_id: result.job_id,
          source_type: 'outfit_swap'
        };
      });

      // Process photoshoot images
      const photoshootImages: LibraryImage[] = (photoshootResult.data || []).flatMap((photoshoot: any) => {
        const images: LibraryImage[] = [];
        const selectedAngles = photoshoot.selected_angles || ['front', 'three_quarter', 'back', 'side'];
        
        selectedAngles.forEach((angle: string, index: number) => {
          const imageUrl = photoshoot[`image_${index + 1}_url`];
          
          if (imageUrl) {
            images.push({
              id: `${photoshoot.id}_${angle}`,
              url: imageUrl,
              prompt: `Photoshoot - ${angle.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} View`,
              created_at: photoshoot.created_at,
              settings: {
                size: '1024x1024',
                quality: 'high',
                numberOfImages: 1,
                format: 'png'
              },
              source_type: 'photoshoot',
              photoshoot_id: photoshoot.id,
              angle_type: angle as any,
              original_result_id: photoshoot.result_id
            });
          }
        });
        
        return images;
      });

      // Process e-commerce photos
      const ecommerceImages: LibraryImage[] = (ecommerceResult.data || []).map((photo: any) => ({
        id: photo.id,
        url: photo.public_url,
        prompt: photo.prompt_used || 'E-commerce Photo',
        created_at: photo.created_at,
        settings: {
          size: '1024x1024',
          quality: 'high',
          numberOfImages: 1,
          format: 'png'
        },
        source_type: 'ecommerce',
        style_prompt: photo.prompt_used,
        original_result_id: photo.result_id
      }));

      // Combine and sort by creation date
      const processedImages = [
        ...ugcImages, 
        ...outfitSwapImages, 
        ...photoshootImages, 
        ...ecommerceImages
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('[useLibraryImages] Processed images:', { 
        ugc: ugcImages.length, 
        outfitSwap: outfitSwapImages.length,
        photoshoot: photoshootImages.length,
        ecommerce: ecommerceImages.length,
        total: processedImages.length 
      });

      // Estimate total count and hasMore status
      const currentCount = ugcImages.length + outfitSwapImages.length + photoshootImages.length + ecommerceImages.length;
      setHasMore(currentCount >= limit);

      // Get source image signed URLs for thumbnail overlays (batch optimized)
      // Support both singular source_image_id and array source_image_ids
      const sourceImageIds = Array.from(new Set(
        processedImages.flatMap(img => {
          const ids: string[] = [];
          // Add singular source_image_id if exists
          if (img.source_image_id) {
            ids.push(img.source_image_id);
          }
          // Add first item from source_image_ids array if exists
          if (img.source_image_ids && Array.isArray(img.source_image_ids) && img.source_image_ids.length > 0) {
            ids.push(img.source_image_ids[0]);
          }
          return ids;
        })
      )).filter(Boolean) as string[];

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
            // Try singular source_image_id first
            if (img.source_image_id && sourceUrlMap.has(img.source_image_id)) {
              img.sourceSignedUrl = sourceUrlMap.get(img.source_image_id);
            }
            // Fall back to first item in source_image_ids array
            else if (img.source_image_ids && Array.isArray(img.source_image_ids) && img.source_image_ids.length > 0) {
              const firstSourceId = img.source_image_ids[0];
              if (sourceUrlMap.has(firstSourceId)) {
                img.sourceSignedUrl = sourceUrlMap.get(firstSourceId);
              }
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
      
      // Check if it's a session/auth error (403 or session-related)
      const errorCode = (err as any)?.code;
      const errorMessage = err instanceof Error ? err.message : '';
      
      if (errorCode === 'PGRST301' || errorMessage.includes('session') || errorMessage.includes('JWT')) {
        console.error('[useLibraryImages] Auth error detected, attempting recovery...');
        
        // Try to refresh session once
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[useLibraryImages] Session refresh failed during error recovery');
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
        } else {
          console.log('[useLibraryImages] Session refreshed during error recovery, retrying...');
          // Retry the fetch after successful refresh
          setTimeout(() => fetchImages(pageNumber, shouldAppend), 100);
          return;
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load images');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return;

    try {
      console.log('[useLibraryImages] Attempting to delete image:', imageId);
      
      // Check if it's a composite ID for photoshoot images (format: "photoshoot_id_angle")
      const isPhotoshootImage = imageId.includes('_front') || imageId.includes('_back') || 
                                 imageId.includes('_side') || imageId.includes('_three_quarter');
      
      let deleteResults;
      
      if (isPhotoshootImage) {
        // Extract photoshoot ID from composite ID (remove the angle suffix)
        const photoshootId = imageId.split('_').slice(0, -1).join('_');
        
        // Delete entire photoshoot (deleting individual angles isn't supported)
        deleteResults = await Promise.all([
          supabase.from('outfit_swap_photoshoots').delete().eq('id', photoshootId).eq('user_id', user.id)
        ]);
      } else {
        // Try deleting from all possible tables
        deleteResults = await Promise.all([
          supabase.from('ugc_images').delete().eq('id', imageId).eq('user_id', user.id),
          supabase.from('outfit_swap_results').delete().eq('id', imageId).eq('user_id', user.id),
          supabase.from('outfit_swap_ecommerce_photos').delete().eq('id', imageId).eq('user_id', user.id)
        ]);
      }

      console.log('[useLibraryImages] Delete results:', deleteResults.map(r => ({ error: r.error })));

      // Check if any deletion succeeded
      const anySuccess = deleteResults.some(result => !result.error);
      
      if (!anySuccess) {
        const errorMsg = deleteResults.find(r => r.error)?.error?.message || 'Unknown error';
        console.error('[useLibraryImages] All delete operations failed');
        throw new Error(`Failed to delete image: ${errorMsg}`);
      }

      console.log('[useLibraryImages] Image deleted successfully, refreshing list');
      
      // Refresh the images list
      await fetchImages(1, false);
    } catch (err) {
      console.error('[useLibraryImages] Failed to delete image:', err);
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
  }, [user, limit, filter]);

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