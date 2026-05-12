import { useState } from "react";
import { productSwapApi, type CreateProductSwapInput } from "@/api/product-swap-api";
import { useToast } from "@/hooks/use-toast";

type Stage = "setup" | "processing" | "results";

export function useProductSwap() {
  const [stage, setStage] = useState<Stage>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const createJob = async (input: CreateProductSwapInput) => {
    setLoading(true);
    setError(null);
    setStage("processing");
    try {
      const res = await productSwapApi.createJob(input);
      setJobId(res.jobId);
      setResultUrl(res.imageUrl);
      setStage("results");
      toast({ title: "Product swap completed", description: "Your image is ready." });
      return res;
    } catch (err: any) {
      const msg = err?.message || "Product swap failed";
      setError(msg);
      setStage("setup");
      toast({ variant: "destructive", title: "Product swap failed", description: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage("setup");
    setError(null);
    setResultUrl(null);
    setJobId(null);
  };

  return { stage, loading, error, resultUrl, jobId, createJob, reset };
}
