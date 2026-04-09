import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LibraryImage } from './useLibraryImages';

export interface SourceCatalogEntry {
  id: string;
  signedUrl: string;
  fileName: string;
  createdAt: string;
  storage_path: string;
  publicUrl: string;
  generatedCount: number;
}

const detectBucket = (publicUrl: string): string =>
  publicUrl?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';

const buildDedupKey = (img: { public_url: string; storage_path: string; file_name: string; file_size: number | null; mime_type: string | null }) =>
  img.public_url || img.storage_path || `${img.file_name}::${img.file_size ?? ''}::${img.mime_type ?? ''}`;

export const useLibraryBySource = () => {
  const { user } = useAuth();

  const [catalogEntries, setCatalogEntries] = useState<SourceCatalogEntry[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedSourceId, setSelectedSourceId] = useState<string | null | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState<SourceCatalogEntry | null>(null);
  const [detailImages, setDetailImages] = useState<LibraryImage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Level 1: load catalog ───────────────────────────────────────────────

  const fetchCatalog = useCallback(async () => {
    if (!user) {
      setCatalogEntries([]);
      setCatalogLoading(false);
      return;
    }

    try {
      setCatalogLoading(true);
      setCatalogError(null);

      // 1. Fetch all source images
      const { data: sourceRows, error: srcErr } = await supabase
        .from('source_images')
        .select('id, file_name, created_at, storage_path, public_url, file_size, mime_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (srcErr) throw srcErr;

      // Deduplicate source rows (same logic as useSourceImages)
      const map = new Map<string, typeof sourceRows extends (infer T)[] ? T : never>();
      for (const row of (sourceRows || []) as any[]) {
        const key = buildDedupKey(row);
        const existing = map.get(key);
        if (!existing || new Date(row.created_at) > new Date((existing as any).created_at)) {
          map.set(key, row);
        }
      }
      const uniqueSources = Array.from(map.values()) as any[];

      // 2. Fetch source_image_id references from all output tables in parallel
      const [ugcRes, bulkRes, genRes] = await Promise.all([
        supabase
          .from('ugc_images')
          .select('source_image_id')
          .eq('user_id', user.id)
          .not('source_image_id', 'is', null),
        supabase
          .from('bulk_background_results')
          .select('source_image_id')
          .not('source_image_id', 'is', null),
        supabase
          .from('generated_images')
          .select('source_image_id')
          .eq('user_id', user.id)
          .not('source_image_id', 'is', null),
      ]);

      // Build count map
      const countMap = new Map<string, number>();
      const allRefs = [
        ...(ugcRes.data || []),
        ...(bulkRes.data || []),
        ...(genRes.data || []),
      ] as { source_image_id: string }[];

      for (const ref of allRefs) {
        const sid = ref.source_image_id;
        countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
      }

      // Compute uncategorized count
      const knownSourceIds = new Set(uniqueSources.map((s: any) => s.id));
      let uncategorized = 0;
      for (const ref of allRefs) {
        if (!knownSourceIds.has(ref.source_image_id)) uncategorized++;
      }

      // Also count ugc_images with null source_image_id
      const [ugcNullRes] = await Promise.all([
        supabase
          .from('ugc_images')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('source_image_id', null),
      ]);
      uncategorized += ugcNullRes.count ?? 0;

      setUncategorizedCount(uncategorized);

      // 3. Create signed URLs for each source image
      const withSignedUrls: SourceCatalogEntry[] = await Promise.all(
        uniqueSources.map(async (img: any) => {
          const bucket = detectBucket(img.public_url);
          const { data: signedData } = await supabase.storage
            .from(bucket)
            .createSignedUrl(img.storage_path, 3600);

          if (!signedData?.signedUrl) return null;

          return {
            id: img.id,
            signedUrl: signedData.signedUrl,
            fileName: img.file_name,
            createdAt: img.created_at,
            storage_path: img.storage_path,
            publicUrl: img.public_url,
            generatedCount: countMap.get(img.id) ?? 0,
          } satisfies SourceCatalogEntry;
        })
      ).then(list => list.filter(Boolean) as SourceCatalogEntry[]);

      setCatalogEntries(withSignedUrls);
    } catch (err) {
      console.error('[useLibraryBySource] Failed to load catalog:', err);
      setCatalogError('Failed to load source images');
    } finally {
      setCatalogLoading(false);
    }
  }, [user]);

  // ─── Level 2: load detail images for a source ────────────────────────────

  const fetchImagesForSource = useCallback(async (sourceImageId: string | null) => {
    if (!user) return;

    try {
      setDetailLoading(true);
      setDetailImages([]);

      let ugcQuery = supabase
        .from('ugc_images')
        .select('*, image_jobs(desiredAudience, prodSpecs, source_image_ids, settings)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      let bulkQuery = supabase
        .from('bulk_background_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (sourceImageId === null) {
        ugcQuery = ugcQuery.is('source_image_id', null);
        bulkQuery = bulkQuery.is('source_image_id', null);
      } else {
        ugcQuery = ugcQuery.eq('source_image_id', sourceImageId);
        bulkQuery = bulkQuery.eq('source_image_id', sourceImageId);
      }

      const [ugcRes, bulkRes] = await Promise.all([ugcQuery, bulkQuery]);

      // Normalize UGC
      const ugcImages: LibraryImage[] = (ugcRes.data || []).map((img: any) => {
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
            format: (img.meta as any)?.format || 'png',
          },
          source_image_id: img.source_image_id,
          job_id: img.job_id,
          desiredAudience: jobData?.desiredAudience,
          prodSpecs: jobData?.prodSpecs,
          source_image_ids: jobData?.source_image_ids,
          source_type: 'ugc' as const,
          meta: img.meta,
        };
      });

      // Normalize bulk background
      const bulkImages: LibraryImage[] = (bulkRes.data || []).map((result: any) => ({
        id: result.id,
        url: result.result_url,
        prompt: 'Bulk Background',
        created_at: result.created_at,
        settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
        source_type: 'bulk_background' as const,
        source_image_id: result.source_image_id,
        job_id: result.job_id,
      }));

      const all = [...ugcImages, ...bulkImages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDetailImages(all);
    } catch (err) {
      console.error('[useLibraryBySource] Failed to load detail images:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [user]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const selectSource = useCallback((id: string | null) => {
    setSelectedSourceId(id);
    const entry = id !== null ? catalogEntries.find(e => e.id === id) ?? null : null;
    setSelectedSource(entry);
    fetchImagesForSource(id);
  }, [catalogEntries, fetchImagesForSource]);

  const clearSelection = useCallback(() => {
    setSelectedSourceId(undefined);
    setSelectedSource(null);
    setDetailImages([]);
  }, []);

  const refetchDetail = useCallback(() => {
    if (selectedSourceId !== undefined) {
      fetchImagesForSource(selectedSourceId ?? null);
    }
  }, [selectedSourceId, fetchImagesForSource]);

  // ─── Delete source entry ─────────────────────────────────────────────────

  const deleteSourceEntry = useCallback(async (imageId: string): Promise<boolean> => {
    const image = catalogEntries.find(e => e.id === imageId);
    if (!image) return false;

    const bucket = detectBucket(image.publicUrl);
    await supabase.storage.from(bucket).remove([image.storage_path]);

    const { error } = await supabase
      .from('source_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;

    setCatalogEntries(prev => prev.filter(e => e.id !== imageId));
    return true;
  }, [catalogEntries]);

  // ─── Delete detail images ─────────────────────────────────────────────────

  const deleteDetailImage = useCallback(async (imageId: string): Promise<void> => {
    await Promise.all([
      supabase.from('ugc_images').delete().eq('id', imageId).eq('user_id', user!.id),
      supabase.from('bulk_background_results').delete().eq('id', imageId),
    ]);
    setDetailImages(prev => prev.filter(img => img.id !== imageId));
    // Decrement count on catalog entry
    if (selectedSourceId !== undefined && selectedSourceId !== null) {
      setCatalogEntries(prev =>
        prev.map(e =>
          e.id === selectedSourceId
            ? { ...e, generatedCount: Math.max(0, e.generatedCount - 1) }
            : e
        )
      );
    }
  }, [user, selectedSourceId]);

  const deleteDetailImages = useCallback(async (imageIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    const batchSize = 5;
    for (let i = 0; i < imageIds.length; i += batchSize) {
      const batch = imageIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(id =>
          Promise.all([
            supabase.from('ugc_images').delete().eq('id', id).eq('user_id', user!.id),
            supabase.from('bulk_background_results').delete().eq('id', id),
          ])
        )
      );
      results.forEach(r => {
        if (r.status === 'fulfilled') success++;
        else failed++;
      });
    }

    setDetailImages(prev => prev.filter(img => !imageIds.includes(img.id)));
    if (selectedSourceId !== undefined && selectedSourceId !== null) {
      setCatalogEntries(prev =>
        prev.map(e =>
          e.id === selectedSourceId
            ? { ...e, generatedCount: Math.max(0, e.generatedCount - success) }
            : e
        )
      );
    }

    return { success, failed };
  }, [user, selectedSourceId]);

  // ─── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    // Catalog level
    catalogEntries,
    uncategorizedCount,
    catalogLoading,
    catalogError,
    refetchCatalog: fetchCatalog,

    // Detail level
    selectedSourceId,
    selectedSource,
    detailImages,
    detailLoading,
    selectSource,
    clearSelection,
    refetchDetail,

    // Mutations
    deleteSourceEntry,
    deleteDetailImage,
    deleteDetailImages,
  };
};
