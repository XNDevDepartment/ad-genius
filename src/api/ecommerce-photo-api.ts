import { supabase } from "@/integrations/supabase/client";

export interface EcommercePhotoJob {
  id: string;
  user_id: string;
  result_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  public_url: string | null;
  storage_path: string | null;
  prompt_used: string | null;
  error: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const ecommercePhotoApi = {
  async createEcommercePhoto(resultId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "createEcommercePhoto",
        resultId,
      },
    });

    if (error) throw error;
    return data.ecommercePhoto as EcommercePhotoJob;
  },

  async getEcommercePhoto(photoId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "getEcommercePhoto",
        photoId,
      },
    });

    if (error) throw error;
    return data.ecommercePhoto as EcommercePhotoJob;
  },

  async cancelEcommercePhoto(photoId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "cancelEcommercePhoto",
        photoId,
      },
    });

    if (error) throw error;
    return data;
  },

  subscribeToEcommercePhoto(photoId: string, callback: (photo: EcommercePhotoJob) => void) {
    const channel = supabase
      .channel(`ecommerce-photo-${photoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_swap_ecommerce_photos",
          filter: `id=eq.${photoId}`,
        },
        (payload) => {
          callback(payload.new as EcommercePhotoJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
