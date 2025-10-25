import { supabase } from "@/integrations/supabase/client";

export interface OutfitSwapJob {
  id: string;
  user_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  source_person_id: string;
  source_garment_id: string;
  settings: any;
  metadata: any;
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface OutfitSwapResult {
  id: string;
  job_id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  jpg_url: string | null;
  png_url: string | null;
  metadata: any;
  created_at: string;
}

export interface OutfitSwapBatch {
  id: string;
  user_id: string;
  base_model_id: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  metadata: any;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const outfitSwapApi = {
  async createJob(sourcePersonId: string, sourceGarmentId: string, settings: any = {}) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "createJob",
        sourcePersonId,
        sourceGarmentId,
        settings,
      },
    });

    if (error) throw error;
    return data.job as OutfitSwapJob;
  },

  async getJob(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "getJob",
        jobId,
      },
    });

    if (error) throw error;
    return data.job as OutfitSwapJob;
  },

  async getResults(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "getResults",
        jobId,
      },
    });

    if (error) throw error;
    return data.results as OutfitSwapResult;
  },

  async cancelJob(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "cancelJob",
        jobId,
      },
    });

    if (error) throw error;
    return data;
  },

  async createBatchJob(baseModelId: string, garmentIds: string[], settings: any = {}) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "createBatchJob",
        baseModelId,
        garmentIds,
        settings,
      },
    });

    if (error) throw error;
    return data as { batch: OutfitSwapBatch; jobs: OutfitSwapJob[] };
  },

  async getBatch(batchId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "getBatch",
        batchId,
      },
    });

    if (error) throw error;
    return data.batch as OutfitSwapBatch;
  },

  async cancelBatch(batchId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "cancelBatch",
        batchId,
      },
    });

    if (error) throw error;
    return data;
  },

  subscribeToJob(jobId: string, callback: (job: OutfitSwapJob) => void) {
    const channel = supabase
      .channel(`outfit-swap-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_swap_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as OutfitSwapJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToResults(jobId: string, callback: (result: OutfitSwapResult) => void) {
    const channel = supabase
      .channel(`outfit-swap-result-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "outfit_swap_results",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as OutfitSwapResult);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToBatch(batchId: string, callback: (batch: OutfitSwapBatch) => void) {
    const channel = supabase
      .channel(`outfit-swap-batch-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_swap_batches",
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          callback(payload.new as OutfitSwapBatch);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToBatchJobs(batchId: string, callback: (job: OutfitSwapJob) => void) {
    const channel = supabase
      .channel(`outfit-swap-batch-jobs-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_swap_jobs",
          filter: `batch_id=eq.${batchId}`,
        },
        (payload) => {
          callback(payload.new as OutfitSwapJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
