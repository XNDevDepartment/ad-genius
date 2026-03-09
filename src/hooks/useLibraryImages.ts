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
  source_type?: 'ugc' | 'outfit_swap' | 'photoshoot' | 'ecommerce' | 'bulk_background' | 'product_views';
  photoshoot_id?: string;
  angle_type?: 'front' | 'three_quarter' | 'back' | 'side';
  style_prompt?: string;
  original_result_id?: string;
  meta?: any;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  filter?: 'all' | 'ugc' | 'outfit_swap' | 'bulk_background';
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
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          setLoading(false);
          return;
        }
      }
      
      if (!session) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          setLoading(false);
          return;
        }
      }

      const offset = (pageNumber - 1) * limit;
      console.log('[useLibraryImages] Fetching images:', { pageNumber, offset, limit, filter });

      // Only query tables relevant to the active filter
      let ugcResult = { data: null as any[] | null, error: null as any };
      let outfitSwapResult = { data: null as any[] | null, error: null as any };
      let photoshootResult = { data: null as any[] | null, error: null as any };
      let ecommerceResult = { data: null as any[] | null, error: null as any };
      let bulkBgResult = { data: null as any[] | null, error: null as any };
      let productViewsResult = { data: null as any[] | null, error: null as any };

      if (filter === 'ugc') {
        // Only UGC — pagination is accurate
        ugcResult = await supabase
          .from('ugc_images')
          .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
      } else if (filter === 'outfit_swap') {
        // Only outfit swap related tables
        const [osRes, psRes, ecRes] = await Promise.all([
          supabase
            .from('outfit_swap_results')
            .select('*, outfit_swap_jobs(settings, metadata)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('outfit_swap_photoshoots')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('outfit_swap_ecommerce_photos')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
        ]);
        outfitSwapResult = osRes;
        photoshootResult = psRes;
        ecommerceResult = ecRes;
      } else if (filter === 'bulk_background') {
        // Bulk background + product views — pagination is accurate
        const [bgRes, pvRes] = await Promise.all([
          supabase
            .from('bulk_background_results')
            .select('*, bulk_background_jobs!inner(user_id)')
            .eq('bulk_background_jobs.user_id', user.id)
            .eq('status', 'completed')
            .not('result_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('bulk_background_product_views')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
        ]);
        bulkBgResult = bgRes;
        productViewsResult = pvRes;
      } else {
        // "all" — query all tables with the same range (approximate pagination)
        const [ugcRes, osRes, psRes, ecRes, bgRes, pvRes] = await Promise.all([
          supabase
            .from('ugc_images')
            .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('outfit_swap_results')
            .select('*, outfit_swap_jobs(settings, metadata)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('outfit_swap_photoshoots')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('outfit_swap_ecommerce_photos')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('bulk_background_results')
            .select('*, bulk_background_jobs!inner(user_id)')
            .eq('bulk_background_jobs.user_id', user.id)
            .eq('status', 'completed')
            .not('result_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          supabase
            .from('bulk_background_product_views')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
        ]);
        ugcResult = ugcRes;
        outfitSwapResult = osRes;
        photoshootResult = psRes;
        ecommerceResult = ecRes;
        bulkBgResult = bgRes;
        productViewsResult = pvRes;
      }

      // Check for errors
      if (ugcResult.error) throw ugcResult.error;
      if (outfitSwapResult.error) throw outfitSwapResult.error;
      if (photoshootResult.error) throw photoshootResult.error;
      if (ecommerceResult.error) throw ecommerceResult.error;
      if (bulkBgResult.error) throw bulkBgResult.error;
      if (productViewsResult.error) throw productViewsResult.error;

      // Normalize UGC images
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
          source_type: 'ugc' as const,
          meta: img.meta as any
        };
      });

      // Normalize outfit swap images
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
          source_type: 'outfit_swap' as const
        };
      });

      // Normalize photoshoot images
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
              settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
              source_type: 'photoshoot',
              photoshoot_id: photoshoot.id,
              angle_type: angle as any,
              original_result_id: photoshoot.result_id
            });
          }
        });
        return images;
      });

      // Normalize e-commerce photos
      const ecommerceImages: LibraryImage[] = (ecommerceResult.data || []).map((photo: any) => ({
        id: photo.id,
        url: photo.public_url,
        prompt: photo.prompt_used || 'E-commerce Photo',
        created_at: photo.created_at,
        settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
        source_type: 'ecommerce' as const,
        style_prompt: photo.prompt_used,
        original_result_id: photo.result_id
      }));

      // Normalize bulk background images
      const bulkBgImages: LibraryImage[] = (bulkBgResult.data || []).map((result: any) => ({
        id: result.id,
        url: result.result_url,
        prompt: 'Bulk Background',
        created_at: result.created_at,
        settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
        source_type: 'bulk_background' as const,
        source_image_id: result.source_image_id
      }));

      // Normalize product views images
      const productViewsImages: LibraryImage[] = (productViewsResult.data || []).flatMap((pv: any) => {
        const views: LibraryImage[] = [];
        const viewTypes = [
          { key: 'macro', label: 'Product View - Macro' },
          { key: 'environment', label: 'Product View - Environment' },
          { key: 'angle', label: 'Product View - 3/4 Angle' },
        ];
        for (const vt of viewTypes) {
          const url = pv[`${vt.key}_url`];
          if (url) {
            views.push({
              id: `${pv.id}_${vt.key}`,
              url,
              prompt: vt.label,
              created_at: pv.created_at,
              settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'webp' },
              source_type: 'product_views' as const,
              original_result_id: pv.result_id
            });
          }
        }
        return views;
      });

      // Combine and sort by creation date
      const processedImages = [
        ...ugcImages, 
        ...outfitSwapImages, 
        ...photoshootImages, 
        ...ecommerceImages,
        ...bulkBgImages,
        ...productViewsImages
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('[useLibraryImages] Processed images:', { 
        ugc: ugcImages.length, 
        outfitSwap: outfitSwapImages.length,
        photoshoot: photoshootImages.length,
        ecommerce: ecommerceImages.length,
        bulkBg: bulkBgImages.length,
        productViews: productViewsImages.length,
        total: processedImages.length 
      });

      // Estimate hasMore
      const currentCount = processedImages.length;
      setHasMore(currentCount >= limit);

      // Get source image signed URLs for thumbnail overlays
      const sourceImageIds = Array.from(new Set(
        processedImages.flatMap(img => {
          const ids: string[] = [];
          if (img.source_image_id) ids.push(img.source_image_id);
          if (img.source_image_ids && Array.isArray(img.source_image_ids) && img.source_image_ids.length > 0) {
            ids.push(img.source_image_ids[0]);
          }
          return ids;
        })
      )).filter(Boolean) as string[];

      if (sourceImageIds.length > 0) {
        const { data: sourceImages } = await supabase
          .from('source_images')
          .select('id, storage_path, public_url')
          .in('id', sourceImageIds);

        if (sourceImages && sourceImages.length > 0) {
          const sourceUrlResults = await Promise.allSettled(
            sourceImages.map(async (sourceImg) => {
              const bucket = sourceImg.public_url?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';
              const { data } = await supabase.storage
                .from(bucket)
                .createSignedUrl(sourceImg.storage_path, 3600);
              return { id: sourceImg.id, signedUrl: data?.signedUrl || null };
            })
          );

          const sourceUrlMap = new Map<string, string>();
          sourceUrlResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.signedUrl) {
              sourceUrlMap.set(result.value.id, result.value.signedUrl);
            }
          });

          processedImages.forEach(img => {
            if (img.source_image_id && sourceUrlMap.has(img.source_image_id)) {
              img.sourceSignedUrl = sourceUrlMap.get(img.source_image_id);
            } else if (img.source_image_ids && Array.isArray(img.source_image_ids) && img.source_image_ids.length > 0) {
              const firstSourceId = img.source_image_ids[0];
              if (sourceUrlMap.has(firstSourceId)) {
                img.sourceSignedUrl = sourceUrlMap.get(firstSourceId);
              }
            }
          });
        }
      }

      if (shouldAppend) {
        setImages(prev => [...prev, ...processedImages]);
      } else {
        setImages(processedImages);
      }
    } catch (err) {
      console.error('[useLibraryImages] Failed to fetch library images:', err);
      
      const errorCode = (err as any)?.code;
      const errorMessage = err instanceof Error ? err.message : '';
      
      if (errorCode === 'PGRST301' || errorMessage.includes('session') || errorMessage.includes('JWT')) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          localStorage.clear();
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
        } else {
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
      const isPhotoshootImage = imageId.includes('_front') || imageId.includes('_back') || 
                                 imageId.includes('_side') || imageId.includes('_three_quarter');
      
      let deleteResults;
      
      if (isPhotoshootImage) {
        const photoshootId = imageId.split('_').slice(0, -1).join('_');
        deleteResults = await Promise.all([
          supabase.from('outfit_swap_photoshoots').delete().eq('id', photoshootId).eq('user_id', user.id)
        ]);
      } else {
        deleteResults = await Promise.all([
          supabase.from('ugc_images').delete().eq('id', imageId).eq('user_id', user.id),
          supabase.from('outfit_swap_results').delete().eq('id', imageId).eq('user_id', user.id),
          supabase.from('outfit_swap_ecommerce_photos').delete().eq('id', imageId).eq('user_id', user.id),
          supabase.from('bulk_background_results').delete().eq('id', imageId).eq('user_id', user.id)
        ]);
      }

      const anySuccess = deleteResults.some(result => !result.error);
      if (!anySuccess) {
        const errorMsg = deleteResults.find(r => r.error)?.error?.message || 'Unknown error';
        throw new Error(`Failed to delete image: ${errorMsg}`);
      }

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

  // Bulk delete images
  const deleteImages = async (imageIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    const imagesToDelete = images.filter(img => imageIds.includes(img.id));
    
    const batchSize = 5;
    for (let i = 0; i < imagesToDelete.length; i += batchSize) {
      const batch = imagesToDelete.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(img => deleteImage(img.id))
      );
      
      results.forEach(result => {
        if (result.status === 'fulfilled') success++;
        else failed++;
      });
    }

    return { success, failed };
  };

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
    deleteImage,
    deleteImages
  };
};
