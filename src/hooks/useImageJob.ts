// hooks/useImageJob.ts
import { useState, useEffect, useCallback } from 'react';
import {
  createImageJob,
  getJob,
  getJobImages,
  cancelJob,
  resumeJob,
  subscribeJob,
  type CreateJobPayload,
  type JobRow,
  type UgcImageRow
} from '@/api/ugc';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Use browser friendly timeout type
type Timer = ReturnType<typeof setTimeout>;

interface UseImageJobReturn {
  job: JobRow | null;
  images: UgcImageRow[];
  loading: boolean;
  error: string | null;
  createJob: (payload: CreateJobPayload) => Promise<string>;
  loadJob: (jobId: string) => Promise<void>;
  cancelCurrentJob: () => Promise<void>;
  resumeCurrentJob: () => Promise<void>;
  clearJob: () => void;
}

/** Build placeholder rows (by index) so UI shows “generating” slots immediately */
function buildPlaceholders(count: number, payload: CreateJobPayload): UgcImageRow[] {
  const now = new Date().toISOString();
  return Array.from({ length: Math.max(1, count || 1) }, (_, i) => ({
    id: `placeholder-${Date.now()}-${i}`,
    job_id: 'pending',
    user_id: 'current',
    storage_path: '',
    public_url: '',                     // empty => your UI treats as “not ready”
    prompt: payload.prompt,
    public_showcase: false,
    source_image_id: payload.source_image_id,
    created_at: now,
    updated_at: now,
    meta: {
      index: i,
      placeholder: true,
      settings: payload.settings
    }
  }) as unknown as UgcImageRow);
}

export function useImageJob(): UseImageJobReturn {
  const [job, setJob] = useState<JobRow | null>(null);
  const [images, setImages] = useState<UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchdogTimer, setWatchdogTimer] = useState<Timer | null>(null);

  /** ---- Subscribe to job row updates (you already had this) ---- */
  useEffect(() => {
    if (!job?.id) return;

    const unsubscribe = subscribeJob(job.id, (updatedJob: JobRow) => {
      console.log(`[useImageJob] Job update received:`, updatedJob);
      setJob(updatedJob);

      // Clear watchdog once we see any progress or different status
      if (updatedJob.status !== 'queued' || (updatedJob.progress ?? 0) > 0) {
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          setWatchdogTimer(null);
        }
      }

      // Optional: if job completes, make sure we’ve got all images from DB
      if (updatedJob.status === 'completed' && (updatedJob.completed ?? 0) > 0) {
        loadJobImages(updatedJob.id);
      }

      if (updatedJob.status === 'failed') {
        const errorMsg = `Image generation failed: ${updatedJob.error || 'Unknown error'}`;
        console.error(`[useImageJob] Job failed:`, errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
      }
    });

    // Watchdog: auto-resume if it looks stuck
    if (job.status === 'queued' && (job.progress ?? 0) === 0) {
      const timer = setTimeout(() => {
        console.log('Watchdog: Job appears stuck, attempting to resume…');
        resumeJob(job.id).catch(console.error);
      }, 30_000);
      setWatchdogTimer(timer);
    }

    return () => {
      unsubscribe();
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]); // keep deps minimal so subscription isn’t recreated needlessly

  /** ---- NEW: Realtime stream of ugc_images inserts for this job ---- */
  useEffect(() => {
    if (!job?.id) return;

    console.log(`[useImageJob] Setting up images realtime subscription for job ${job.id}`);

    const channel = supabase
      .channel(`ugc_images_job_${job.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ugc_images', filter: `job_id=eq.${job.id}` },
        (payload) => {
          console.log(`[useImageJob] New image received:`, payload);
          const incoming = payload.new as UgcImageRow;

          setImages((prev) => {
            // If we know the index, replace matching placeholder slot
            const inIdx = (incoming as any)?.meta?.index as number | undefined;
            if (typeof inIdx === 'number') {
              const pos = prev.findIndex(
                (p) => (p as any)?.meta?.index === inIdx && (p as any)?.meta?.placeholder
              );
              if (pos !== -1) {
                console.log(`[useImageJob] Replacing placeholder at index ${inIdx}`);
                const next = prev.slice();
                next[pos] = incoming;
                return next;
              }
            }
            // Else append if not already present
            if (prev.some((p) => p.id === incoming.id)) {
              console.log(`[useImageJob] Image already exists, skipping`);
              return prev;
            }
            console.log(`[useImageJob] Adding new image to list`);
            return [...prev, incoming];
          });
        }
      )
      .subscribe((status) => {
        console.log(`[useImageJob] Images realtime subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error(`[useImageJob] Images realtime subscription error for job ${job.id}`);
        }
      });

    return () => {
      console.log(`[useImageJob] Cleaning up images realtime subscription for job ${job.id}`);
      supabase.removeChannel(channel);
    };
  }, [job?.id]);

  /** Fetch all images for a job (used on completion and first load) */
  const loadJobImages = async (jobId: string) => {
    try {
      console.log(`[useImageJob] Loading images for job ${jobId}`);
      const { images: jobImages } = await getJobImages(jobId);
      console.log(`[useImageJob] Loaded ${jobImages.length} images for job ${jobId}`, jobImages);
      
      // If we had placeholders, merge by index to keep order stable
      setImages((prev) => {
        if (!prev.some(p => (p as any)?.meta?.placeholder)) {
          console.log(`[useImageJob] No placeholders, replacing all images`);
          return jobImages;
        }
        
        console.log(`[useImageJob] Merging ${jobImages.length} loaded images with ${prev.length} placeholders`);
        const next = [...prev];
        for (const img of jobImages) {
          const idx = (img as any)?.meta?.index as number | undefined;
          if (typeof idx === 'number') {
            const p = next.findIndex((x) => (x as any)?.meta?.index === idx);
            if (p !== -1) {
              console.log(`[useImageJob] Replacing placeholder at index ${idx}`);
              next[p] = img as any;
            } else {
              console.log(`[useImageJob] Adding image at new index ${idx}`);
              next.push(img as any);
            }
          } else if (!next.some((x) => x.id === (img as any).id)) {
            console.log(`[useImageJob] Adding image without index`);
            next.push(img as any);
          }
        }
        const result = next.filter(Boolean);
        console.log(`[useImageJob] Final merged result: ${result.length} images`);
        return result;
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load images';
      console.error('[useImageJob] Failed to load job images:', err);
      setError(errorMsg);
    }
  };

  /** ---- UPDATED: Optimistic placeholders + fast feedback ---- */
  const createJob = useCallback(async (payload: CreateJobPayload): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // 1) Show optimistic queued job + placeholders immediately
      const total = payload?.settings?.number || 1;
      const tempJobId = `local-${Date.now()}`;
      setJob({
        id: tempJobId,
        user_id: 'current',
        status: 'queued',
        progress: 0,
        total,
        completed: 0,
        failed: 0,
        prompt: payload.prompt,
        settings: payload.settings,
        created_at: new Date().toISOString(),
        finished_at: null
      } as unknown as JobRow);

      setImages(buildPlaceholders(total, payload));

      // 2) Call backend to create the real job
      const result = await createImageJob(payload);

      // If backend deduplicated and returned completed images, short-circuit
      if ((result as any).status === 'completed' && (result as any).existingImages) {
        const ugcImages: UgcImageRow[] = (result as any).existingImages.map((img: any, index: number) => ({
          id: `existing-${index}`,
          job_id: result.jobId,
          user_id: 'current',
          storage_path: '',
          public_url: img.url,
          meta: { prompt: img.prompt, index },
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
        return result.jobId;
      }

      // 3) Replace optimistic job id with the real one and start tracking it
      await loadJob(result.jobId);
      return result.jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      toast.error(message);
      // Roll back optimistic UI
      setJob(null);
      setImages([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJob = useCallback(async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { job: jobData } = await getJob(jobId);
      setJob(jobData);

      // Load any images already present (useful if we navigated away and came back)
      await loadJobImages(jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job';
      setError(message);
      // optional: toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setJob(null);
    setImages([]);
    setError(null);
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
    }
    setWatchdogTimer(null);
  }, [watchdogTimer]);

  return {
    job,
    images,
    loading,
    error,
    createJob,
    loadJob,
    cancelCurrentJob,
    resumeCurrentJob,
    clearJob
  };
}
