import { supabase } from "@/integrations/supabase/client";

export const baseModelApi = {
  async uploadAndProcessModel(
    imageDataUrl: string,
    metadata: {
      name: string;
      gender?: string;
      ageRange?: string;
      bodyType?: string;
      poseType?: string;
      skinTone?: string;
    }
  ) {
    const { data, error } = await supabase.functions.invoke("create-base-model", {
      body: {
        action: "uploadAndProcessModel",
        imageDataUrl,
        metadata,
      },
    });

    if (error) throw error;
    return data.baseModel;
  },

  async generateModelWithAI(options: {
    name: string;
    gender: string;
    ageRange: string;
    bodyType: string;
    height: number;
    skinTone: string;
    hair: { length: string; texture: string; color: string };
    eyes: string;
    pose: string;
    gentleSmile?: boolean;
  }) {
    const { data, error } = await supabase.functions.invoke("create-base-model", {
      body: {
        action: "generateModelWithAI",
        ...options,
      },
    });

    if (error) throw error;
    return data.baseModel;
  },
};
