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
  createdAt: number; // timestamp for ordering (newest first)
}

export function useMultiJobTracker(modelVersion: ModelVersion) {
  const [jobs, setJobs] = useState<Map<string, TrackedJob>>(new Map());
  const cleanupFnsRef = useRef<Map<string, () => void>>(new Map());
  const api = createGeminiApi(modelVersion);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      cleanupFnsRef.current.forEach(fn => fn());
      cleanupFnsRef.current.clear();
    };
  }, []);

  const addJob = useCallback((jobId: string, totalSlots: number, orientation: string) => {
    // Don't add if already tracked
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

    // Set up subscriptions for this job
    const jobUnsub = api.subscribeJob(jobId, (updatedJob: JobRow) => {
      setJobs(prev => {
        const existing = prev.get(jobId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(jobId, {
          ...existing,
          status: updatedJob.status,
          progress: updatedJob.progress ?? 0,
        });
        return next;
      });
    });

    const imgUnsub = api.subscribeJobImages(jobId, (newImages: any[]) => {
      setJobs(prev => {
        const existing = prev.get(jobId);
        if (!existing) return prev;
        const validImages: GeminiUgcImageRow[] = newImages
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
        const next = new Map(prev);
        next.set(jobId, { ...existing, images: validImages });
        return next;
      });
    });

    // Store cleanup
    cleanupFnsRef.current.set(jobId, () => {
      jobUnsub();
      imgUnsub();
    });
  }, [api]);

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

  // Get completed job IDs for the consumer to move images out
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
