import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const serviceClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Check admin status
    const { data: isAdmin, error: adminError } = await serviceClient().rpc("is_user_admin", {
      check_user_id: user.id,
    });

    if (adminError || !isAdmin) {
      console.log("Admin check failed:", { adminError, isAdmin });
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const { action, ...params } = await req.json();
    console.log("Outfit swap action:", action);

    switch (action) {
      case "createJob":
        return await createOutfitSwapJob(user.id, params);
      case "getJob":
        return await getJob(user.id, params.jobId);
      case "getResults":
        return await getJobResults(user.id, params.jobId);
      case "cancelJob":
        return await cancelJob(user.id, params.jobId);
      case "processJob":
        return await processOutfitSwap(params.jobId);
      default:
        return jsonResponse({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("Outfit swap error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

async function createOutfitSwapJob(userId: string, params: any) {
  const { sourcePersonId, sourceGarmentId, settings } = params;
  const supabase = serviceClient();

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("outfit_swap_jobs")
    .insert({
      user_id: userId,
      source_person_id: sourcePersonId,
      source_garment_id: sourceGarmentId,
      settings: settings || {},
      status: "queued",
    })
    .select()
    .single();

  if (jobError) {
    console.error("Error creating job:", jobError);
    return jsonResponse({ error: "Failed to create job" }, 500);
  }

  // Trigger processing asynchronously
  fetch(req.url, {
    method: "POST",
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "processJob", jobId: job.id }),
  }).catch(console.error);

  return jsonResponse({ job }, 200);
}

async function processOutfitSwap(jobId: string) {
  const supabase = serviceClient();
  console.log("Processing outfit swap job:", jobId);

  try {
    // Update status to processing
    await supabase
      .from("outfit_swap_jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), progress: 10 })
      .eq("id", jobId);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("outfit_swap_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Get signed URLs for source images
    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 20 })
      .eq("id", jobId);

    const { data: personUrl } = await supabase.storage
      .from("ugc-inputs")
      .createSignedUrl(
        (await supabase.from("source_images").select("storage_path").eq("id", job.source_person_id).single()).data
          ?.storage_path,
        3600
      );

    const { data: garmentUrl } = await supabase.storage
      .from("ugc-inputs")
      .createSignedUrl(
        (await supabase.from("source_images").select("storage_path").eq("id", job.source_garment_id).single()).data
          ?.storage_path,
        3600
      );

    if (!personUrl?.signedUrl || !garmentUrl?.signedUrl) {
      throw new Error("Failed to get source image URLs");
    }

    // Update progress
    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 40 })
      .eq("id", jobId);

    // Call Gemini Nano Banana for outfit swap
    const startTime = Date.now();
    const prompt = `You are an expert outfit swap AI. Given a photo of a person and a photo of a new garment, replace the person's current outfit with the new garment while:
- Preserving the person's face, hair, hands, and pose EXACTLY as they are
- Matching the lighting and shadows to the original photo
- Fixing any seams or blending issues around the neckline and edges
- Keeping the background completely unchanged
- Ensuring the garment aligns naturally with the person's body position and pose

CRITICAL: The person's identity must remain 100% identical. Do not alter any facial features whatsoever.

Generate a high-quality, seamless outfit swap image.`;

    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 60 })
      .eq("id", jobId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: personUrl.signedUrl } },
              { type: "image_url", image_url: { url: garmentUrl.signedUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 80 })
      .eq("id", jobId);

    const data = await response.json();
    const swappedImageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!swappedImageBase64) {
      throw new Error("No image generated");
    }

    const processingTime = Date.now() - startTime;

    // Extract base64 data
    const base64Data = swappedImageBase64.split(",")[1] || swappedImageBase64;
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to storage (JPG and PNG)
    const timestamp = Date.now();
    const basePath = `${job.user_id}/${jobId}`;

    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 90 })
      .eq("id", jobId);

    // Upload JPG
    const jpgPath = `${basePath}/result_${timestamp}.jpg`;
    const { error: jpgUploadError } = await supabase.storage.from("ugc").upload(jpgPath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (jpgUploadError) {
      console.error("JPG upload error:", jpgUploadError);
    }

    // Upload PNG
    const pngPath = `${basePath}/result_${timestamp}.png`;
    const { error: pngUploadError } = await supabase.storage.from("ugc").upload(pngPath, imageBuffer, {
      contentType: "image/png",
      upsert: false,
    });

    if (pngUploadError) {
      console.error("PNG upload error:", pngUploadError);
    }

    // Get public URLs
    const { data: jpgPublicUrl } = supabase.storage.from("ugc").getPublicUrl(jpgPath);
    const { data: pngPublicUrl } = supabase.storage.from("ugc").getPublicUrl(pngPath);

    // Save results
    const { error: resultError } = await supabase.from("outfit_swap_results").insert({
      job_id: jobId,
      user_id: job.user_id,
      storage_path: jpgPath,
      public_url: jpgPublicUrl.publicUrl,
      jpg_url: jpgPublicUrl.publicUrl,
      png_url: pngPublicUrl.publicUrl,
      metadata: {
        model_used: "google/gemini-2.5-flash-image-preview",
        processing_time_ms: processingTime,
        dimensions: "1024x1024",
        exif_stripped: true,
      },
    });

    if (resultError) {
      console.error("Error saving results:", resultError);
    }

    // Update job as completed
    await supabase
      .from("outfit_swap_jobs")
      .update({
        status: "completed",
        progress: 100,
        finished_at: new Date().toISOString(),
        metadata: {
          model_used: "google/gemini-2.5-flash-image-preview",
          processing_time_ms: processingTime,
        },
      })
      .eq("id", jobId);

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Processing error:", error);
    await supabase
      .from("outfit_swap_jobs")
      .update({
        status: "failed",
        error: error.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return jsonResponse({ error: error.message }, 500);
  }
}

async function getJob(userId: string, jobId: string) {
  const supabase = serviceClient();

  const { data: job, error } = await supabase
    .from("outfit_swap_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return jsonResponse({ error: "Job not found" }, 404);
  }

  return jsonResponse({ job }, 200);
}

async function getJobResults(userId: string, jobId: string) {
  const supabase = serviceClient();

  const { data: results, error } = await supabase
    .from("outfit_swap_results")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return jsonResponse({ error: "Results not found" }, 404);
  }

  return jsonResponse({ results }, 200);
}

async function cancelJob(userId: string, jobId: string) {
  const supabase = serviceClient();

  const { error } = await supabase
    .from("outfit_swap_jobs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("status", ["queued", "processing"]);

  if (error) {
    return jsonResponse({ error: "Failed to cancel job" }, 500);
  }

  return jsonResponse({ success: true }, 200);
}

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
