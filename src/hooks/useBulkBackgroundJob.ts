import { useState, useRef, useEffect, useCallback } from 'react';
import { bulkBackgroundApi, BulkBackgroundJob, BulkBackgroundResult, CreateBulkJobPayload } from '@/api/bulk-background-api';
import { useToast } from '@/hooks/use-toast';

export const useBulkBackgroundJob = () => {
  const [job, setJob] = useState<BulkBackgroundJob | null>(null);
  const [results, setResults] = useState<BulkBackgroundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false; 
    };
  }, []);

  // Subscribe to job updates via Realtime
  useEffect(() => {
    if (!job?.id) return;

    const unsubJob = bulkBackgroundApi.subscribeJob(job.id, (updatedJob) => {
      if (!isMountedRef.current) return;
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed') {
        toast({
          title: "Batch Complete!",
          description: `Processed ${updatedJob.completed_images} of ${updatedJob.total_images} images.`,
        });
      } else if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Batch processing failed');
        toast({
          title: "Batch Failed",
          description: updatedJob.error || "Failed to process images",
          variant: "destructive",
        });
      }
    });

    const unsubResults = bulkBackgroundApi.subscribeResults(job.id, (updatedResults) => {
      if (!isMountedRef.current) return;
      setResults(updatedResults);
    });

    return () => {
      unsubJob();
      unsubResults();
    };
  }, [job?.id, toast]);

  // Polling fallback - ensures UI updates even if Realtime fails
  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const { job: updatedJob } = await bulkBackgroundApi.getJob(job.id);
        const { results: updatedResults } = await bulkBackgroundApi.getJobResults(job.id);
        
        if (isMountedRef.current) {
          setJob(updatedJob);
          setResults(updatedResults);
          
          // Show completion toast if job finished
          if (updatedJob.status === 'completed' && job.status !== 'completed') {
            toast({
              title: "Batch Complete!",
              description: `Processed ${updatedJob.completed_images} of ${updatedJob.total_images} images.`,
            });
          } else if (updatedJob.status === 'failed' && job.status !== 'failed') {
            setError(updatedJob.error || 'Batch processing failed');
            toast({
              title: "Batch Failed",
              description: updatedJob.error || "Failed to process images",
              variant: "destructive",
            });
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [job?.id, job?.status, toast]);

  const createJob = useCallback(async (payload: CreateBulkJobPayload) => {
    try {
      setLoading(true);
      setError(null);

      const { jobId } = await bulkBackgroundApi.createJob(payload);
      const { job: newJob } = await bulkBackgroundApi.getJob(jobId);
      const { results: initialResults } = await bulkBackgroundApi.getJobResults(jobId);

      if (!isMountedRef.current) return null;

      setJob(newJob);
      setResults(initialResults);

      return { jobId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create batch job';
      if (isMountedRef.current) {
        setError(message);
        toast({
          title: "Batch Creation Failed",
          description: message,
          variant: "destructive",
        });
      }
      return null;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [toast]);

  const cancelJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      const result = await bulkBackgroundApi.cancelJob(job.id);
      toast({ 
        title: "Batch Canceled", 
        description: result.refunded 
          ? `Processing stopped. ${result.refunded} credits refunded.`
          : "Processing has been stopped." 
      });
    } catch (err) {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel batch processing.",
        variant: "destructive",
      });
    }
  }, [job?.id, toast]);

  const downloadAll = useCallback(async () => {
    if (!job?.id || job.status !== 'completed') return null;
    try {
      const { images } = await bulkBackgroundApi.getDownloadImages(job.id);
      return images;
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Failed to get download links.",
        variant: "destructive",
      });
      return null;
    }
  }, [job?.id, job?.status, toast]);

  const loadLastJob = useCallback(async () => {
    try {
      setLoading(true);
      const { job: lastJob, results: lastResults } = await bulkBackgroundApi.getLastJob();
      if (!isMountedRef.current) return null;
      if (lastJob) {
        setJob(lastJob);
        setResults(lastResults);
        return lastJob;
      }
      return null;
    } catch (err) {
      console.error('Failed to load last job:', err);
      return null;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const clearJob = useCallback(() => {
    setJob(null);
    setResults([]);
    setError(null);
  }, []);

  const retryResult = useCallback(async (resultId: string) => {
    try {
      const response = await bulkBackgroundApi.retryResult(resultId);
      if (response.success) {
        toast({
          title: "Retry Started",
          description: "Reprocessing image...",
        });
        // Refresh results
        if (job?.id) {
          const { results: updatedResults } = await bulkBackgroundApi.getJobResults(job.id);
          if (isMountedRef.current) {
            setResults(updatedResults);
          }
        }
      } else {
        throw new Error(response.error || 'Retry failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry image';
      toast({
        title: "Retry Failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [job?.id, toast]);


  return {
    job,
    results,
    loading,
    error,
    createJob,
    cancelJob,
    downloadAll,
    clearJob,
    retryResult,
    isProcessing: job?.status === 'queued' || job?.status === 'processing',
    isComplete: job?.status === 'completed',
    isCanceled: job?.status === 'canceled',
    isFailed: job?.status === 'failed',
    progress: job ? Math.round((job.completed_images / Math.max(job.total_images, 1)) * 100) : 0
  };
};
