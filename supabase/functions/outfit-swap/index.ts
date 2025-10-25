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

async function analyzeGarment(garmentUrl: string): Promise<string> {
  console.log("[analyzeGarment] Analyzing garment image...");
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Analyze this garment image in detail. Describe:
1. Type of clothing (e.g., t-shirt, dress, pants, jacket, full outfit)
2. Style and fit (e.g., casual, formal, athletic, oversized, fitted)
3. Color and patterns
4. Material appearance (e.g., cotton, denim, leather, knit)
5. Key distinctive features (e.g., collar type, sleeve length, buttons, zippers)
6. What body parts it covers (e.g., torso only, full legs, arms, etc.)

Be specific and concise. This description will be used for AI outfit swapping.` 
              },
              { type: "image_url", image_url: { url: garmentUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[analyzeGarment] API error:", response.status);
      return "clothing garment"; // Fallback
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "clothing garment";
    console.log("[analyzeGarment] Analysis result:", analysis);
    return analysis;
  } catch (error) {
    console.error("[analyzeGarment] Error:", error);
    return "clothing garment"; // Fallback
  }
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

    // Determine person image source and fetch storage path
    let personStoragePath: string;
    let personBucket: string;

    if (job.base_model_id) {
      console.log(`[processOutfitSwap] Job ${jobId}: Using base model ${job.base_model_id}`);
      const { data: baseModel } = await supabase
        .from("outfit_swap_base_models")
        .select("storage_path")
        .eq("id", job.base_model_id)
        .single();
      
      if (!baseModel?.storage_path) {
        throw new Error("Base model storage path not found");
      }
      
      personStoragePath = baseModel.storage_path;
      personBucket = "outfit-base-models";
    } else if (job.source_person_id) {
      console.log(`[processOutfitSwap] Job ${jobId}: Using source image ${job.source_person_id}`);
      const { data: sourceImage } = await supabase
        .from("source_images")
        .select("storage_path")
        .eq("id", job.source_person_id)
        .single();
      
      if (!sourceImage?.storage_path) {
        throw new Error("Source image storage path not found");
      }
      
      personStoragePath = sourceImage.storage_path;
      personBucket = "ugc-inputs";
    } else {
      throw new Error("No person image source specified (neither base_model_id nor source_person_id)");
    }

    // Get garment storage path
    const { data: garmentImage } = await supabase
      .from("source_images")
      .select("storage_path")
      .eq("id", job.source_garment_id)
      .single();
    
    if (!garmentImage?.storage_path) {
      throw new Error("Garment image storage path not found");
    }

    // Create signed URLs
    const { data: personUrl } = await supabase.storage
      .from(personBucket)
      .createSignedUrl(personStoragePath, 3600);

    const { data: garmentUrl } = await supabase.storage
      .from("ugc-inputs")
      .createSignedUrl(garmentImage.storage_path, 3600);

    if (!personUrl?.signedUrl || !garmentUrl?.signedUrl) {
      throw new Error("Failed to get source image URLs");
    }

    console.log(`[processOutfitSwap] Job ${jobId}: URLs ready for AI processing`);

    // Update progress
    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 30 })
      .eq("id", jobId);

    // STEP 1: Analyze the garment first
    console.log(`[processOutfitSwap] Job ${jobId}: Analyzing garment...`);
    const garmentDescription = await analyzeGarment(garmentUrl.signedUrl);
    
    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 50 })
      .eq("id", jobId);

    // STEP 2: Generate improved prompt with garment analysis
    const startTime = Date.now();
    const prompt = `You are an expert e-commerce outfit swap AI. Your task is to replace the person's current outfit with a NEW garment while maintaining photographic realism.

        GARMENT TO SWAP IN:
        ${garmentDescription}

        CRITICAL REQUIREMENTS:
        1. COMPLETE REPLACEMENT: Remove the person's ENTIRE current outfit and replace it with the new garment described above
        2. IDENTITY PRESERVATION: Keep the person's face, hair, skin tone, hands, and body pose 100% IDENTICAL
        3. VISIBLE CHANGE: The final image MUST show CLEARLY DIFFERENT clothing than the original - this is CRITICAL
        4. BODY COVERAGE: Replace all clothing that covers the same body parts as the new garment:
          - If the new garment is a top: Replace the current top completely
          - If it's pants/bottoms: Replace the current bottoms completely  
          - If it's a dress/full outfit: Replace ALL current clothing
          - If it's a jacket/outerwear: Layer it appropriately over a compatible base

        COMPOSITION & QUALITY:
        - Center the model in the frame for professional product photography
        - Clean, minimal background - remove/blur distracting elements (plants, furniture, clutter)
        - Professional e-commerce lighting and presentation
        - Natural shadows and highlights matching the garment
        - Seamless blending at all garment edges (neckline, sleeves, hem, waist)

        SMART STYLING:
        - Match footwear to outfit style (heels for formal, sneakers for casual/athletic, boots for edgy/outdoor)
        - Adjust accessories if they clash with the new outfit
        - If the new garment requires different proportions, adjust body naturally (e.g., fitted dress vs oversized hoodie)
        - Ensure overall look is cohesive and realistic.
        - Don't leave on underwear. Imagine a complement piece of cloth in case of being only a partial garment.

        QUALITY STANDARDS:
        - High-resolution, professional e-commerce product photo quality
        - No visible AI artifacts, seams, or blending errors
        - The result should look like a real fashion shoot

        VALIDATION: Before generating, confirm that:
        ✓ The new garment is VISIBLY DIFFERENT from the original outfit
        ✓ All relevant clothing items are being replaced
        ✓ The person's identity remains identical
        ✓ The composition is professional and centered

        Generate a high-quality outfit swap that clearly shows the NEW garment on the person.`;

    await supabase
      .from("outfit_swap_jobs")
      .update({ progress: 70 })
      .eq("id", jobId);

    // STEP 3: Call AI for outfit swap with improved prompt
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

  if (!jobs) {
    console.error(`[updateBatchProgress] No jobs found for batch ${batchId}`);
    return;
  }

  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const total = jobs.length;

  let batchStatus = "processing";
  if (completed + failed === total) {
    batchStatus = failed === total ? "failed" : "completed";
  }

  console.log(`[updateBatchProgress] Batch ${batchId}: Status=${batchStatus}, ${completed}/${total} completed, ${failed} failed`);

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
    console.log(`[createBatchJob] Creating job ${i + 1}/${garmentIds.length} for garment ${garmentId}`);
    
    const { data: job, error: jobError } = await supabase
      .from("outfit_swap_jobs")
      .insert({
        user_id: userId,
        batch_id: batch.id,
        base_model_id: baseModelId,
        source_person_id: null,  // Batch jobs use base_model_id, not source_person_id
        source_garment_id: garmentId,
        settings,
        garment_ids: [garmentId],
        total_garments: 1,
      })
      .select()
      .single();

    if (jobError) {
      console.error(`[createBatchJob] Job ${i + 1} creation error:`, jobError);
      
      // Track failed job creation
      await supabase
        .from("outfit_swap_batches")
        .update({ failed_jobs: i + 1 })
        .eq("id", batch.id);
      
      continue;
    }

    jobs.push(job);
  }

  // If ALL jobs failed to create, mark batch as failed immediately
  if (jobs.length === 0) {
    console.error(`[createBatchJob] All ${garmentIds.length} jobs failed to create`);
    await supabase
      .from("outfit_swap_batches")
      .update({ 
        status: "failed",
        failed_jobs: garmentIds.length,
        finished_at: new Date().toISOString()
      })
      .eq("id", batch.id);
    
    return jsonResponse({ 
      error: "All jobs failed to create", 
      batch, 
      jobs: [] 
    }, 500);
  }

  console.log(`[createBatchJob] Successfully created ${jobs.length}/${garmentIds.length} jobs`);

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
