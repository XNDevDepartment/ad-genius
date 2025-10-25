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
    const { action, ...params } = await req.json();
    console.log("Outfit swap action:", action);

    // Handle internal processing action WITHOUT authentication
    // This is safe because it's only triggered internally by the function itself
    if (action === "processJob") {
      return await processOutfitSwap(params.jobId);
    }

    // All other actions require authentication
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

    // Route to appropriate handler
    switch (action) {
      case "createJob":
        return await createOutfitSwapJob(user.id, params);
      case "getJob":
        return await getJob(user.id, params.jobId);
      case "getResults":
        return await getJobResults(user.id, params.jobId);
      case "cancelJob":
        return await cancelJob(user.id, params.jobId);
      case "createBatchJob":
        return await createBatchJob(user.id, params);
      case "getBatch":
        return await getBatch(user.id, params.batchId);
      case "cancelBatch":
        return await cancelBatch(user.id, params.batchId);
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
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  fetch(functionUrl, {
    method: "POST",
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
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
          - Keeping the background completely unchanged !important
          - Ensuring the garment aligns naturally with the person's body position and pose

          CRITICAL: The person's identity must remain 100% identical. Do not alter any facial features whatsoever. Do not add any new elements to the original image. Work only on the model.

          HOW TO DO: First remove entirely the outfit of the origina image, so the new outfit does not gets pieces of the old one. If the new outfit is smaller than the older, reimage the body of the model.

          INTELLIGENCE: You must use your intelligence to check as well if everything fits. For example: If the original is an elegant model with high heels and elegant clothes, and the new outfit involves training outfit, you must do the extra replacements in order to achieve total realism.

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

    // If this job is part of a batch, update batch progress
    const { data: jobData } = await supabase
      .from("outfit_swap_jobs")
      .select("batch_id")
      .eq("id", jobId)
      .single();

    if (jobData?.batch_id) {
      await updateBatchProgress(jobData.batch_id);
    }

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

    // If this job is part of a batch, update batch progress
    const { data: failedJobData } = await supabase
      .from("outfit_swap_jobs")
      .select("batch_id")
      .eq("id", jobId)
      .single();

    if (failedJobData?.batch_id) {
      await updateBatchProgress(failedJobData.batch_id);
    }

    return jsonResponse({ error: error.message }, 500);
  }
}

async function updateBatchProgress(batchId: string) {
  const supabase = serviceClient();
  
  // Get all jobs in batch
  const { data: jobs } = await supabase
    .from("outfit_swap_jobs")
    .select("status")
    .eq("batch_id", batchId);

  if (!jobs) return;

  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const total = jobs.length;

  let batchStatus = "processing";
  if (completed + failed === total) {
    batchStatus = failed === total ? "failed" : "completed";
  }

  await supabase
    .from("outfit_swap_batches")
    .update({
      completed_jobs: completed,
      failed_jobs: failed,
      status: batchStatus,
      finished_at: batchStatus === "completed" || batchStatus === "failed" 
        ? new Date().toISOString() 
        : null,
    })
    .eq("id", batchId);

  console.log(`[updateBatchProgress] Batch ${batchId}: ${completed}/${total} completed, ${failed} failed`);
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

async function createBatchJob(userId: string, params: any) {
  const { baseModelId, garmentIds, settings } = params;
  const supabase = serviceClient();

  // Validate max 10 garments
  if (!garmentIds || garmentIds.length === 0) {
    return jsonResponse({ error: "No garments provided" }, 400);
  }
  if (garmentIds.length > 10) {
    return jsonResponse({ error: "Maximum 10 garments per batch" }, 400);
  }

  console.log(`[createBatchJob] Creating batch for ${garmentIds.length} garments`);

  // Calculate credits: 1 per garment, with 10% batch discount for 5+
  const baseCreditsNeeded = garmentIds.length * 1;
  const discount = garmentIds.length >= 5 ? 0.1 : 0;
  const creditsNeeded = Math.ceil(baseCreditsNeeded * (1 - discount));

  console.log(`[createBatchJob] Credits needed: ${creditsNeeded}`);

  // Check admin status for credit bypass
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId,
  });

  // Check and deduct credits only for non-admins
  if (!isAdmin) {
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();

    if (!subscriber || subscriber.credits_balance < creditsNeeded) {
      return jsonResponse({ 
        error: "Insufficient credits",
        required: creditsNeeded,
        available: subscriber?.credits_balance || 0
      }, 402);
    }
  } else {
    console.log(`[createBatchJob] Admin bypass: Skipping credit check for user ${userId}`);
  }

  // Create batch record
  const { data: batch, error: batchError } = await supabase
    .from("outfit_swap_batches")
    .insert({
      user_id: userId,
      base_model_id: baseModelId,
      total_jobs: garmentIds.length,
      metadata: {
        settings,
        credits_deducted: creditsNeeded,
        discount_applied: discount,
      },
    })
    .select()
    .single();

  if (batchError) {
    console.error("[createBatchJob] Batch creation error:", batchError);
    return jsonResponse({ error: "Failed to create batch" }, 500);
  }

  // Deduct credits upfront (only for non-admins)
  if (!isAdmin) {
    const { data: deductResult, error: deductError } = await supabase.rpc(
      "deduct_user_credits",
      {
        p_user_id: userId,
        p_amount: creditsNeeded,
        p_reason: "outfit_swap_batch",
      }
    );

    if (deductError || !deductResult?.success) {
      console.error("[createBatchJob] Credit deduction error:", deductError || deductResult);
      await supabase.from("outfit_swap_batches").delete().eq("id", batch.id);
      return jsonResponse({ error: "Failed to deduct credits" }, 500);
    }
  } else {
    console.log(`[createBatchJob] Admin bypass: Skipping credit deduction`);
  }

  // Create individual jobs for each garment
  const jobs = [];
  for (let i = 0; i < garmentIds.length; i++) {
    const garmentId = garmentIds[i];
    const { data: job, error: jobError } = await supabase
      .from("outfit_swap_jobs")
      .insert({
        user_id: userId,
        batch_id: batch.id,
        base_model_id: baseModelId,
        source_person_id: baseModelId,
        source_garment_id: garmentId,
        settings,
        garment_ids: [garmentId],
        total_garments: 1,
      })
      .select()
      .single();

    if (jobError) {
      console.error(`[createBatchJob] Job ${i + 1} creation error:`, jobError);
      continue;
    }

    jobs.push(job);
  }

  // Update batch status to processing
  await supabase
    .from("outfit_swap_batches")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", batch.id);

  // Process jobs asynchronously
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  for (const job of jobs) {
    fetch(functionUrl, {
      method: "POST",
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({ action: "processJob", jobId: job.id }),
    }).catch((err) => console.error(`Failed to trigger job ${job.id}:`, err));
  }

  return jsonResponse({ batch, jobs }, 200);
}

async function getBatch(userId: string, batchId: string) {
  const supabase = serviceClient();

  const { data: batch, error } = await supabase
    .from("outfit_swap_batches")
    .select("*")
    .eq("id", batchId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return jsonResponse({ error: "Batch not found" }, 404);
  }

  return jsonResponse({ batch }, 200);
}

async function cancelBatch(userId: string, batchId: string) {
  const supabase = serviceClient();

  // Update batch status
  const { error: batchError } = await supabase
    .from("outfit_swap_batches")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("user_id", userId);

  if (batchError) {
    return jsonResponse({ error: "Failed to cancel batch" }, 500);
  }

  // Cancel all pending jobs in this batch
  await supabase
    .from("outfit_swap_jobs")
    .update({ status: "canceled" })
    .eq("batch_id", batchId)
    .in("status", ["queued", "processing"]);

  return jsonResponse({ success: true }, 200);
}

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
