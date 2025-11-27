import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_MODEL = "gemini-3-pro-image-preview";

if (!LOVABLE_API_KEY) {
  console.error("CRITICAL: LOVABLE_API_KEY is not configured");
}

async function isUserAdmin(supabaseClient: any, userId: string): Promise<boolean> {
  const { data, error } = await supabaseClient.rpc('is_user_admin', {
    check_user_id: userId
  });
  if (error) {
    console.error('[ADMIN-CHECK] Error checking admin status:', error);
    return false;
  }
  return data === true;
}

async function uploadAndProcessModel(supabaseClient: any, userId: string, params: any): Promise<any> {
  const { imageDataUrl, metadata, previewMode = false } = params;
  const creditCost = 5;

  if (!previewMode) {
    const { data: creditCheck, error: creditError } = await supabaseClient.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: "upload_base_model"
    });

    if (creditError || !creditCheck?.success) {
      throw new Error(creditCheck?.error || "Insufficient credits");
    }
  }

  try {
    console.log("Calling Lovable AI for background removal...");
    
    const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Create a professional model photo with transparent or solid white background. Remove any existing background while preserving all details of the person including clothing, hair, and body. The person should be cleanly isolated against a pure background suitable for fashion photography compositing.",
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        modalities: ["image"],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Lovable AI error:", {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        body: errorText,
      });
      
      if (geminiResponse.status === 429) {
        throw new Error("AI service is currently at capacity. Please wait a moment and try again.");
      } else if (geminiResponse.status === 402) {
        throw new Error("AI service quota exceeded. Please contact support.");
      } else if (geminiResponse.status === 400) {
        throw new Error("Image format not supported. Please try a different image.");
      }
      
      throw new Error(`Background removal failed (${geminiResponse.status}). Please try a different image or contact support.`);
    }

    const geminiData = await geminiResponse.json();
    const images = geminiData.choices?.[0]?.message?.images;
    const finishReason = geminiData.choices?.[0]?.finish_reason;

    if (finishReason === "IMAGE_OTHER" || finishReason === "SAFETY") {
      console.error("Gemini safety filter triggered:", finishReason);
      throw new Error("Image could not be processed due to content guidelines. Please try a different photo.");
    }

    if (!images || images.length === 0) {
      console.error("No images returned from Lovable AI");
      throw new Error("Background removal was unsuccessful. Please try a different image with a clearer subject.");
    }

    const processedImageUrl = images[0].image_url?.url;
    if (!processedImageUrl) {
      throw new Error("No image URL in response");
    }

    // Convert data URL to base64 for storage
    const processedImageData = processedImageUrl.replace(/^data:image\/\w+;base64,/, '');

    if (previewMode) {
      return new Response(JSON.stringify({
        success: true,
        imageDataUrl: processedImageUrl,
        metadata: metadata,
        creditsDeducted: 0
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Save to storage
    const imageBlob = Uint8Array.from(atob(processedImageData), (c) => c.charCodeAt(0));
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}-${metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;

    const { error: uploadError } = await supabaseClient.storage
      .from("outfit-user-models")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from("outfit-user-models")
      .getPublicUrl(storagePath);

    const { data: baseModel, error: dbError } = await supabaseClient
      .from("outfit_swap_base_models")
      .insert({
        user_id: userId,
        name: metadata.name,
        gender: metadata.gender,
        age_range: metadata.ageRange,
        body_type: metadata.bodyType,
        pose_type: metadata.poseType,
        skin_tone: metadata.skinTone,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        is_system: false,
        is_active: true
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      baseModel
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error: any) {
    const userIsAdmin = await isUserAdmin(supabaseClient, userId);
    if (!previewMode && !userIsAdmin) {
      await supabaseClient.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "upload_base_model_failed"
      });
    }
    throw error;
  }
}

async function generateModelWithAI(supabaseClient: any, userId: string, params: any): Promise<any> {
  const { name, gender, nationality, ageRange, bodyType, height, skinTone, hair, eyes, pose, gentleSmile, previewMode = false } = params;
  const creditCost = 6;

  if (!previewMode) {
    const { data: creditCheck, error: creditError } = await supabaseClient.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: "generate_ai_base_model"
    });

    if (creditError || !creditCheck?.success) {
      throw new Error(creditCheck?.error || "Insufficient credits");
    }
  }

  try {
    const nationalityText = nationality && nationality !== 'not-specified' ? `, ${nationality} features and appearance` : '';
    const smileText = gentleSmile ? ", gentle smile" : "";
    
    const prompt = `Create an image of Photorealistic full-body studio ${gender} model${nationalityText}, age bracket ${ageRange}, height ${height} cm, body type ${bodyType}, skin tone ${skinTone}, hair ${hair.length} ${hair.texture} ${hair.color}, eyes ${eyes}. Pose: ${pose}${smileText}. Wardrobe baseline: seamless neutral-tone fitted bodysuit (no logos/patterns), barefoot. Background: seamless light gray studio. Camera 50mm f/4 ISO200 1/125. Lighting: softbox 45° key + reflector fill, even exposure. Neutral expression, hands relaxed, fingers natural, head to toe visible, clean silhouette. One subject only. Output 2048x3072, sRGB, 300dpi. Negative: only produce model and no more elements in the picture, lowres, blurry, jpeg artifacts, extra limbs, extra fingers, fused fingers, disfigured, distorted proportions, wet/oily skin, cleavage emphasis, lingerie, underwear straps, see-through fabric, strong face shadows, color cast, watermark, logo, text, border.`;

    console.log("Calling Lovable AI for AI model generation...");
    
    const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image"],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Lovable AI error during model generation:", {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        body: errorText,
      });
      
      if (geminiResponse.status === 429) {
        throw new Error("AI service is currently at capacity. Please wait and try again.");
      } else if (geminiResponse.status === 402) {
        throw new Error("AI service quota exceeded. Please contact support.");
      }
      
      throw new Error(`Model generation failed (${geminiResponse.status}). Please try again or contact support.`);
    }

    const geminiData = await geminiResponse.json();
    const images = geminiData.choices?.[0]?.message?.images;
    const finishReason = geminiData.choices?.[0]?.finish_reason;

    if (finishReason === "IMAGE_OTHER" || finishReason === "SAFETY") {
      console.error("AI generation blocked by safety filters:", finishReason);
      throw new Error("Model generation was blocked due to content guidelines. Please adjust parameters and try again.");
    }

    if (!images || images.length === 0) {
      console.error("No images in AI generation response");
      throw new Error("Model generation was unsuccessful. Please try again with different parameters.");
    }

    const generatedImageUrl = images[0].image_url?.url;
    if (!generatedImageUrl) {
      throw new Error("No image URL in response");
    }

    const generatedImageData = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');

    if (previewMode) {
      return new Response(JSON.stringify({
        success: true,
        imageDataUrl: generatedImageUrl,
        metadata: {
          name,
          gender: gender === "non-binary" ? "unisex" : gender,
          ageRange,
          bodyType,
          poseType: pose,
          skinTone
        },
        creditsDeducted: 0
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Save to storage
    const imageBlob = Uint8Array.from(atob(generatedImageData), (c) => c.charCodeAt(0));
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;

    const { error: uploadError } = await supabaseClient.storage
      .from("outfit-user-models")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from("outfit-user-models")
      .getPublicUrl(storagePath);

    const { data: baseModel, error: dbError } = await supabaseClient
      .from("outfit_swap_base_models")
      .insert({
        user_id: userId,
        name,
        gender: gender === "non-binary" ? "unisex" : gender,
        age_range: ageRange,
        body_type: bodyType,
        pose_type: pose,
        skin_tone: skinTone,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        is_system: false,
        is_active: true,
        metadata: {
          height,
          hair,
          eyes,
          nationality,
          gentleSmile,
          generatedWithAI: true
        }
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      baseModel
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error: any) {
    const userIsAdmin = await isUserAdmin(supabaseClient, userId);
    if (!previewMode && !userIsAdmin) {
      await supabaseClient.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "generate_ai_base_model_failed"
      });
    }
    throw error;
  }
}

// ... rest of saveModel function stays the same

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, ...params } = await req.json();

    if (action === "uploadAndProcessModel") {
      return await uploadAndProcessModel(supabaseClient, user.id, params);
    } else if (action === "generateModelWithAI") {
      return await generateModelWithAI(supabaseClient, user.id, params);
    } else if (action === "saveModel") {
      return await saveModel(supabaseClient, user.id, params);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("Error in create-base-model:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
