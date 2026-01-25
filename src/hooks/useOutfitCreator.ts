import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { outfitCreatorApi, OutfitCreatorJob, OutfitCreatorResult, GarmentSlots } from "@/api/outfit-creator-api";

export function useOutfitCreator() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<OutfitCreatorJob | null>(null);
  const [result, setResult] = useState<OutfitCreatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to job updates
  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
      return;
    }

    const unsubscribeJob = outfitCreatorApi.subscribeToJob(job.id, (updatedJob) => {
      console.log('[useOutfitCreator] Job updated:', updatedJob.status, updatedJob.progress);
      setJob(updatedJob);
      
      if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Generation failed');
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: updatedJob.error || "Something went wrong",
        });
      }
    });

    const unsubscribeResult = outfitCreatorApi.subscribeToResult(job.id, (newResult) => {
      console.log('[useOutfitCreator] Result received');
      setResult(newResult);
      toast({
        title: "Outfit Created!",
        description: "Your complete outfit has been generated.",
      });
    });

    return () => {
      unsubscribeJob();
      unsubscribeResult();
    };
  }, [job?.id, job?.status, toast]);

  const createJob = useCallback(async (
    baseModelId: string,
    garments: GarmentSlots,
    settings: any = {}
  ) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "Please sign in to create outfits.",
      });
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const newJob = await outfitCreatorApi.createJob(baseModelId, garments, settings);
      setJob(newJob);
      return newJob;
    } catch (err: any) {
      const message = err.message || "Failed to create job";
      setError(message);
      toast({
        variant: "destructive",
        title: "Failed to Start",
        description: message,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const cancelJob = useCallback(async () => {
    if (!job?.id) return;

    try {
      await outfitCreatorApi.cancelJob(job.id);
      setJob(prev => prev ? { ...prev, status: 'canceled' } : null);
      toast({
        title: "Job Canceled",
        description: "Your credits have been refunded.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Cancel",
        description: err.message,
      });
    }
  }, [job?.id, toast]);

  const reset = useCallback(() => {
    setJob(null);
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const refreshJob = useCallback(async () => {
    if (!job?.id) return;

    try {
      const updatedJob = await outfitCreatorApi.getJob(job.id);
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed' && !result) {
        const jobResult = await outfitCreatorApi.getResult(job.id);
        setResult(jobResult);
      }
    } catch (err) {
      console.error('[useOutfitCreator] Failed to refresh:', err);
    }
  }, [job?.id, result]);

  return {
    job,
    result,
    loading,
    error,
    createJob,
    cancelJob,
    reset,
    refreshJob,
    isProcessing: job?.status === 'queued' || job?.status === 'processing',
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isCanceled: job?.status === 'canceled',
    progress: job?.progress || 0,
    currentPass: job?.current_pass || 0,
    totalPasses: job?.total_passes || 0,
  };
}
