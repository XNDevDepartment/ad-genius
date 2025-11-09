import { supabase } from "@/integrations/supabase/client";

export interface PhotoshootJob {
  id: string;
  user_id: string;
  result_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  image_1_url: string | null;
  image_2_url: string | null;
  image_3_url: string | null;
  image_4_url: string | null;
  image_1_path: string | null;
  image_2_path: string | null;
  image_3_path: string | null;
  image_4_path: string | null;
  metadata: any;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const photoshootApi = {
  async createPhotoshoot(resultId: string, selectedAngles: string[], backImageUrl?: string | null) {
    const body: any = { action: "createPhotoshoot", resultId, selectedAngles };
    if (backImageUrl) body.backImageUrl = backImageUrl;

    const { data, error } = await supabase.functions.invoke("outfit-swap", { body });
    if (error) throw error;
    return data.photoshoot as PhotoshootJob;
  },

  async getPhotoshoot(photoshootId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "getPhotoshoot",
        photoshootId,
      },
    });

    if (error) throw error;
    return data.photoshoot as PhotoshootJob;
  },

  async cancelPhotoshoot(photoshootId: string) {
    const { data, error } = await supabase.functions.invoke("outfit-swap", {
      body: {
        action: "cancelPhotoshoot",
        photoshootId,
      },
    });

    if (error) throw error;
    return data;
  },

  subscribeToPhotoshoot(photoshootId: string, callback: (photoshoot: PhotoshootJob) => void) {
    const channel = supabase
      .channel(`photoshoot-${photoshootId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "outfit_swap_photoshoots",
          filter: `id=eq.${photoshootId}`,
        },
        (payload) => {
          callback(payload.new as PhotoshootJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
