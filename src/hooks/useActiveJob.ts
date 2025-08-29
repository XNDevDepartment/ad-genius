import { useState, useEffect, useCallback } from 'react';
import { 
  getActiveJobForUser,
  getJobImages,
  subscribeJob,
  subscribeJobImages,
  type JobRow,
  type UgcImageRow 
} from '@/api/ugc';
import { useAuth } from '@/contexts/AuthContext';

interface UseActiveJobReturn {
  activeJob: JobRow | null;
  activeImages: UgcImageRow[];
  loading: boolean;
  error: string | null;
  refreshActiveJob: () => Promise<void>;
}

const ACTIVE_STATUSES: JobRow['status'][] = ['queued', 'processing'];

export function useActiveJob(): UseActiveJobReturn {
  const [activeJob, setActiveJob] = useState<JobRow | null>(null);
  const [activeImages, setActiveImages] = useState<UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchActiveJob = useCallback(async () => {
    if (!user) {
      setActiveJob(null);
      setActiveImages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { job } = await getActiveJobForUser();
      
      if (job && ACTIVE_STATUSES.includes(job.status)) {
        setActiveJob(job);
        // Fetch any existing images for this job
        try {
          const { images } = await getJobImages(job.id);
          setActiveImages(images);
        } catch (imgError) {
          console.warn('Failed to fetch active job images:', imgError);
          setActiveImages([]);
        }
      } else {
        setActiveJob(null);
        setActiveImages([]);
      }
    } catch (err) {
      console.error('Failed to fetch active job:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active job');
      setActiveJob(null);
      setActiveImages([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to job updates
  useEffect(() => {
    if (!activeJob?.id) return;

    const unsubscribeJob = subscribeJob(activeJob.id, (updatedJob: JobRow) => {
      if (ACTIVE_STATUSES.includes(updatedJob.status)) {
        setActiveJob(updatedJob);
      } else {
        // Job completed, failed, or canceled - clear active job
        setActiveJob(null);
        setActiveImages([]);
      }
    });

    const unsubscribeImages = subscribeJobImages(activeJob.id, (images: UgcImageRow[]) => {
      setActiveImages(images);
    });

    return () => {
      unsubscribeJob();
      unsubscribeImages();
    };
  }, [activeJob?.id]);

  // Fetch active job on mount and when user changes
  useEffect(() => {
    fetchActiveJob();
  }, [fetchActiveJob]);

  const refreshActiveJob = useCallback(async () => {
    await fetchActiveJob();
  }, [fetchActiveJob]);

  return {
    activeJob,
    activeImages,
    loading,
    error,
    refreshActiveJob
  };
}