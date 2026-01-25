import { supabase } from "@/integrations/supabase/client";

export interface GarmentSlots {
  top?: string;
  bottom?: string;
  shoes?: string;
  accessory_1?: string;
  accessory_2?: string;
}

export interface OutfitCreatorJob {
  id: string;
  user_id: string;
  base_model_id: string;
  garments: GarmentSlots;
  settings: any;
  metadata: any;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  error: string | null;
  progress: number;
  current_pass: number;
  total_passes: number;
  intermediate_images: string[];
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface OutfitCreatorResult {
  id: string;
  job_id: string;
  user_id: string;
  public_url: string;
  storage_path: string;
  png_url: string | null;
  jpg_url: string | null;
  metadata: any;
  created_at: string;
}

export interface GarmentAnalysis {
  slot: 'top' | 'bottom' | 'shoes' | 'accessory';
  type: string;
  color: string;
  style: string;
  material: string;
  keyFeatures: string;
}

export const outfitCreatorApi = {
  async createJob(baseModelId: string, garments: GarmentSlots, settings: any = {}) {
    const { data, error } = await supabase.functions.invoke("outfit-creator", {
      body: {
        action: "createJob",
        baseModelId,
        garments,
        settings,
      },
    });

    if (error) throw error;
    return data.job as OutfitCreatorJob;
  },

  async getJob(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-creator", {
      body: {
        action: "getJob",
        jobId,
      },
    });

    if (error) throw error;
    return data.job as OutfitCreatorJob;
  },

  async getResult(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-creator", {
      body: {
        action: "getResult",
        jobId,
      },
    });

    if (error) throw error;
    return data.result as OutfitCreatorResult;
  },

  async cancelJob(jobId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-creator", {
      body: {
        action: "cancelJob",
        jobId,
      },
    });

    if (error) throw error;
    return data;
  },

  async analyzeGarment(sourceImageId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-creator", {
      body: {
        action: "analyzeGarment",
        sourceImageId,
      },
    });

    if (error) throw error;
    return {
      analysis: data.analysis as GarmentAnalysis | null,
      suggestedSlot: data.suggestedSlot as string,
      rawText: data.rawText as string,
    };
  },

  subscribeToJob(jobId: string, callback: (job: OutfitCreatorJob) => void) {
    const channel = supabase
      .channel(`outfit-creator-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_creator_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as OutfitCreatorJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToResult(jobId: string, callback: (result: OutfitCreatorResult) => void) {
    const channel = supabase
      .channel(`outfit-creator-result-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "outfit_creator_results",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as OutfitCreatorResult);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
