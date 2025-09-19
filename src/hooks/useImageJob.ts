// hooks/useImageJob.optimized.ts
// Drop-in replacement with tighter effects, watchdog via refs, and realtime fallback polling.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createImageJob,
  getJob,
  getJobImages,
  cancelJob,
  resumeJob,
  subscribeJob,
  type CreateJobPayload,
  type JobRow,
  type UgcImageRow,
} from '@/api/ugc';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Guard + helpers */
interface ImageMeta {
  index?: number;
  placeholder?: boolean;
  settings?: CreateJobPayload['settings'];
  prompt?: string;
}

function isUgcImageRow(x: any): x is UgcImageRow {
  return x && typeof x === 'object' && 'id' in x && 'public_url' in x;
}

function buildPlaceholders(count: number, payload: CreateJobPayload): UgcImageRow[] {
  const len = Math.max(1, count || 1);
  const now = new Date().toISOString();
  return Array.from({ length: len }, (_, i) => ({
    id: `placeholder-${i}-${now}`,
    job_id: 'pending',
    user_id: 'current',
    storage_path: '',
    public_url: '',
    prompt: payload.prompt,
    public_showcase: false,
    source_image_id: payload.source_image_id,
    created_at: now,
    updated_at: now,
    meta: { index: i, placeholder: true, settings: payload.settings } as ImageMeta,
  } satisfies UgcImageRow));
}

/** Deterministic merge by meta.index preserving array length */
function mergeByIndex(placeholders: UgcImageRow[], incoming: UgcImageRow[]): UgcImageRow[] {
  console.log('[useImageJob] mergeByIndex called:', { 
    placeholders: placeholders.length, 
    incoming: incoming.length,
    placeholderIndexes: placeholders.map(p => ({ id: p.id, index: (p as any)?.meta?.index })),
    incomingIndexes: incoming.map(p => ({ id: p.id, index: (p as any)?.meta?.index }))
  });

  const byIdx: Map<number, UgcImageRow> = new Map();
  
  // Map incoming images by their index
  for (const img of incoming) {
    const idx = (img as any)?.meta?.index as number | undefined;
    if (typeof idx === 'number') {
      byIdx.set(idx, img);
    } else {
      // If no index, try to infer from existing placeholders or use array position
      const existingPlaceholder = placeholders.find(p => p.id.includes('placeholder') && 
        !byIdx.has((p as any)?.meta?.index ?? -1));
      if (existingPlaceholder) {
        const inferredIdx = (existingPlaceholder as any)?.meta?.index ?? placeholders.indexOf(existingPlaceholder);
        if (typeof inferredIdx === 'number') {
          byIdx.set(inferredIdx, { ...img, meta: { ...img.meta, index: inferredIdx } });
        }
      }
    }
  }
  
  const maxIndex = Math.max(
    ...[...byIdx.keys(), ...placeholders.map((p) => (p as any)?.meta?.index ?? -1)],
    -1,
  );
  const size = Math.max(maxIndex + 1, placeholders.length, incoming.length);
  
  const result: UgcImageRow[] = Array.from({ length: size }, (_, i) => {
    if (byIdx.has(i)) return byIdx.get(i)!;
    const ph = placeholders.find((p) => (p as any)?.meta?.index === i);
    return ph ?? placeholders[i] ?? (incoming[i] && isUgcImageRow(incoming[i]) ? incoming[i] : (null as any));
  }).filter(Boolean);
  
  console.log('[useImageJob] mergeByIndex result:', {
    resultLength: result.length,
    resultItems: result.map(r => ({ id: r.id, hasUrl: !!r.public_url, index: (r as any)?.meta?.index }))
  });
  
  return result;
}

export function useImageJob() {
  const [job, setJob] = useState<JobRow | null>(null);
  const [images, setImages] = useState<UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures & unnecessary renders
  const isMountedRef = useRef(true);
  const watchdogRef = useRef<number | null>(null);
  const resumeAttemptsRef = useRef(0);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /** Job row subscription (minimal deps) */
  useEffect(() => {
    if (!job?.id) return;

    const unsubscribe = subscribeJob(job.id, (updatedJob: JobRow) => {
      setJob(updatedJob);

      // Any progress/state change => clear watchdog & reset attempts
      if (updatedJob.status !== 'queued' || (updatedJob.progress ?? 0) > 0) {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
        resumeAttemptsRef.current = 0;
      }

      if (updatedJob.status === 'completed' && (updatedJob.completed ?? 0) > 0) {
        void loadJobImages(updatedJob.id);
      }

      if (updatedJob.status === 'failed') {
        const errorMsg = `Image generation failed: ${updatedJob.error || 'Unknown error'}`;
        setError(errorMsg);
        toast.error(errorMsg);
        // Clear placeholders on fail to avoid "ghost" slots
        setImages([]);
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  /** Images realtime subscription + fallback polling */
  useEffect(() => {
    if (!job?.id) return;

    const channel = supabase
      .channel(`ugc_images_job_${job.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ugc_images', filter: `job_id=eq.${job.id}` },
        (payload) => {
          const incoming = payload.new as UgcImageRow;
          setImages((prev) => {
            const inIdx = (incoming as any)?.meta?.index as number | undefined;
            if (typeof inIdx === 'number') {
              const pos = prev.findIndex(
                (p) => (p as any)?.meta?.index === inIdx && (p as any)?.meta?.placeholder,
              );
              if (pos !== -1) {
                const next = prev.slice();
                next[pos] = incoming;
                return next;
              }
            }
            if (prev.some((p) => p.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // Realtime flaky? Fallback to short polling until completion
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = window.setInterval(async () => {
            if (!job?.id) return;
            try {
              const { images: list } = await getJobImages(job.id);
              setImages((prev) => mergeByIndex(prev, list));
              // Stop polling if completed
              if (job?.status === 'completed') {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
              }
            } catch {
              // no-op
            }
          }, 3000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  /** Watchdog: auto-resume if job stays in queued with no progress */
  useEffect(() => {
    if (!job?.id) return;

    const stuck = job.status === 'queued' && (job.progress ?? 0) === 0;
    if (!stuck) {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
      resumeAttemptsRef.current = 0;
      return;
    }

    if (watchdogRef.current) return; // already armed

    watchdogRef.current = window.setTimeout(async () => {
      try {
        if (resumeAttemptsRef.current < 3) {
          resumeAttemptsRef.current += 1;
          await resumeJob(job.id);
          toast.message('Auto-resume triggered');
        }
      } catch {
        // swallow
      } finally {
        watchdogRef.current = null; // allow re-arm if it remains stuck
      }
    }, 20_000); // 20s vs 30s for snappier recovery
  }, [job?.id, job?.status, job?.progress]);

  /** Fetch all images for a job */
  const loadJobImages = useCallback(async (jobId: string) => {
    try {
      const { images: jobImages } = await getJobImages(jobId);
      setImages((prev) => mergeByIndex(prev, jobImages));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load images';
      setError(errorMsg);
    }
  }, []);

  const loadJob = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { job: jobData } = await getJob(jobId);
      setJob(jobData);
      
      // Save job metadata for mobile persistence
      const jobMetadata = {
        id: jobData.id,
        numImages: jobData.total,
        settings: jobData.settings,
        status: jobData.status,
        createdAt: jobData.created_at
      };
      localStorage.setItem('jobMetadata', JSON.stringify(jobMetadata));
      
      await loadJobImages(jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job';
      setError(message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [loadJobImages]);

  const createJob = useCallback(async (payload: CreateJobPayload): Promise<string> => {
    console.log('[useImageJob] Creating new job, clearing previous state first');
    
    // Always clear previous job state before creating new one
    setJob(null);
    setImages([]);
    setError(null);
    
    // Clear all timers
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    
    setLoading(true);

    const total = payload?.settings?.number || 1;
    console.log('[useImageJob] Creating job for', total, 'images');
    const optimisticJobId = `local-${Date.now()}`;

    setJob({
      id: optimisticJobId,
      user_id: 'current',
      status: 'queued',
      progress: 0,
      total,
      completed: 0,
      failed: 0,
      prompt: payload.prompt,
      settings: payload.settings,
      created_at: new Date().toISOString(),
      finished_at: null,
    } as unknown as JobRow);

    setImages(buildPlaceholders(total, payload));

    try {
      const result = await createImageJob(payload);

      // Fast-path for idempotent reuse
      if ((result as any).status === 'completed' && (result as any).existingImages) {
        const existing = (result as any).existingImages as Array<{ url: string; prompt?: string }>;
        const ugcImages: UgcImageRow[] = existing.map((img, index) => ({
          id: `existing-${index}-${result.jobId}`,
          job_id: result.jobId,
          user_id: 'current',
          storage_path: '',
          public_url: img.url,
          meta: { prompt: img.prompt, index } as ImageMeta,
          created_at: new Date().toISOString(),
          prompt: payload.prompt,
          public_showcase: false,
          source_image_id: payload.source_image_id,
          updated_at: new Date().toISOString(),
        })) as any;

        setJob({
          id: result.jobId,
          user_id: 'current',
          status: 'completed',
          progress: 100,
          total: ugcImages.length,
          completed: ugcImages.length,
          failed: 0,
          prompt: payload.prompt,
          settings: payload.settings,
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        } as unknown as JobRow);

        setImages(ugcImages);
        toast.success('Using existing images from recent identical request');
        // Backfill directly without calling loadJob to avoid TDZ issues
        try {
          const { job: jobData } = await getJob(result.jobId);
          setJob(jobData);
        } catch { /* silent backfill */ }
        return result.jobId;
      }

      // Inline load to avoid referencing loadJob before init
      const { job: jobData } = await getJob(result.jobId);
      setJob(jobData);
      await loadJobImages(result.jobId);
      return result.jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      toast.error(message);
      setJob(null);
      setImages([]);
      throw err;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [loadJobImages]);

  const cancelCurrentJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      await cancelJob(job.id);
      toast.success('Job canceled successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
      toast.error(message);
    }
  }, [job?.id]);

  const resumeCurrentJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      await resumeJob(job.id);
      toast.success('Resuming job processing…');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume job';
      toast.error(message);
    }
  }, [job?.id]);

  const clearJob = useCallback(() => {
    console.log('[useImageJob] Clearing job state');
    setJob(null);
    setImages([]);
    setError(null);
    setLoading(false);
    
    // Clear all timers and refs
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    
    resumeAttemptsRef.current = 0;
    
    // Clear all persistence data
    localStorage.removeItem('jobMetadata');
    localStorage.removeItem('currentJobId');
    localStorage.removeItem('currentStage');
    
    console.log('[useImageJob] Job state cleared');
  }, []);

  return {
    job,
    images,
    loading,
    error,
    createJob,
    loadJob,
    cancelCurrentJob,
    resumeCurrentJob,
    clearJob,
  } as const;
}
