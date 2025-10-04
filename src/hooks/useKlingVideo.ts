import { useState, useEffect, useCallback } from 'react';
import { 
  createVideoJob as apiCreateVideoJob, 
  getVideoJob,
  cancelVideoJob as apiCancelVideoJob,
  subscribeVideoJob,
  KlingJobRow,
  CreateVideoJobPayload 
} from '@/api/kling';
import { useToast } from '@/hooks/use-toast';

export function useKlingVideo() {
  const [job, setJob] = useState<KlingJobRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Subscribe to job updates when a job is set
  useEffect(() => {
    if (!job?.id) return;

    console.log('[USE-KLING-VIDEO] Setting up subscription for job:', job.id);

    const subscription = subscribeVideoJob(job.id, (updatedJob) => {
      console.log('[USE-KLING-VIDEO] Job update received:', updatedJob.status);
      setJob(updatedJob);

      // Show toast notifications for status changes
      if (updatedJob.status === 'completed') {
        toast({
          title: 'Video Ready!',
          description: 'Your video has been generated successfully.',
        });
      } else if (updatedJob.status === 'failed') {
        toast({
          title: 'Video Generation Failed',
          description: updatedJob.error?.message || 'An error occurred while generating your video.',
          variant: 'destructive',
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [job?.id, toast]);

  const createVideoJob = useCallback(async (payload: CreateVideoJobPayload) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[USE-KLING-VIDEO] Creating video job:', payload);
      const result = await apiCreateVideoJob(payload);

      if (!result.success) {
        if (result.current_balance !== undefined && result.required !== undefined) {
          setError(`Insufficient credits. You have ${result.current_balance} credits but need ${result.required}.`);
          toast({
            title: 'Insufficient Credits',
            description: `You need ${result.required} credits but only have ${result.current_balance}.`,
            variant: 'destructive',
          });
        } else {
          setError(result.error || 'Failed to create video job');
          toast({
            title: 'Error',
            description: result.error || 'Failed to create video job',
            variant: 'destructive',
          });
        }
        return null;
      }

      // Fetch the created job
      if (result.jobId) {
        const jobResult = await getVideoJob(result.jobId);
        if (jobResult.success && jobResult.job) {
          setJob(jobResult.job);
          toast({
            title: 'Video Generation Started',
            description: 'Your video is being generated. This may take a few minutes.',
          });
          return jobResult.job;
        }
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create video job';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getVideoStatus = useCallback(async (jobId: string) => {
    try {
      const result = await getVideoJob(jobId);
      if (result.success && result.job) {
        setJob(result.job);
        return result.job;
      }
      return null;
    } catch (err: any) {
      console.error('[USE-KLING-VIDEO] Error fetching job status:', err);
      return null;
    }
  }, []);

  const cancelVideoJob = useCallback(async (jobId: string) => {
    try {
      const result = await apiCancelVideoJob(jobId);
      if (result.success) {
        toast({
          title: 'Video Generation Canceled',
          description: 'Your video generation has been canceled.',
        });
        // Refresh job status
        await getVideoStatus(jobId);
        return true;
      } else {
        toast({
          title: 'Cannot Cancel',
          description: result.error || 'Failed to cancel video generation',
          variant: 'destructive',
        });
        return false;
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel video generation',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, getVideoStatus]);

  const clearJob = useCallback(() => {
    setJob(null);
    setError(null);
  }, []);

  return {
    job,
    loading,
    error,
    createVideoJob,
    getVideoStatus,
    cancelVideoJob,
    clearJob,
  };
}
