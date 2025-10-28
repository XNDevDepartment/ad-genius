import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token || "");
    if (authError || !user) {
      return json({
        error: "Unauthorized"
      }, 401);
    }
    const { action, ...payload } = await req.json();
    console.log(`[KLING-VIDEO] Action: ${action}, User: ${user.id}`);
    let result;
    switch(action){
      case "createVideoJob":
        result = await createVideoJob(supabaseClient, user.id, payload);
        break;
      case "getVideoJob":
        result = await getVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      case "cancelVideoJob":
        result = await cancelVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      case "retryVideoJob":
        result = await retryVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      default:
        return json({
          error: "Invalid action"
        }, 400);
    }
    return json(result);
  } catch (error) {
    console.error("[KLING-VIDEO] Error:", error);
    return json({
      error: error.message
    }, 500);
  }
});
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

async function isUserAdmin(supabase, userId) {
  const { data, error } = await supabase.rpc('is_user_admin', {
    check_user_id: userId
  });
  
  if (error) {
    console.error('[ADMIN-CHECK] Error checking admin status:', error);
    return false;
  }
  
  return data === true;
}
async function createVideoJob(supabase, userId, payload) {
  const { source_image_id, ugc_image_id, prompt, duration = 5, model, negative_prompt, cfg_scale, static_mask_url, dynamic_masks, tail_image_url } = payload;
  console.log("[CREATE-JOB] Starting job creation", {
    userId,
    prompt,
    duration
  });
  
  // Check if user is admin
  const isAdmin = await isUserAdmin(supabase, userId);
  console.log(`[CREATE-JOB] User is admin: ${isAdmin}`);
  
  // Skip subscription check for admins
  if (!isAdmin) {
    // Check subscription tier - All tiers except Starter can access videos
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();
    
    if (subError || !subscriber) {
      return {
        success: false,
        error: 'Unable to verify subscription status.'
      };
    }
    
    // Only Starter tier is excluded from video generation
    if (subscriber.subscription_tier === 'Starter') {
      return {
        success: false,
        error: 'Video generation is not available on the Starter plan. Upgrade to Plus or try our Free tier!',
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
  // Create job record - normalize and store just the variant
  let modelVariant = model || 'v2.5/turbo/pro/image-to-video';
  
  // Extract just the variant if full path was provided
  if (modelVariant.includes('fal-ai/kling-video/')) {
    modelVariant = modelVariant.replace('fal-ai/kling-video/', '');
  }
  
  // Normalize the path format (v2.5-turbo -> v2.5/turbo)
  modelVariant = modelVariant.replace('v2.5-turbo', 'v2.5/turbo');
  
  const { data: job, error: jobError } = await supabase.from("kling_jobs").insert({
    user_id: userId,
    prompt,
    duration: Number(duration) === 10 ? 10 : 5,
    model: modelVariant,  // Store just the variant
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
  // Kick off processing — prefer webhook if provided
  const webhook = Deno.env.get("FAL_WEBHOOK_URL") || null;
  processVideoJobAsync(supabase, job.id, webhook).catch((e)=>console.error("[PROCESS-JOB] Launch error:", e));
  return {
    success: true,
    jobId: job.id,
    status: "queued"
  };
}
async function processVideoJobAsync(supabase, jobId, webhookUrl) {
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
  
  // Extract just the variant from the stored model (normalize format)
  let modelVariant = job.model || 'v2.5/turbo/pro/image-to-video';
  
  // If the model contains the full path, extract just the variant
  if (modelVariant.includes('fal-ai/kling-video/')) {
    modelVariant = modelVariant.replace('fal-ai/kling-video/', '');
  }
  
  // Normalize the path format (v2.5-turbo -> v2.5/turbo)
  modelVariant = modelVariant.replace('v2.5-turbo', 'v2.5/turbo');
  
  // Build FULL model path for FAL.ai queue API
  const fullModelPath = `fal-ai/kling-video/${modelVariant}`;
  
  // Build payload - NO model_name in body since it's in the URL
  const inputPayload = {
    prompt: job.prompt,
    image_url: job.image_url,
    duration: Number(job.duration) === 10 ? 10 : 5
  };
  
  // carry optional knobs from metadata if present
  const md = job.metadata || {};
  if (md.negative_prompt) inputPayload.negative_prompt = md.negative_prompt;
  if (typeof md.cfg_scale === "number") inputPayload.cfg_scale = md.cfg_scale;
  if (md.static_mask_url) inputPayload.static_mask_url = md.static_mask_url;
  if (md.dynamic_masks) inputPayload.dynamic_masks = md.dynamic_masks;
  if (md.tail_image_url) inputPayload.tail_image_url = md.tail_image_url;
  
  console.log("[PROCESS-JOB] Calling FAL queue with full model path:", fullModelPath);
  const enqueueUrl = `https://queue.fal.run/${fullModelPath}` + (webhookUrl ? `?fal_webhook=${encodeURIComponent(webhookUrl)}` : "");
  
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
  
  // Use full model path for status and response URLs
  const statusUrl = submitJson.status_url || `https://queue.fal.run/${fullModelPath}/requests/${requestId}/status`;
  const responseUrl = submitJson.response_url || `https://queue.fal.run/${fullModelPath}/requests/${requestId}`;
  
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
    console.log(`[PROCESS-JOB] Full FAL status response:`, JSON.stringify(st));
    const status = st.status?.toUpperCase() || st.status;
    console.log(`[PROCESS-JOB] Poll ${attempt}/${pollMax}: Status="${status}"`);
    
    // Check for failure states
    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
      const errorMsg = st.error?.message || st.error || JSON.stringify(st);
      console.error(`[PROCESS-JOB] Job failed with status "${status}":`, errorMsg);
      await supabase.from("kling_jobs").update({
        status: "failed",
        error: { message: errorMsg, raw_status: st },
        finished_at: new Date().toISOString()
      }).eq("id", jobId);
      throw new Error("Video generation failed: " + errorMsg);
    }
    
    // Check for completion states - FAL.ai might return different values
    if (status === "COMPLETED" || status === "SUCCEEDED" || status === "SUCCESS" || status === "DONE") {
      console.log(`[PROCESS-JOB] Job completed with status "${status}", fetching result...`);
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
    
    // If still in progress or queued, continue polling
    if (status === "IN_PROGRESS" || status === "IN_QUEUE" || status === "QUEUED" || status === "PROCESSING") {
      continue;
    }
    
    // Unknown status - log and continue
    console.warn(`[PROCESS-JOB] Unknown status "${status}", continuing to poll...`);
  }
  
  // Timeout reached - make one final check before failing
  console.error(`[PROCESS-JOB] Polling timeout reached after ${pollMax} attempts`);
  console.error(`[PROCESS-JOB] Job details for manual recovery:`, {
    jobId,
    request_id: job.request_id,
    response_url: responseUrl,
    status_url: statusUrl
  });
  
  // Try one final time to get the result
  try {
    const finalCheck = await fetch(responseUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` }
    });
    if (finalCheck.ok) {
      const finalResult = await finalCheck.json();
      const payload = finalResult?.response ?? finalResult?.output ?? finalResult?.data ?? finalResult;
      const videoUrl = payload?.video?.url;
      if (videoUrl) {
        console.log("[PROCESS-JOB] Final check found completed video!");
        await persistVideoToStorage(supabase, job, jobId, videoUrl);
        return;
      }
    }
  } catch (e) {
    console.error("[PROCESS-JOB] Final check failed:", e);
  }
  
  // Mark as failed with timeout error
  await supabase.from("kling_jobs").update({
    status: "failed",
    error: { 
      message: "Video generation timed out after 10 minutes",
      request_id: job.request_id,
      response_url: responseUrl
    },
    finished_at: new Date().toISOString()
  }).eq("id", jobId);
  
  throw new Error("Video generation timed out");
}
async function persistVideoToStorage(supabase, job, jobId, videoUrl) {
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
}
async function getVideoJob(supabase, userId, jobId) {
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
async function cancelVideoJob(supabase, userId, jobId) {
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
        // Extract and normalize model variant
        let modelVariant = job.model || 'v2.5/turbo/pro/image-to-video';
        if (modelVariant.includes('fal-ai/kling-video/')) {
          modelVariant = modelVariant.replace('fal-ai/kling-video/', '');
        }
        modelVariant = modelVariant.replace('v2.5-turbo', 'v2.5/turbo');
        
        const fullModelPath = `fal-ai/kling-video/${modelVariant}`;
        const cancelUrl = `https://queue.fal.run/${fullModelPath}/requests/${job.request_id}/cancel`;
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

async function retryVideoJob(supabase, userId, jobId) {
  console.log(`[RETRY-JOB] Retrying job ${jobId} for user ${userId}`);
  
  const { data: job } = await supabase.from("kling_jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) {
    return { success: false, error: "Job not found" };
  }
  
  if (job.status === "completed") {
    return { success: false, error: "Job already completed" };
  }
  
  if (!job.request_id || !job.response_url) {
    return { success: false, error: "Job missing FAL request information" };
  }
  
  const FAL_KEY = Deno.env.get("FAL_KEY");
  if (!FAL_KEY) {
    return { success: false, error: "FAL_KEY not configured" };
  }
  
  try {
    console.log(`[RETRY-JOB] Checking FAL status for request ${job.request_id}`);
    
    // Extract and normalize model variant
    let modelVariant = job.model || 'v2.5/turbo/pro/image-to-video';
    if (modelVariant.includes('fal-ai/kling-video/')) {
      modelVariant = modelVariant.replace('fal-ai/kling-video/', '');
    }
    modelVariant = modelVariant.replace('v2.5-turbo', 'v2.5/turbo');
    
    const fullModelPath = `fal-ai/kling-video/${modelVariant}`;
    
    // Check current status
    const statusRes = await fetch(job.status_url || `https://queue.fal.run/${fullModelPath}/requests/${job.request_id}/status`, {
      headers: { Authorization: `Key ${FAL_KEY}` }
    });
    
    if (!statusRes.ok) {
      return { success: false, error: `FAL status check failed: ${statusRes.status}` };
    }
    
    const statusData = await statusRes.json();
    console.log(`[RETRY-JOB] Current FAL status:`, JSON.stringify(statusData));
    const status = statusData.status?.toUpperCase() || statusData.status;
    
    // If completed, fetch and persist the video
    if (status === "COMPLETED" || status === "SUCCEEDED" || status === "SUCCESS" || status === "DONE") {
      const resultRes = await fetch(job.response_url, {
        headers: { Authorization: `Key ${FAL_KEY}` }
      });
      
      if (!resultRes.ok) {
        return { success: false, error: `Failed to fetch result: ${resultRes.status}` };
      }
      
      const resultJson = await resultRes.json();
      const payload = resultJson?.response ?? resultJson?.output ?? resultJson?.data ?? resultJson;
      const videoUrl = payload?.video?.url;
      
      if (!videoUrl) {
        return { success: false, error: "Video URL not found in FAL response" };
      }
      
      await persistVideoToStorage(supabase, job, jobId, videoUrl);
      return { success: true, message: "Video recovered and saved" };
    }
    
    // If still processing, return current status
    if (status === "IN_PROGRESS" || status === "IN_QUEUE" || status === "QUEUED" || status === "PROCESSING") {
      return { success: true, message: `Video is still ${status.toLowerCase()}`, status };
    }
    
    // If failed
    if (status === "FAILED" || status === "ERROR") {
      await supabase.from("kling_jobs").update({
        status: "failed",
        error: statusData.error || { message: "FAL processing failed" },
        finished_at: new Date().toISOString()
      }).eq("id", jobId);
      return { success: false, error: "Video generation failed on FAL side" };
    }
    
    return { success: false, error: `Unknown status: ${status}` };
  } catch (error) {
    console.error("[RETRY-JOB] Error:", error);
    return { success: false, error: error.message };
  }
}

function delay(ms) {
  return new Promise((r)=>setTimeout(r, ms));
} /**
 * OPTIONAL: implement a webhook handler endpoint at the same function
 * path with action "falWebhook" if you decide to use FAL_WEBHOOK_URL.
 * FAL will POST { request_id, status, payload } to your URL.
 * You can then fetch the full result via response_url if needed and call persistVideoToStorage.
 *
 * See: https://docs.fal.ai/model-apis/model-endpoints/webhooks
 */ 
