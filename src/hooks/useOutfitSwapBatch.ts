import { useState, useEffect } from "react";
import { outfitSwapApi, OutfitSwapBatch, OutfitSwapJob } from "@/api/outfit-swap-api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useOutfitSwapBatch = () => {
  const [batch, setBatch] = useState<OutfitSwapBatch | null>(null);
  const [jobs, setJobs] = useState<OutfitSwapJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingJobs, setRetryingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Subscribe to batch updates
  useEffect(() => {
    if (!batch?.id) return;

    const unsubscribeBatch = outfitSwapApi.subscribeToBatch(batch.id, (updatedBatch) => {
      setBatch(updatedBatch);

      if (updatedBatch.status === "completed") {
        toast({
          title: "Batch completed",
          description: `${updatedBatch.completed_jobs} outfit swaps completed successfully`,
        });
      } else if (updatedBatch.status === "failed") {
        toast({
          variant: "destructive",
          title: "Batch failed",
          description: "All outfit swaps in this batch have failed",
        });
      }
    });

    return unsubscribeBatch;
  }, [batch?.id]);

  // Subscribe to job updates
  useEffect(() => {
    if (!batch?.id) return;

    const unsubscribeJobs = outfitSwapApi.subscribeToBatchJobs(batch.id, (updatedJob) => {
      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j.id === updatedJob.id);
        if (index >= 0) {
          const newJobs = [...prevJobs];
          newJobs[index] = updatedJob;
          return newJobs;
        }
        return [...prevJobs, updatedJob];
      });
    });

    return unsubscribeJobs;
  }, [batch?.id]);

  // Polling fallback when batch is processing
  useEffect(() => {
    if (!batch?.id) return;
    if (batch.status !== "processing" && batch.status !== "queued") return;
    
    // Poll every 5 seconds as fallback
    const pollInterval = setInterval(async () => {
      try {
        const updatedBatch = await outfitSwapApi.getBatch(batch.id);
        
        // Only update if status changed (avoid unnecessary re-renders)
        if (updatedBatch.status !== batch.status || 
            updatedBatch.completed_jobs !== batch.completed_jobs ||
            updatedBatch.failed_jobs !== batch.failed_jobs) {
          setBatch(updatedBatch);
          
          // Also refresh jobs
          const { data: batchJobs } = await supabase
            .from("outfit_swap_jobs")
            .select("*")
            .eq("batch_id", batch.id)
            .order("created_at", { ascending: true });
          
          if (batchJobs) {
            setJobs(batchJobs as OutfitSwapJob[]);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [batch?.id, batch?.status, batch?.completed_jobs, batch?.failed_jobs]);

  const createBatch = async (
    baseModelId: string,
    garmentIds: string[],
    settings: any = {}
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { batch: newBatch, jobs: newJobs } = await outfitSwapApi.createBatchJob(
        baseModelId,
        garmentIds,
        settings
      );

      setBatch(newBatch);
      setJobs(newJobs);

      toast({
        title: "Batch started",
        description: `Processing ${garmentIds.length} outfit swaps...`,
      });

      return newBatch;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create batch";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to start batch",
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadBatch = async (batchId: string) => {
    try {
      setLoading(true);
      const loadedBatch = await outfitSwapApi.getBatch(batchId);
      setBatch(loadedBatch);

      // Load jobs for this batch
      const { data: batchJobs } = await supabase
        .from("outfit_swap_jobs")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true });

      if (batchJobs) {
        setJobs(batchJobs as OutfitSwapJob[]);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Failed to load batch",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBatch = async () => {
    if (!batch?.id) return;

    try {
      await outfitSwapApi.cancelBatch(batch.id);
      setBatch((prev) => (prev ? { ...prev, status: "canceled" } : null));
      toast({
        title: "Batch canceled",
        description: "Your outfit swap batch has been canceled",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to cancel batch",
        description: err.message,
      });
    }
  };

  const refreshBatch = async () => {
    if (!batch?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch fresh batch data
      const updatedBatch = await outfitSwapApi.getBatch(batch.id);
      setBatch(updatedBatch);
      
      // Fetch fresh jobs data
      const { data: batchJobs } = await supabase
        .from("outfit_swap_jobs")
        .select("*")
        .eq("batch_id", batch.id)
        .order("created_at", { ascending: true });
      
      if (batchJobs) {
        setJobs(batchJobs as OutfitSwapJob[]);
      }
      
      toast({
        title: "Status refreshed",
        description: `${updatedBatch.completed_jobs}/${updatedBatch.total_jobs} completed`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to refresh",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBatch(null);
    setJobs([]);
    setError(null);
    setRetryingJobs(new Set());
  };

  const getProgress = () => {
    if (!batch) return 0;
    if (batch.total_jobs === 0) return 0;
    return Math.round(
      ((batch.completed_jobs + batch.failed_jobs) / batch.total_jobs) * 100
    );
  };

  const retryJob = async (jobId: string) => {
    try {
      setRetryingJobs(prev => new Set(prev).add(jobId));
      
      const newJob = await outfitSwapApi.retryJob(jobId);
      
      // Update the jobs array - replace failed job with new job
      setJobs(prevJobs => 
        prevJobs.map(j => j.id === jobId ? newJob : j)
      );
      
      toast({
        title: "Retry started",
        description: "The failed generation is being retried...",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to retry",
        description: err.message,
      });
    } finally {
      setRetryingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  return {
    batch,
    jobs,
    loading,
    error,
    createBatch,
    loadBatch,
    cancelBatch,
    reset,
    getProgress,
    refreshBatch,
    retryJob,
    retryingJobs,
  };
};
