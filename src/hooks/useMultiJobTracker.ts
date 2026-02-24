import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createGeminiApi, ModelVersion, JobRow } from '@/api/ugc-gemini-unified';
import type { GeminiUgcImageRow } from '@/hooks/useGeminiImageJobUnified';

export interface TrackedJob {
  jobId: string;
  totalSlots: number;
  status: string;
  images: GeminiUgcImageRow[];
  orientation: string;
  progress: number;
  createdAt: number;
}

const POLL_INTERVAL_MS = 5000;

export function useMultiJobTracker(modelVersion: ModelVersion) {
  const [jobs, setJobs] = useState<Map<string, TrackedJob>>(new Map());
  const cleanupFnsRef = useRef<Map<string, () => void>>(new Map());
  const apiRef = useRef(createGeminiApi(modelVersion));
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep api ref in sync
  useEffect(() => {
    apiRef.current = createGeminiApi(modelVersion);
  }, [modelVersion]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      cleanupFnsRef.current.forEach(fn => fn());
      cleanupFnsRef.current.clear();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Helper to update a single job in the map
  const updateJob = useCallback((jobId: string, updater: (existing: TrackedJob) => TrackedJob) => {
    setJobs(prev => {
      const existing = prev.get(jobId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(jobId, updater(existing));
      return next;
    });
  }, []);

  // Fetch and update images for a job
  const fetchImages = useCallback(async (jobId: string) => {
    try {
      const result = await apiRef.current.getJobImages(jobId);
      const validImages: GeminiUgcImageRow[] = (result.images || [])
        .filter((img: any) => img && img.id && img.public_url)
        .map((img: any) => ({
          id: img.id,
          job_id: img.job_id,
          user_id: img.user_id,
          storage_path: img.storage_path,
          public_url: img.public_url,
          meta: img.meta,
          created_at: img.created_at,
          prompt: img.prompt,
          public_showcase: img.public_showcase,
          source_image_id: img.source_image_id,
          updated_at: img.updated_at,
        }));
      updateJob(jobId, existing => ({ ...existing, images: validImages }));
    } catch (e) {
      console.error(`[Tracker] Failed to fetch images for ${jobId}:`, e);
    }
  }, [updateJob]);

  // Fetch and update job status
  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('image_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error || !data) return;
      updateJob(jobId, existing => ({
        ...existing,
        status: data.status,
        progress: data.progress ?? 0,
      }));
    } catch (e) {
      console.error(`[Tracker] Failed to fetch job status for ${jobId}:`, e);
    }
  }, [updateJob]);

  // Polling fallback for active jobs
  useEffect(() => {
    const activeJobIds = Array.from(jobs.values())
      .filter(j => j.status === 'queued' || j.status === 'processing')
      .map(j => j.jobId);

    if (activeJobIds.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Start polling if not already
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        setJobs(currentJobs => {
          const activeIds = Array.from(currentJobs.values())
            .filter(j => j.status === 'queued' || j.status === 'processing')
            .map(j => j.jobId);
          activeIds.forEach(id => {
            fetchJobStatus(id);
            fetchImages(id);
          });
          return currentJobs;
        });
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobs, fetchJobStatus, fetchImages]);

  const addJob = useCallback((jobId: string, totalSlots: number, orientation: string) => {
    setJobs(prev => {
      if (prev.has(jobId)) return prev;
      const next = new Map(prev);
      next.set(jobId, {
        jobId,
        totalSlots,
        status: 'queued',
        images: [],
        orientation,
        progress: 0,
        createdAt: Date.now(),
      });
      return next;
    });

    // Set up unique Supabase channels (tracker-prefixed to avoid collisions)
    const jobChannel = supabase
      .channel(`tracker-${modelVersion}-job:${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'image_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const row = (payload as any).new ?? (payload as any).record ?? null;
          if (row) {
            updateJob(jobId, existing => ({
              ...existing,
              status: row.status,
              progress: row.progress ?? 0,
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Initial fetch to catch anything missed
          fetchJobStatus(jobId);
        }
      });

    const imgChannel = supabase
      .channel(`tracker-${modelVersion}-images:${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ugc_images', filter: `job_id=eq.${jobId}` },
        () => {
          fetchImages(jobId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchImages(jobId);
        }
      });

    // Store cleanup that removes these tracker-specific channels
    cleanupFnsRef.current.set(jobId, () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(imgChannel);
    });
  }, [modelVersion, updateJob, fetchJobStatus, fetchImages]);

  const removeJob = useCallback((jobId: string) => {
    const cleanup = cleanupFnsRef.current.get(jobId);
    if (cleanup) {
      cleanup();
      cleanupFnsRef.current.delete(jobId);
    }
    setJobs(prev => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  const clearAllJobs = useCallback(() => {
    cleanupFnsRef.current.forEach(fn => fn());
    cleanupFnsRef.current.clear();
    setJobs(new Map());
  }, []);

  // Derive sorted array (newest first)
  const trackedJobs: TrackedJob[] = Array.from(jobs.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  const isAnyJobActive = trackedJobs.some(
    j => j.status === 'queued' || j.status === 'processing'
  );

  const completedJobIds = trackedJobs
    .filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'canceled')
    .map(j => j.jobId);

  return {
    trackedJobs,
    isAnyJobActive,
    completedJobIds,
    addJob,
    removeJob,
    clearAllJobs,
  };
}
