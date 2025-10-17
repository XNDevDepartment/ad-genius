import { useState, useEffect } from "react";
import { outfitSwapApi, OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { useToast } from "@/hooks/use-toast";

type Stage = "setup" | "processing" | "results";

export const useOutfitSwap = () => {
  const [job, setJob] = useState<OutfitSwapJob | null>(null);
  const [results, setResults] = useState<OutfitSwapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("setup");
  const { toast } = useToast();

  // Subscribe to job updates
  useEffect(() => {
    if (!job?.id) return;

    const unsubscribe = outfitSwapApi.subscribeToJob(job.id, (updatedJob) => {
      setJob(updatedJob);

      if (updatedJob.status === "completed") {
        setStage("results");
        loadResults(updatedJob.id);
      } else if (updatedJob.status === "failed") {
        setError(updatedJob.error || "Job failed");
        toast({
          variant: "destructive",
          title: "Outfit swap failed",
          description: updatedJob.error || "An error occurred",
        });
      }
    });

    return unsubscribe;
  }, [job?.id]);

  // Subscribe to results
  useEffect(() => {
    if (!job?.id) return;

    const unsubscribe = outfitSwapApi.subscribeToResults(job.id, (newResult) => {
      setResults(newResult);
      setStage("results");
    });

    return unsubscribe;
  }, [job?.id]);

  const createJob = async (sourcePersonId: string, sourceGarmentId: string, settings: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      const newJob = await outfitSwapApi.createJob(sourcePersonId, sourceGarmentId, settings);
      setJob(newJob);
      setStage("processing");

      toast({
        title: "Outfit swap started",
        description: "Your outfit swap is being processed...",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Failed to start outfit swap",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (jobId: string) => {
    try {
      const jobResults = await outfitSwapApi.getResults(jobId);
      setResults(jobResults);
    } catch (err: any) {
      console.error("Failed to load results:", err);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;

    try {
      await outfitSwapApi.cancelJob(job.id);
      setJob((prev) => (prev ? { ...prev, status: "canceled" } : null));
      setStage("setup");
      toast({
        title: "Job canceled",
        description: "Your outfit swap has been canceled",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to cancel job",
        description: err.message,
      });
    }
  };

  const reset = () => {
    setJob(null);
    setResults(null);
    setError(null);
    setStage("setup");
  };

  return {
    job,
    results,
    loading,
    error,
    stage,
    createJob,
    cancelJob,
    reset,
  };
};
