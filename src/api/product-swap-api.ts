import { supabase } from "@/integrations/supabase/client";

export interface ProductSwapJob {
  id: string;
  user_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  reference_image_url: string;
  new_product_image_url: string;
  audience: string;
  scenario: string;
  settings: any;
  result_image_id: string | null;
  result_url: string | null;
  storage_path: string | null;
  credits_spent: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface CreateProductSwapInput {
  referenceImageUrl: string;
  referenceImageId?: string | null;
  newProductImageUrl: string;
  newProductImageId?: string | null;
  audience: string;
  scenario: string;
  settings: {
    aspect_ratio: string;
    resolution_tier: "small" | "medium" | "large";
    size: string;
  };
}

export const productSwapApi = {
  async createJob(input: CreateProductSwapInput): Promise<{ jobId: string; imageUrl: string; resultImageId: string | null; }> {
    const { data, error } = await supabase.functions.invoke("product-swap", { body: input });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Product swap failed");
    return { jobId: data.jobId, imageUrl: data.imageUrl, resultImageId: data.resultImageId };
  },

  async getJob(jobId: string): Promise<ProductSwapJob | null> {
    const { data, error } = await supabase
      .from("product_swap_jobs" as any)
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw error;
    return (data as any) || null;
  },
};
