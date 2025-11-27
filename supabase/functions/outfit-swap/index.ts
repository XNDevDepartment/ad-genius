// outfit-swap/index.ts - Lovable AI v2.0.0
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_MODEL = "gemini-3-pro-image-preview";

const serviceClient = () => createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

if (!LOVABLE_API_KEY) {
  console.error("CRITICAL: LOVABLE_API_KEY is not configured");
}

// Helper function to fetch JSON with timeout
async function fetchWithTimeout(url: string, options: any, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);

  return response;
}

// Fallback prompts
const FALLBACK_PROMPT_MALE = `Create a professional fashion photography composition showing a male model wearing the garment from the reference image.

GARMENT REFERENCE:
- Study the garment design, patterns, colors, and fabric details from the reference image
- Reproduce these exact characteristics in the final image

MODEL SPECIFICATIONS:
- Body type: athletic fit
- Pose style: natural professional stance
- Skin tone: natural

STYLING DIRECTION:
- Dress the model in a complete, professionally styled outfit
- The reference garment should be the hero piece
- Add appropriate coordinating pieces (pants, shoes, accessories) as needed for a polished look
- Ensure all garments fit naturally on the model's body

PHOTOGRAPHY STYLE:
- Professional e-commerce/catalog photography aesthetic
- Studio lighting with soft, even illumination
- Clean white or light neutral background
- Sharp focus emphasizing fabric texture and garment details
- Natural, confident modeling posture
- Commercial-quality resolution suitable for retail use

OUTPUT REQUIREMENTS:
- Full-body or three-quarter shot showing the complete outfit
- The reference garment must be clearly visible and accurately represented
- Professional styling appropriate for fashion retail presentation`;

const FALLBACK_PROMPT_FEMALE = `Create a professional fashion photography composition showing a female model wearing the garment from the reference image.

GARMENT REFERENCE:
- Study the garment design, patterns, colors, and fabric details from the reference image
- Reproduce these exact characteristics in the final image

MODEL SPECIFICATIONS:
- Body type: athletic fit
- Pose style: natural professional stance
- Skin tone: natural

STYLING DIRECTION:
- Dress the model in a complete, professionally styled outfit
- The reference garment should be the hero piece
- Add appropriate coordinating pieces (pants, shoes, accessories) as needed for a polished look
- Ensure all garments fit naturally on the model's body

PHOTOGRAPHY STYLE:
- Professional e-commerce/catalog photography aesthetic
- Studio lighting with soft, even illumination
- Clean white or light neutral background
- Sharp focus emphasizing fabric texture and garment details
- Natural, confident modeling posture
- Commercial-quality resolution suitable for retail use

OUTPUT REQUIREMENTS:
- Full-body or three-quarter shot showing the complete outfit
- The reference garment must be clearly visible and accurately represented
- Professional styling appropriate for fashion retail presentation`;

async function generateOutfitSwapImage(baseModelUrl: string, garmentUrl: string, baseModel: any): Promise<string> {
  console.log("Generating outfit swap with Lovable AI...");
  
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
              text: `Create a professional fashion photography composition showing a model wearing the garment from the reference image.

GARMENT REFERENCE:
- Study the garment design, patterns, colors, and fabric details from the reference image
- Reproduce these exact characteristics in the final image

MODEL SPECIFICATIONS:
- Body type: ${baseModel.metadata?.bodyType || 'athletic fit'}
- Gender presentation: ${baseModel.metadata?.gender || 'neutral'}  
- Pose style: ${baseModel.metadata?.poseType || 'natural professional stance'}
- Skin tone: ${baseModel.metadata?.skinTone || 'natural'}

STYLING DIRECTION:
- Dress the model in a complete, professionally styled outfit
- The reference garment should be the hero piece
- Add appropriate coordinating pieces (pants, shoes, accessories) as needed for a polished look
- Ensure all garments fit naturally on the model's body

PHOTOGRAPHY STYLE:
- Professional e-commerce/catalog photography aesthetic
- Studio lighting with soft, even illumination
- Clean white or light neutral background
- Sharp focus emphasizing fabric texture and garment details
- Natural, confident modeling posture
- Commercial-quality resolution suitable for retail use

OUTPUT REQUIREMENTS:
- Full-body or three-quarter shot showing the complete outfit
- The reference garment must be clearly visible and accurately represented
- Professional styling appropriate for fashion retail presentation`,
            },
            {
              type: "image_url",
              image_url: { url: baseModelUrl },
            },
            {
              type: "image_url",
              image_url: { url: garmentUrl },
            },
          ],
        },
      ],
      modalities: ["image"],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("AI Gateway error:", aiResponse.status, errorText);
    
    if (aiResponse.status === 429) {
      throw new Error("AI service is currently at capacity. Please try again in a few moments.");
    } else if (aiResponse.status === 402) {
      throw new Error("AI service quota exceeded. Please contact support.");
    }
    
    throw new Error(`AI service error (${aiResponse.status}). Please try again.`);
  }

  const aiData = await aiResponse.json();
  const images = aiData.choices?.[0]?.message?.images;
  const finishReason = aiData.choices?.[0]?.finish_reason;
  
  if (finishReason === "IMAGE_OTHER" || finishReason === "SAFETY") {
    console.error("Gemini safety filter triggered:", finishReason);
    throw new Error("Unable to generate image for this garment. The content may have been flagged by our safety filters. Try a different garment or adjust the description.");
  }
  
  if (!images || images.length === 0) {
    console.error("No images in AI response:", JSON.stringify(aiData, null, 2));
    throw new Error("Image generation was unsuccessful. Please try again or contact support if the issue persists.");
  }

  const imageUrl = images[0].image_url?.url;
  if (!imageUrl) {
    throw new Error("No image URL in response");
  }

  return imageUrl;
}

// Update processOutfitSwap to handle errors better
async function processOutfitSwap(jobId: string) {
  const supabase = serviceClient();
  console.log("Processing outfit swap job:", jobId);

  try {
    await supabase
      .from("outfit_swap_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq("id", jobId);

    const { data: job } = await supabase
      .from("outfit_swap_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error("Job not found");

    const { data: baseModel, error: baseModelError } = await supabase
      .from("outfit_swap_base_models")
      .select("*")
      .eq("id", job.base_model_id)
      .single();

    if (baseModelError || !baseModel) {
      console.error("Error fetching base model:", baseModelError);
      throw new Error("Failed to retrieve base model details.");
    }

    const { data: garment, error: garmentError } = await supabase
      .from("garments")
      .select("*")
      .eq("id", job.garment_id)
      .single();

    if (garmentError || !garment) {
      console.error("Error fetching garment:", garmentError);
      throw new Error("Failed to retrieve garment details.");
    }

    const baseModelUrl = baseModel.public_url;
    const garmentUrl = garment.image_url;

    if (!baseModelUrl || !garmentUrl) {
      throw new Error("Missing image URLs for base model or garment.");
    }
    
    // Generate image
    const imageUrl = await generateOutfitSwapImage(baseModelUrl, garmentUrl, baseModel);
    
    // Upload the image to storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Error fetching generated image:", imageResponse.status, imageResponse.statusText);
      throw new Error("Failed to fetch generated image from AI service.");
    }
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageArray = new Uint8Array(imageBuffer);

    const timestamp = Date.now();
    const imageName = `outfit-swap-${jobId}-${timestamp}.png`;
    const imagePath = `outfit-swap-results/${imageName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from("outfit-swap")
      .upload(imagePath, imageArray, {
        contentType: "image/png",
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      throw new Error("Failed to upload generated image to storage.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("outfit-swap")
      .getPublicUrl(imagePath);

    const publicImageUrl = publicUrlData.publicUrl;

    // Save the result to the database
    await supabase
      .from("outfit_swap_results")
      .insert({
        job_id: jobId,
        image_url: publicImageUrl,
        storage_path: imagePath,
      });

    // Update job status
    await supabase
      .from("outfit_swap_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        progress: 100,
      })
      .eq("id", jobId);
    
  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);

    // Determine error type for better user feedback
    let errorType = "generation_error";
    let shouldRefund = false;
    
    if (error.message.includes("safety filter") || error.message.includes("Unable to generate")) {
      errorType = "safety_filter";
      shouldRefund = true;
    } else if (error.message.includes("capacity") || error.message.includes("429")) {
      errorType = "rate_limit";
      shouldRefund = true;
    } else if (error.message.includes("quota exceeded") || error.message.includes("402")) {
      errorType = "quota_exceeded";
      shouldRefund = false;
    }

    await supabase
      .from("outfit_swap_jobs")
      .update({
        status: "failed",
        error: error.message,
        finished_at: new Date().toISOString(),
        metadata: { 
          ...job.metadata, 
          error_type: errorType,
          error_timestamp: new Date().toISOString(),
        },
      })
      .eq("id", jobId);

    // Refund credits if appropriate
    if (shouldRefund && job.user_id) {
      console.log(`Refunding 1 credit to user ${job.user_id} due to ${errorType}`);
      await supabase.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: 1,
        p_reason: `outfit_swap_refund_${errorType}`,
      });
    }

    if (job.batch_id) {
      await supabase.rpc("increment_batch_failed_jobs", { batch_id_param: job.batch_id });
    }

    throw error;
  }
}

// Similar updates for photoshoot and e-commerce functions...

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    if (action === "createJob") {
      const { sourcePersonId, sourceGarmentId, settings, userId } = params;
      console.log("Creating outfit swap job", sourcePersonId, sourceGarmentId, settings);

      // Create job in database
      const supabase = serviceClient();
      const { data: job, error: jobError } = await supabase
        .from("outfit_swap_jobs")
        .insert({
          user_id: userId,
          base_model_id: sourcePersonId,
          garment_id: sourceGarmentId,
          settings: settings,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error("Error creating job:", jobError);
        throw new Error("Failed to create outfit swap job.");
      }

      // Start processing the job
      Deno.cron("processOutfitSwap", "0 * * * *", () => {
        processOutfitSwap(job.id);
      });

      return new Response(JSON.stringify({ data: job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "cancelJob") {
      const { jobId } = params;
      console.log("Cancelling outfit swap job", jobId);

      // Update job status to cancelled
      const supabase = serviceClient();
      const { error: jobError } = await supabase
        .from("outfit_swap_jobs")
        .update({
          status: "canceled",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (jobError) {
        console.error("Error cancelling job:", jobError);
        throw new Error("Failed to cancel outfit swap job.");
      }

      return new Response(JSON.stringify({ data: { status: "canceled" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error: any) {
    console.error("Outfit swap error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
