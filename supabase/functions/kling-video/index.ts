import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Input validation for createVideoJob
function validateCreateJobInput(payload: any): { valid: boolean; error?: string } {
  const { prompt, duration, model } = payload;
  
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required' };
  }
  
  if (prompt.length < 1 || prompt.length > 2000) {
    return { valid: false, error: 'Prompt must be between 1 and 2000 characters' };
  }
  
  if (duration !== undefined) {
    const durationNum = Number(duration);
    if (isNaN(durationNum) || (durationNum !== 5 && durationNum !== 10)) {
      return { valid: false, error: 'Duration must be 5 or 10 seconds' };
    }
  }
  
  if (model !== undefined && typeof model !== 'string') {
    return { valid: false, error: 'Model must be a string' };
  }
  
  return { valid: true };
}

// Validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token || "");
    
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    
    const { action, ...payload } = await req.json();
    console.log(`[KLING-VIDEO] Action: ${action}, User: ${user.id}`);
    
    let result;
    switch (action) {
      case "createVideoJob": {
        const validation = validateCreateJobInput(payload);
        if (!validation.valid) {
          return json({ error: validation.error }, 400);
        }
        result = await createVideoJob(supabaseClient, user.id, payload);
        break;
      }
      case "getVideoJob": {
        if (!payload.jobId || !isValidUUID(payload.jobId)) {
          return json({ error: "Invalid job ID" }, 400);
        }
        result = await getVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      }
      case "cancelVideoJob": {
        if (!payload.jobId || !isValidUUID(payload.jobId)) {
          return json({ error: "Invalid job ID" }, 400);
        }
        result = await cancelVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      }
      case "retryVideoJob": {
        if (!payload.jobId || !isValidUUID(payload.jobId)) {
          return json({ error: "Invalid job ID" }, 400);
        }
        result = await retryVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }
    
    return json(result);
  } catch (error: any) {
    console.error("[KLING-VIDEO] Error:", error);
    // Return generic error to client
    return json({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
async function isUserAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_user_admin', {
    check_user_id: userId
  });
  if (error) {
    console.error('[ADMIN-CHECK] Error checking admin status:', error);
    return false;
  }
  return data === true;
}
async function createVideoJob(supabase: any, userId: string, payload: any): Promise<any> {
  const { source_image_id, ugc_image_id, image_url: direct_image_url, prompt, duration = 5, model, negative_prompt, cfg_scale, static_mask_url, dynamic_masks, tail_image_url } = payload;
  console.log("[CREATE-JOB] Starting job creation", {
    userId,
    prompt,
    duration
  });
  // Check if user is admin
  const isAdmin = await isUserAdmin(supabase, userId);
  console.log(`[CREATE-JOB] User is admin: ${isAdmin}`);
  
  // Skip all checks for admins
  if (!isAdmin) {
    // Free tier users cannot access video generation
    const { data: subscriber, error: subError } = await supabase.from('subscribers').select('subscription_tier').eq('user_id', userId).single();
    if (subError || !subscriber) {
      return {
        success: false,
        error: 'Unable to verify subscription status.'
      };
    }
    if (subscriber.subscription_tier === 'Free') {
      return {
        success: false,
        error: 'Video generation requires a paid plan. Please upgrade.',
        upgrade_required: true
      };
    }
  }
  // Validate basic inputs
  if (!prompt) return {
    success: false,
    error: "Missing prompt"
  };
  // Credit cost calculation
  const creditCost = Number(duration) === 10 ? 10 : 5;
  // Deduct credits ONLY for non-admin users
  if (!isAdmin) {
    const { data: creditResult, error: creditError } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: "video_generation"
    });
    if (creditError || !creditResult?.success) {
      console.error("[CREATE-JOB] Credit deduction failed:", creditError || creditResult);
      return {
        success: false,
        error: creditResult?.error || "Failed to deduct credits",
        current_balance: creditResult?.current_balance,
        required: creditCost
      };
    }
    console.log("[CREATE-JOB] Credits deducted:", creditCost);
  } else {
    console.log("[CREATE-JOB] Admin user - skipping credit deduction");
  }
  // Resolve image URL
  let imageUrl = null;
  let imageId = null;
  if (source_image_id) {
    const { data: sourceImage } = await supabase.from("source_images").select("public_url").eq("id", source_image_id).eq("user_id", userId).single();
    imageUrl = sourceImage?.public_url ?? null;
    imageId = source_image_id;
  } else if (ugc_image_id) {
    const { data: ugcImage } = await supabase.from("ugc_images").select("public_url").eq("id", ugc_image_id).eq("user_id", userId).single();
    imageUrl = ugcImage?.public_url ?? null;
    imageId = ugc_image_id;
  } else if (direct_image_url) {
    // Direct URL fallback (outfit swap results, bulk background, etc.)
    imageUrl = direct_image_url;
  }
  if (!imageUrl) {
    if (!isAdmin) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "video_generation_failed_no_image"
      });
    }
    return {
      success: false,
      error: "Source image not found"
    };
  }
  // Create job record
  const modelId = model || 'fal-ai/kling-video/v2.6/pro/image-to-video';
  const { data: job, error: jobError } = await supabase.from("kling_jobs").insert({
    user_id: userId,
    prompt,
    duration: Number(duration) === 10 ? 10 : 5,
    model: modelId,
    image_url: imageUrl,
    source_image_id: source_image_id || null,
    ugc_image_id: ugc_image_id || null,
    status: "queued",
    metadata: {
      credit_cost: isAdmin ? 0 : creditCost,
      is_admin_generation: isAdmin,
      negative_prompt: negative_prompt || undefined,
      cfg_scale: typeof cfg_scale === "number" ? cfg_scale : undefined,
      static_mask_url: static_mask_url || undefined,
      dynamic_masks: dynamic_masks || undefined,
      tail_image_url: tail_image_url || undefined
    }
  }).select().single();
  if (jobError) {
    console.error("[CREATE-JOB] Failed to create job:", jobError);
    if (!isAdmin) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "video_generation_failed_job_creation"
      });
    }
    return {
      success: false,
      error: "Failed to create job record"
    };
  }
  console.log("[CREATE-JOB] Job created:", job.id);
  // Kick off processing in background with error handling
  (globalThis as any).EdgeRuntime?.waitUntil(
    processVideoJobAsync(supabase, job.id, undefined).catch(async (e) => {
      console.error("[PROCESS-JOB] Background task error:", e);
      // Mark job as failed so it can be retried
      await supabase.from("kling_jobs").update({
        status: "failed",
        error: { message: e.message, type: "background_task_error" },
        finished_at: new Date().toISOString()
      }).eq("id", job.id);
    })
  );
  return {
    success: true,
    jobId: job.id,
    status: "queued"
  };
}
async function processVideoJobAsync(supabase: any, jobId: string, webhookUrl?: string): Promise<void> {
  // Fetch job
  const { data: job } = await supabase.from("kling_jobs").select("*").eq("id", jobId).single();
  if (!job) {
    console.error("[PROCESS-JOB] Job not found:", jobId);
    return;
  }
  // Update -> processing
  await supabase.from("kling_jobs").update({
    status: "processing"
  }).eq("id", jobId);
  const FAL_KEY = Deno.env.get("FAL_KEY");
  if (!FAL_KEY) throw new Error("FAL_KEY not configured");
  // Build payload per v1 i2v schema (no aspect_ratio here)
  const inputPayload = {
    prompt: job.prompt,
    image_url: job.image_url,
    duration: Number(job.duration) === 10 ? 10 : 5,
    generate_audio: false,
  };
  // carry optional knobs from metadata if present
  const md = job.metadata || {};
  if ((md as any).negative_prompt) (inputPayload as any).negative_prompt = (md as any).negative_prompt;
  if (typeof (md as any).cfg_scale === "number") (inputPayload as any).cfg_scale = (md as any).cfg_scale;
  if ((md as any).static_mask_url) (inputPayload as any).static_mask_url = (md as any).static_mask_url;
  if ((md as any).dynamic_masks) (inputPayload as any).dynamic_masks = (md as any).dynamic_masks;
  if ((md as any).tail_image_url) (inputPayload as any).tail_image_url = (md as any).tail_image_url;
  console.log("[PROCESS-JOB] Calling FAL queue:", job.model);
  const enqueueUrl = `https://queue.fal.run/${job.model}` + (webhookUrl ? `?fal_webhook=${encodeURIComponent(webhookUrl)}` : "");
  const submitRes = await fetch(enqueueUrl, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(inputPayload)
  });
  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`FAL queue submit failed: ${submitRes.status} - ${text}`);
  }
  const submitJson = await submitRes.json();
  const requestId = submitJson.request_id;
  const statusUrl = submitJson.status_url || `https://queue.fal.run/${job.model}/requests/${requestId}/status`;
  const responseUrl = submitJson.response_url || `https://queue.fal.run/${job.model}/requests/${requestId}`;
  await supabase.from("kling_jobs").update({
    request_id: requestId,
    status_url: statusUrl,
    response_url: responseUrl
  }).eq("id", jobId);
  // If webhook configured, stop here (webhook handler will finalize)
  if (webhookUrl) {
    console.log("[PROCESS-JOB] Submitted with webhook. Request ID:", requestId);
    return;
  }
  // Otherwise poll status until completed (fallback)
  const pollMax = 120; // 10 minutes @ 5s
  for(let attempt = 1; attempt <= pollMax; attempt++){
    await delay(5000);
    const stRes = await fetch(statusUrl, {
      headers: {
        Authorization: `Key ${FAL_KEY}`
      }
    });
    if (!stRes.ok) {
      console.warn(`[PROCESS-JOB] Status check failed (${attempt}/${pollMax})`, stRes.status);
      continue;
    }
    const st = await stRes.json();
    const status = st.status;
    console.log(`[PROCESS-JOB] Poll ${attempt}/${pollMax}: ${status}`);
    if (status === "FAILED" || status === "ERROR") {
      throw new Error("Video generation failed: " + JSON.stringify(st.error ?? st));
    }
    if (status === "COMPLETED") {
      const resRes = await fetch(responseUrl, {
        headers: {
          Authorization: `Key ${FAL_KEY}`
        }
      });
      if (!resRes.ok) throw new Error(`Failed to get result: ${resRes.status} ${await resRes.text()}`);
      const resultJson = await resRes.json();
      // Be tolerant to different wrappers
      const payload = resultJson?.response ?? resultJson?.output ?? resultJson?.data ?? resultJson;
      const videoUrl = payload?.video?.url;
      if (!videoUrl) {
        console.error("[PROCESS-JOB] Unexpected result payload:", JSON.stringify(resultJson).slice(0, 2000));
        throw new Error("Completed but missing video URL in response");
      }
      await persistVideoToStorage(supabase, job, jobId, videoUrl);
      return;
    }
  }
  throw new Error("Video generation timed out");
}
async function persistVideoToStorage(supabase: any, job: any, jobId: string, videoUrl: string): Promise<void> {
  console.log("[PROCESS-JOB] Downloading video:", videoUrl);
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
  const videoBlob = await videoResponse.arrayBuffer();
  const videoPath = `kling/${job.user_id}/${jobId}.mp4`;
  const { error: uploadError } = await supabase.storage.from("videos").upload(videoPath, videoBlob, {
    contentType: "video/mp4",
    upsert: true
  });
  if (uploadError) throw new Error("Failed to upload video: " + uploadError.message);
  const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(videoPath);
  await supabase.from("kling_jobs").update({
    status: "completed",
    video_url: publicUrl,
    video_path: videoPath,
    finished_at: new Date().toISOString(),
    video_size_bytes: videoBlob.byteLength,
    video_duration: Number(job.duration) === 10 ? 10 : 5
  }).eq("id", jobId);
  console.log("[PROCESS-JOB] Job completed:", jobId, publicUrl);

  // Trigger webhook if job was created via API
  if (job.metadata?.source === 'api' && job.metadata?.api_key_id) {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/api-webhook-dispatcher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKeyId: job.metadata.api_key_id,
          jobId: jobId,
          jobType: 'video',
          eventType: 'job.completed',
          userId: job.user_id,
          data: { video_url: publicUrl, duration: job.duration }
        })
      });
      console.log("[PROCESS-JOB] Webhook triggered for video job:", jobId);
    } catch (webhookErr) {
      console.warn("[PROCESS-JOB] Webhook trigger failed (non-blocking):", webhookErr);
    }
  }
}
async function getVideoJob(supabase: any, userId: string, jobId: string): Promise<any> {
  const { data: job, error } = await supabase.from("kling_jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (error) return {
    success: false,
    error: "Job not found"
  };
  return {
    success: true,
    job
  };
}
async function cancelVideoJob(supabase: any, userId: string, jobId: string): Promise<any> {
  console.log(`[CANCEL-JOB] Canceling job ${jobId} for user ${userId}`);
  // Check if user is admin
  const isAdmin = await isUserAdmin(supabase, userId);
  const { data: job } = await supabase.from("kling_jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) return {
    success: false,
    error: "Job not found"
  };
  if (job.status === "completed" || job.status === "failed") {
    return {
      success: false,
      error: "Cannot cancel completed or failed job"
    };
  }
  // Try to cancel upstream if still queued
  try {
    if (job.request_id) {
      const FAL_KEY = Deno.env.get("FAL_KEY");
      if (FAL_KEY) {
        const cancelUrl = `https://queue.fal.run/${job.model}/requests/${job.request_id}/cancel`;
        const res = await fetch(cancelUrl, {
          method: "PUT",
          headers: {
            Authorization: `Key ${FAL_KEY}`
          }
        });
        // 202 Accepted → cancellation requested; 400 means already running/completed.
        console.log("[CANCEL] FAL cancel status:", res.status);
      }
    }
  } catch (e) {
    console.warn("[CANCEL] FAL cancel error:", e);
  }
  // Local status + refund if still 'queued'
  await supabase.from("kling_jobs").update({
    status: "canceled",
    finished_at: new Date().toISOString()
  }).eq("id", jobId);
  // Only refund for non-admin users
  if (!isAdmin && job.status === "queued" && job.metadata?.credit_cost) {
    await supabase.rpc("refund_user_credits", {
      p_user_id: userId,
      p_amount: job.metadata.credit_cost,
      p_reason: "video_generation_canceled"
    });
    console.log(`[CANCEL-JOB] Refunded ${job.metadata.credit_cost} credits`);
  }
  return {
    success: true
  };
}
async function retryVideoJob(supabase: any, userId: string, jobId: string): Promise<any> {
  console.log(`[RETRY-JOB] Retrying job ${jobId}`);
  
  const { data: job } = await supabase
    .from("kling_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
    
  if (!job) {
    return { success: false, error: "Job not found" };
  }
  
  if (job.status !== "processing" && job.status !== "failed") {
    return { success: false, error: "Job is not in processing or failed state" };
  }
  
  if (!job.status_url || !job.response_url) {
    return { success: false, error: "Job missing status URLs - cannot retry" };
  }
  
  const FAL_KEY = Deno.env.get("FAL_KEY");
  
  // Check current status at FAL.ai
  const statusRes = await fetch(job.status_url, {
    headers: { Authorization: `Key ${FAL_KEY}` }
  });
  
  if (!statusRes.ok) {
    return { success: false, error: "Failed to check job status at FAL.ai" };
  }
  
  const status = await statusRes.json();
  console.log(`[RETRY-JOB] FAL status:`, status.status);
  
  if (status.status === "COMPLETED") {
    // Fetch video and update database
    const videoRes = await fetch(job.response_url, {
      headers: { Authorization: `Key ${FAL_KEY}` }
    });
    
    if (!videoRes.ok) {
      return { success: false, error: "Failed to fetch completed video" };
    }
    
    const result = await videoRes.json();
    const payload = result?.response ?? result?.output ?? result?.data ?? result;
    const videoUrl = payload?.video?.url;
    
    if (videoUrl) {
      await persistVideoToStorage(supabase, job, jobId, videoUrl);
      return { 
        success: true, 
        message: "Video recovered successfully",
        status: "completed" 
      };
    } else {
      return { success: false, error: "Video URL not found in completed result" };
    }
  } else if (status.status === "FAILED" || status.status === "ERROR") {
    await supabase.from("kling_jobs").update({
      status: "failed",
      error: status.error || { message: "Generation failed at FAL.ai" },
      finished_at: new Date().toISOString()
    }).eq("id", jobId);
    
    return { 
      success: true, 
      message: "Job marked as failed",
      status: "failed" 
    };
  } else if (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
    // Still processing - restart background polling
    (globalThis as any).EdgeRuntime?.waitUntil(
      processVideoJobAsync(supabase, jobId, undefined).catch(async (e) => {
        console.error("[RETRY-JOB] Polling error:", e);
        await supabase.from("kling_jobs").update({
          status: "failed",
          error: { message: e.message, type: "retry_polling_error" },
          finished_at: new Date().toISOString()
        }).eq("id", jobId);
      })
    );
    
    return { 
      success: true, 
      message: "Polling restarted for in-progress job",
      status: "processing" 
    };
  }
  
  return { success: false, error: `Unexpected FAL status: ${status.status}` };
}

function delay(ms: number): Promise<void> {
  return new Promise((r)=>setTimeout(r, ms));
}
