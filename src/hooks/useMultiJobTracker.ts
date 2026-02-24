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
  /** DB-reported completed image count */
  dbCompleted: number;
  /** DB-reported failed image count */
  dbFailed: number;
  /** DB-reported total image count */
  dbTotal: number;
  /** Timestamp when status first became terminal */
  terminalAt?: number;
}

/** Terminal statuses */
const TERMINAL = new Set(['completed', 'failed', 'canceled']);

function isTerminal(status: string) {
  return TERMINAL.has(status);
}

/**
 * Determine if a job is ready to be finalized (removed from tracker).
 * A job is ready when:
 *   (terminal AND retrieved >= expected)  OR  (retrieved >= totalSlots)
 */
function computeReadyToFinalize(job: TrackedJob): boolean {
  const retrieved = job.images.filter(img => Boolean(img.public_url)).length;
  const terminal = isTerminal(job.status);

  // Fallback: all requested images arrived regardless of status
  if (job.totalSlots > 0 && retrieved >= job.totalSlots) return true;

  if (!terminal) return false;

  // Use dbCompleted if known and > 0, otherwise fallback to totalSlots
  const expected = job.dbCompleted > 0
    ? Math.min(job.dbCompleted, job.totalSlots)
    : job.totalSlots;

  // For failed/canceled jobs with 0 expected, finalize immediately
  if (expected === 0 && (job.status === 'failed' || job.status === 'canceled')) return true;

  return retrieved >= expected;
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
      updateJob(jobId, existing => {
        console.log(`[Tracker] Images for ${jobId}: ${validImages.length} (was ${existing.images.length})`);
        return { ...existing, images: validImages };
      });
    } catch (e) {
      console.error(`[Tracker] Failed to fetch images for ${jobId}:`, e);
    }
  }, [updateJob]);

  // Fetch and update job status + DB counters
  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('image_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error || !data) return;
      updateJob(jobId, existing => {
        const newStatus = data.status;
        const wasTerminal = isTerminal(existing.status);
        const nowTerminal = isTerminal(newStatus);
        console.log(`[Tracker] Status for ${jobId}: ${existing.status} -> ${newStatus}, completed=${data.completed}, failed=${data.failed}, total=${data.total}`);
        return {
          ...existing,
          status: newStatus,
          progress: data.progress ?? 0,
          dbCompleted: data.completed ?? 0,
          dbFailed: data.failed ?? 0,
          dbTotal: data.total ?? existing.totalSlots,
          terminalAt: nowTerminal && !wasTerminal ? Date.now() : existing.terminalAt,
        };
      });
    } catch (e) {
      console.error(`[Tracker] Failed to fetch job status for ${jobId}:`, e);
    }
  }, [updateJob]);

  // Polling fallback — poll ALL jobs that are NOT ready to finalize
  useEffect(() => {
    const jobsNeedingSync = Array.from(jobs.values())
      .filter(j => !computeReadyToFinalize(j))
      .map(j => j.jobId);

    if (jobsNeedingSync.length === 0) {
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
          const needSync = Array.from(currentJobs.values())
            .filter(j => !computeReadyToFinalize(j))
            .map(j => j.jobId);
          console.log(`[Tracker] Polling ${needSync.length} unresolved jobs:`, needSync);
          needSync.forEach(id => {
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
    // Duplicate protection: skip if already tracked or cleanup exists
    if (cleanupFnsRef.current.has(jobId)) {
      console.log(`[Tracker] Skipping duplicate addJob for ${jobId}`);
      return;
    }

    setJobs(prev => {
      if (prev.has(jobId)) return prev;
      const next = new Map(prev);
      console.log(`[Tracker] Adding job ${jobId} with ${totalSlots} slots`);
      next.set(jobId, {
        jobId,
        totalSlots,
        status: 'queued',
        images: [],
        orientation,
        progress: 0,
        createdAt: Date.now(),
        dbCompleted: 0,
        dbFailed: 0,
        dbTotal: totalSlots,
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
            updateJob(jobId, existing => {
              const wasTerminal = isTerminal(existing.status);
              const nowTerminal = isTerminal(row.status);
              console.log(`[Tracker] Realtime status for ${jobId}: ${row.status}, completed=${row.completed}`);
              return {
                ...existing,
                status: row.status,
                progress: row.progress ?? 0,
                dbCompleted: row.completed ?? existing.dbCompleted,
                dbFailed: row.failed ?? existing.dbFailed,
                dbTotal: row.total ?? existing.dbTotal,
                terminalAt: nowTerminal && !wasTerminal ? Date.now() : existing.terminalAt,
              };
            });
            // When status becomes terminal, immediately try to fetch images
            if (isTerminal(row.status)) {
              fetchImages(jobId);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
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
    console.log(`[Tracker] Removing job ${jobId}`);
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

  // Jobs that are NOT ready to finalize = still active from user perspective
  const isAnyJobActive = trackedJobs.some(j => !computeReadyToFinalize(j));

  // Jobs that ARE ready to finalize — safe to move images and remove
  const readyToFinalizeJobIds = trackedJobs
    .filter(j => computeReadyToFinalize(j))
    .map(j => j.jobId);

  // Keep legacy completedJobIds pointing to readyToFinalizeJobIds for compatibility
  const completedJobIds = readyToFinalizeJobIds;

  return {
    trackedJobs,
    isAnyJobActive,
    completedJobIds,
    readyToFinalizeJobIds,
    addJob,
    removeJob,
    clearAllJobs,
  };
}
