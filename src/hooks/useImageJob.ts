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
  type UgcImageRow 
} from '@/api/ugc';
import { toast } from 'sonner';

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

const TERMINAL: JobRow['status'][] = ['completed', 'failed', 'canceled'];


export function useImageJob() {
  const [job, setJob] = useState<JobRow | null>(null);
  const [images, setImages] = useState<UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef to avoid stale closures for timers
  const watchdogRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  // Subscribe + polling fallback whenever jobId changes
  useEffect(() => {
    if (!job?.id) return;

    // 1) Realtime subscription
    const unsub = subscribeJob(job.id, (updated: JobRow) => {
      setJob(updated);

      // stop polling when terminal
      if (TERMINAL.includes(updated.status)) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }

      // fetch images on completion
      if (updated.status === 'completed' && (updated.completed ?? 0) > 0) {
        void loadJobImages(updated.id);
      }

      // toast on fail
      if (updated.status === 'failed') {
        toast.error(`Image generation failed: ${updated.error || 'Unknown error'}`);
      }

      // clear watchdog once job moves
      if (updated.status !== 'queued' || (updated.progress ?? 0) > 0) {
        if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      }
    });

    // 2) Watchdog: if job is stuck queued with 0% for 30s, try resume
    if (job.status === 'queued' && (job.progress ?? 0) === 0 && !watchdogRef.current) {
      watchdogRef.current = window.setTimeout(() => {
        console.log('[watchdog] appears stuck – attempting resume');
        resumeJob(job.id).catch(console.error);
      }, 30_000);
    }

    // 3) Polling fallback: every 3s until terminal (covers WS/CSP/Safari quirks)
    if (!pollRef.current) {
      pollRef.current = window.setInterval(async () => {
        try {
          const { job: latest } = await getJob(job.id);
          if (!latest) return;
          setJob(latest);
          if (latest.status === 'completed') void loadJobImages(latest.id);
          if (TERMINAL.includes(latest.status)) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        } catch (e) {
          // ignore transient failures
        }
      }, 3000);
    }

    return () => {
      unsub();
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [job?.id]); // re-run only when jobId changes

  const loadJobImages = async (jobId: string) => {
    try {
      const { images: jobImages } = await getJobImages(jobId);
      setImages(jobImages);
    } catch (err) {
      console.error('Failed to load job images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
    }
  };

  const createJob = useCallback(async (payload: CreateJobPayload): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      const result = await createImageJob(payload);

      // If deduped to an existing completed job
      if (result.status === 'completed' && result.existingImages) {
        const mock: JobRow = {
          id: result.jobId,
          user_id: 'current',
          status: 'completed',
          progress: 100,
          total: result.existingImages.length,
          completed: result.existingImages.length,
          failed: 0,
          prompt: payload.prompt,
          settings: payload.settings,
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        };
        setJob(mock);
        setImages(
          result.existingImages.map((img: any, i: number) => ({
            id: `existing-${i}`,
            job_id: result.jobId,
            user_id: 'current',
            storage_path: '',
            public_url: img.url,
            meta: { prompt: img.prompt },
            created_at: new Date().toISOString(),
            prompt: payload.prompt,
            public_showcase: false,
            source_image_id: payload.source_image_id,
            updated_at: new Date().toISOString()
          }))
        );
        toast.success('Using existing images from recent identical request');
      } else {
        // Load job and let subscription/polling do the rest
        await loadJob(result.jobId);
      }

      return result.jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      toast.error(message);
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
      if (jobData.status === 'completed' && (jobData.completed ?? 0) > 0) {
        await loadJobImages(jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
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
      toast.error(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  }, [job?.id]);

  const resumeCurrentJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      await resumeJob(job.id);
      toast.success('Resuming job processing...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resume job');
    }
  }, [job?.id]);

  const clearJob = useCallback(() => {
    setJob(null);
    setImages([]);
    setError(null);
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  return { job, images, loading, error, createJob, loadJob, cancelCurrentJob, resumeCurrentJob, clearJob };
}