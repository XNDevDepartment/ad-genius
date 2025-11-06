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
    },
    previewMode = true
  ) {
    const { data, error } = await supabase.functions.invoke("create-base-model", {
      body: {
        action: "uploadAndProcessModel",
        imageDataUrl,
        metadata,
        previewMode,
      },
    });

    if (error) throw error;
    return previewMode ? data : data.baseModel;
  },

  async generateModelWithAI(
    options: {
      name: string;
      gender: string;
      nationality: string;
      ageRange: string;
      bodyType: string;
      height: number;
      skinTone: string;
      hair: { length: string; texture: string; color: string };
      eyes: string;
      pose: string;
      gentleSmile?: boolean;
    },
    previewMode = true
  ) {
    const { data, error } = await supabase.functions.invoke("create-base-model", {
      body: {
        action: "generateModelWithAI",
        ...options,
        previewMode,
      },
    });

    if (error) throw error;
    return previewMode ? data : data.baseModel;
  },

  async saveModelFromPreview(
    imageDataUrl: string,
    metadata: {
      name: string;
      gender?: string;
      ageRange?: string;
      bodyType?: string;
      poseType?: string;
      skinTone?: string;
    },
    isAIGenerated = false
  ) {
    const { data, error } = await supabase.functions.invoke("create-base-model", {
      body: {
        action: "saveModel",
        imageDataUrl,
        metadata,
        isAIGenerated,
      },
    });

    if (error) throw error;
    return data.baseModel;
  },
};
