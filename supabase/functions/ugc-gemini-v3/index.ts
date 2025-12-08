// functions/ugc-gemini/index.ts
// Supabase Edge Function (Deno) for Google Gemini image generation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// ---------- CORS ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
// ---------- ENV ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
// ---------- LOG ----------
const log = (step, meta)=>console.log(`[UGC-GEMINI-V3] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);
// ---------- HELPERS ----------
const json = (data, status = 200)=>new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
const errorJson = (message, status = 400, meta)=>{
  log(`ERROR: ${message}`, meta);
  return json({
    error: message
  }, status);
};
function sleep(ms) {
  return new Promise((r)=>setTimeout(r, ms));
}
function backoffMs(attempt) {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}
// Fixed credit cost: 1 credit per image
function calculateImageCost(settings) {
  return 1;
}
// Crop base64 image to exact aspect ratio
async function cropBase64ToAspect(base64Data, aspectRatio) {
  // Parse aspect ratio (e.g., "16:9" -> { w: 16, h: 9 })
  const parts = aspectRatio.split(':');
  if (parts.length !== 2) {
    log("Invalid aspect ratio format, skipping crop", {
      aspectRatio
    });
    // Return original data if invalid aspect ratio
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c)=>c.charCodeAt(0));
  }
  const [w, h] = parts.map(Number);
  if (!w || !h || w <= 0 || h <= 0) {
    log("Invalid aspect ratio values, skipping crop", {
      aspectRatio,
      w,
      h
    });
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c)=>c.charCodeAt(0));
  }
  const targetRatio = w / h;
  try {
    // Decode base64 to buffer
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const imageBuffer = Uint8Array.from(atob(base64Content), (c)=>c.charCodeAt(0));
    // Use imagescript for image processing (pure JS, works in Deno)
    const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');
    const image = await Image.decode(imageBuffer);
    const srcW = image.width;
    const srcH = image.height;
    const srcRatio = srcW / srcH;
    log("Cropping image", {
      srcW,
      srcH,
      srcRatio: srcRatio.toFixed(3),
      targetRatio: targetRatio.toFixed(3),
      aspectRatio
    });
    let cropW, cropH, cropX, cropY;
    if (Math.abs(srcRatio - targetRatio) < 0.01) {
      // Already close enough to target ratio, no crop needed
      log("Image already at target aspect ratio", {
        aspectRatio
      });
      return await image.encode();
    }
    if (srcRatio > targetRatio) {
      // Image is wider than target - crop width (center crop)
      cropH = srcH;
      cropW = Math.round(cropH * targetRatio);
      cropX = Math.round((srcW - cropW) / 2);
      cropY = 0;
    } else {
      // Image is taller than target - crop height (center crop)
      cropW = srcW;
      cropH = Math.round(cropW / targetRatio);
      cropX = 0;
      cropY = Math.round((srcH - cropH) / 2);
    }
    log("Crop parameters", {
      cropX,
      cropY,
      cropW,
      cropH
    });
    // Crop the image
    const croppedImage = image.crop(cropX, cropY, cropW, cropH);
    // Encode back to PNG
    const croppedBuffer = await croppedImage.encode();
    log("Image cropped successfully", {
      originalSize: `${srcW}x${srcH}`,
      croppedSize: `${cropW}x${cropH}`,
      aspectRatio
    });
    return croppedBuffer;
  } catch (error) {
    log("Error cropping image, returning original", {
      error: error?.message ?? String(error),
      aspectRatio
    });
    // Return original data if cropping fails
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c)=>c.charCodeAt(0));
  }
}
// ---------- AUTH / CLIENTS ----------
function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });
}
function userClient(authorization) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
    auth: {
      persistSession: false
    }
  });
}
// ---------- EXTRACT DATA FROM IMAGE ---------- //
function extractBase64Image(jsonResp) {
  if (jsonResp?.predictions?.length) {
    const p0 = jsonResp.predictions[0];
    if (p0?.image?.imageBytes) return p0.image.imageBytes;
    if (p0?.bytesBase64Encoded) return p0.bytesBase64Encoded;
  }
  const parts = jsonResp?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p)=>p?.inlineData?.mimeType?.startsWith('image/'));
  return imgPart?.inlineData?.data ?? null;
}
async function getUserIdFromAuth(authHeader) {
  const supa = userClient(authHeader);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error("Invalid authentication token");
  return data.user.id;
}
// ---------- ROUTER ----------
serve(async (req)=>{
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;
    // parse body once (may be empty)
    let body = {};
    try {
      body = await req.json();
    } catch  {
      body = {};
    }
    const action = body?.action ?? new URL(req.url).searchParams.get("action");
    // clients
    const svc = serviceClient();
    const isInternalAction = action === "generateImages" || action === "recoverQueued";
    let userId = null;
    if (isInternalAction && isServiceCall) {
    // ok, internal worker call
    } else {
      if (!authHeader) return errorJson("Missing authorization header", 401);
      userId = await getUserIdFromAuth(authHeader);
    }
    switch(action){
      case "createImageJob":
        if (!userId) return errorJson("Auth required", 401);
        return await createImageJob(userId, body, svc);
      case "generateImages":
        if (!(isInternalAction && isServiceCall)) return errorJson("Forbidden", 403);
        return await generateImages(body.jobId, svc);
      case "getJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getJob(userId, body.jobId, userClient(authHeader));
      case "getJobImages":
        if (!userId) return errorJson("Auth required", 401);
        return await getJobImages(userId, body.jobId, userClient(authHeader));
      case "cancelJob":
        if (!userId) return errorJson("Auth required", 401);
        return await cancelJob(userId, body.jobId, svc);
      case "resumeJob":
        if (!userId) return errorJson("Auth required", 401);
        return await resumeJob(userId, body.jobId, svc);
      case "getActiveJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getActiveJob(userId, svc);
      case "recoverQueued":
        if (!(isInternalAction && isServiceCall)) return errorJson("Forbidden", 403);
        return await recoverQueued(svc);
      default:
        return errorJson(`Unknown action: ${action ?? "none"}`, 400);
    }
  } catch (e) {
    return errorJson(e?.message ?? String(e), 500);
  }
});
// ---------- ACTIONS ----------
// Enqueue job, reserve credits, idempotent
async function createImageJob(userId, payload, supabase) {
  const { prompt, settings, source_image_id, source_image_ids, desiredAudience, prodSpecs } = payload;
  const idempotency_window_minutes = payload.idempotency_window_minutes ?? 60;
  log("Create job", {
    userId,
    quality: settings?.quality,
    number: settings?.number,
    source_images: source_image_ids?.length || (source_image_id ? 1 : 0),
    desiredAudience: desiredAudience || 'not specified',
    prodSpecs: prodSpecs || 'not specified'
  });
  // admin?
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId
  });
  // Determine which source images to use (prefer array, fallback to single)
  const finalSourceIds = source_image_ids && source_image_ids.length > 0 ? source_image_ids : source_image_id ? [
    source_image_id
  ] : [];
  // idempotency key
  const { data: keyResult, error: keyErr } = await supabase.rpc("generate_idempotency_key", {
    p_user_id: userId,
    p_source_image_id: source_image_id ?? null,
    p_prompt: prompt,
    p_settings: settings
  });
  if (keyErr) return errorJson(`Idempotency error: ${keyErr.message}`, 400);
  const contentHash = keyResult;
  // Check for existing job with same content hash (ANY status, ANY time)
  // This prevents constraint violations and enables smart idempotency
  const { data: existing } = await supabase.from("image_jobs").select("*, ugc_images(*)").eq("user_id", userId).eq("content_hash", contentHash).eq("model_type", "gemini-v3").order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  
  if (existing) {
    const status = existing.status;
    const age = Date.now() - new Date(existing.created_at).getTime();
    const ageMinutes = Math.floor(age / 60000);
    
    // Active jobs: return existing job immediately
    if (["queued", "processing"].includes(status)) {
      log("Returning existing active job", { jobId: existing.id, status, ageMinutes });
      return json({
        jobId: existing.id,
        status: status
      }, 200);
    }
    
    // Completed jobs within idempotency window: return cached results
    if (status === "completed" && age < idempotency_window_minutes * 60 * 1000) {
      log("Returning cached completed job", { jobId: existing.id, ageMinutes });
      return json({
        jobId: existing.id,
        status: status,
        existingImages: (existing.ugc_images ?? []).map((img)=>({
            url: img.public_url,
            prompt: existing.prompt,
            format: img.meta?.format ?? "webp"
          }))
      }, 200);
    }
    
    // Failed/cancelled/old completed jobs: delete and allow retry
    log("Deleting old/failed job to allow retry", { 
      jobId: existing.id, 
      status, 
      ageMinutes 
    });
    
    // Delete the old job (this will cascade delete related ugc_images if configured)
    const { error: deleteErr } = await supabase.from("image_jobs").delete().eq("id", existing.id);
    
    if (deleteErr) {
      log("Failed to delete old job", { error: deleteErr.message });
      // Continue anyway - the insert will fail with proper error handling below
    }
  }
  // credits
  const costPerImage = calculateImageCost(settings ?? {});
  const totalImages = settings?.number ?? 1;
  const totalCost = isAdmin ? 0 : costPerImage * totalImages;
  if (!isAdmin) {
    const { data: subscriber } = await supabase.from("subscribers").select("credits_balance").eq("user_id", userId).single();
    if (!subscriber || (subscriber.credits_balance ?? 0) < totalCost) {
      return errorJson("Insufficient credits", 400, {
        need: totalCost,
        have: subscriber?.credits_balance ?? 0
      });
    }
    const { data: deduct, error: deductErr } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: totalCost,
      p_reason: "reserve:gemini_v3_image_job"
    });
    if (deductErr || !deduct?.success) {
      return errorJson(deduct?.error ?? deductErr?.message ?? "Failed to reserve credits", 400);
    }
  }
  // create job (queued) with model_type = 'gemini' and source_image_ids
  const { data: job, error: jobErr } = await supabase.from("image_jobs").insert({
    user_id: userId,
    prompt,
    settings,
    content_hash: contentHash,
    total: totalImages,
    progress: 0,
    completed: 0,
    failed: 0,
    status: "queued",
    source_image_id: source_image_id ?? null,
    source_image_ids: finalSourceIds,
    model_type: "gemini-v3",
    desiredAudience: desiredAudience ?? null,
    prodSpecs: prodSpecs ?? null // Store the user's product specs
  }).select().single();
  if (jobErr) {
    // Refund credits on failure
    if (!isAdmin && totalCost > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: totalCost,
        p_reason: "job_creation_failed"
      });
    }
    
    // Handle duplicate key constraint violations
    const isDuplicateError = jobErr?.message?.includes("duplicate key") || 
                            jobErr?.message?.includes("idx_image_jobs_user_content_hash");
    
    if (isDuplicateError) {
      log("Duplicate key constraint hit, fetching conflicting job", { contentHash });
      
      // Try to fetch the conflicting job
      const { data: conflicting } = await supabase.from("image_jobs").select("*, ugc_images(*)").eq("user_id", userId).eq("content_hash", contentHash).eq("model_type", "gemini-v3").order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      
      if (conflicting) {
        log("Found conflicting job, returning it", { 
          jobId: conflicting.id, 
          status: conflicting.status 
        });
        
        // Return the existing job based on its status
        const response: any = {
          jobId: conflicting.id,
          status: conflicting.status
        };
        
        // If completed, include images
        if (conflicting.status === "completed") {
          response.existingImages = (conflicting.ugc_images ?? []).map((img)=>({
            url: img.public_url,
            prompt: conflicting.prompt,
            format: img.meta?.format ?? "webp"
          }));
        }
        
        return json(response, 200);
      }
    }
    
    return errorJson(`Job insert failed: ${jobErr.message}`, 400);
  }
  // trigger worker (self-invoke with service auth)
  try {
    await serviceClient().functions.invoke("ugc-gemini-v3", {
      body: {
        action: "generateImages",
        jobId: job.id
      },
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY
      }
    }).catch(()=>{});
  } catch (_) {}
  // EdgeRuntime fallback for platforms that support it
  try {
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(generateImages(job.id, supabase));
  } catch (_) {}
  return json({
    jobId: job.id,
    status: "queued"
  }, 200);
}
// Worker: claim and generate using Google Gemini
async function generateImages(jobId, supabase) {
  log("Worker start", {
    jobId
  });
  // atomic claim
  const { data: job, error: claimErr } = await supabase.from("image_jobs").update({
    status: "processing",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", jobId).eq("status", "queued").eq("model_type", "gemini-v3") // Ensure we're processing a Gemini V3 job
  .select().single();
  if (claimErr || !job) {
    const { data: existing } = await supabase.from("image_jobs").select("status").eq("id", jobId).maybeSingle();
    if (existing?.status === "processing") {
      log("Job already processing", {
        jobId
      });
      return json({
        message: "Already processing"
      });
    }
    log("Job not found or already processed", {
      jobId,
      existing
    });
    return errorJson("Job not found or already processed", 404);
  }
  let completed = 0;
  let failed = 0;
  const errors = [];
  try {
    // Prepare source images (support multiple)
    const sourceImageIds = job.source_image_ids && Array.isArray(job.source_image_ids) && job.source_image_ids.length > 0 ? job.source_image_ids : job.source_image_id ? [
      job.source_image_id
    ] : [];
    const sourceImageUrls = await getSignedSourceUrls(sourceImageIds, supabase);
    log("Source images prepared", {
      jobId,
      sourceImageCount: sourceImageUrls.length
    });
    // loop images
    for(let i = 0; i < (job.total ?? 1); i++){
      try {
        // Randomly select a source image from the available sources
        const sourceImageUrl = sourceImageUrls.length > 0 ? sourceImageUrls[Math.floor(Math.random() * sourceImageUrls.length)] : null;
        log("Starting image generation", {
          jobId,
          imageIndex: i,
          usingSourceImage: !!sourceImageUrl
        });
        await generateSingleImageWithGemini(job, i, sourceImageUrl, supabase);
        completed++;
        const progress = Math.floor(completed / (job.total ?? 1) * 100);
        log("Image generation completed", {
          jobId,
          imageIndex: i,
          completed,
          progress
        });
        await supabase.from("image_jobs").update({
          completed,
          progress,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);
      } catch (e) {
        failed++;
        const errorMsg = e?.message ?? String(e);
        errors.push(errorMsg);
        log("Image generation failed", {
          jobId,
          index: i,
          error: errorMsg
        });
      }
    }
    const finalStatus = completed > 0 ? "completed" : "failed";
    const update = {
      status: finalStatus,
      completed,
      failed,
      progress: completed > 0 ? 100 : 0,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (finalStatus === "failed") update.error = errors.join("; ");
    log("Job processing completed", {
      jobId,
      finalStatus,
      completed,
      failed
    });
    await supabase.from("image_jobs").update(update).eq("id", jobId);
    // partial refunds (skip admins)
    if (failed > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", {
        check_user_id: job.user_id
      });
      if (!isAdmin) {
        const refundAmount = failed * calculateImageCost({
          ...job.settings ?? {},
          number: 1
        });
        log("Issuing partial refund", {
          jobId,
          refundAmount,
          failed
        });
        await supabase.rpc("refund_user_credits", {
          p_user_id: job.user_id,
          p_amount: refundAmount,
          p_reason: "failed_gemini_v3_image_generation"
        });
      }
    }
  } catch (e) {
    const errorMsg = e?.message ?? String(e);
    log("Job processing catastrophic failure", {
      jobId,
      error: errorMsg
    });
    await supabase.from("image_jobs").update({
      status: "failed",
      error: errorMsg,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", jobId);
    // full refund on catastrophic failure (skip admins)
    const { data: isAdmin } = await supabase.rpc("is_user_admin", {
      check_user_id: job.user_id
    });
    if (!isAdmin) {
      const cost = calculateImageCost(job.settings ?? {}) * ((job.settings?.number ?? job.total) || 1);
      log("Issuing full refund", {
        jobId,
        cost
      });
      await supabase.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: cost,
        p_reason: "gemini_v3_job_processing_failed"
      });
    }
  }
  return json({
    success: true
  });
}
// Generate 1 image using Google Gemini (with retries/backoff)
async function generateSingleImageWithGemini(job, index, sourceImageUrl, supabase) {
  const MAX_ATTEMPTS = 3;
  const size = job?.settings?.size ?? "1024x1024";
  const quality = job?.settings?.quality ?? "high";
  const prompt = String(job?.prompt ?? "");
  for(let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 120000);
      let res;
      if (sourceImageUrl) {
        // ----- edits (using Gemini's image editing capabilities) -----
        const src = await fetch(sourceImageUrl);
        if (!src.ok) throw new Error(`Failed to fetch source image: ${src.status}`);
        const mimeType = src.headers.get('content-type') ?? 'image/png';
        const imageBuffer = await src.arrayBuffer();
        // Fix: Convert large array buffer to base64 safely without stack overflow
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        const chunkSize = 32768; // Process in chunks to avoid stack overflow
        for(let i = 0; i < uint8Array.length; i += chunkSize){
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Image = btoa(binary);
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`, {
          method: "POST",
          headers: {
            "x-goog-api-key": GOOGLE_AI_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Image
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: [
                'IMAGE'
              ]
            }
          }),
          signal: controller.signal
        });
      }
      try {
        if (!res.ok) {
          const text = await res.text();
          const retryable = res.status >= 500 || res.status === 429;
          if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Gemini API error ${res.status}: ${text}`);
        }
        const jsonResp = await res.json();
        const b64 = extractBase64Image(jsonResp);
        if (!b64) {
          log("Gemini raw response (truncated)", {
            jobId: job.id,
            raw: JSON.stringify(jsonResp).slice(0, 2000)
          });
          if (attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Missing image data in Imagen response`);
        }
        // Crop image to selected aspect ratio if specified
        const aspectRatio = job?.settings?.aspectRatio;
        let fileBytes;
        if (aspectRatio && aspectRatio !== 'source') {
          // Apply cropping for specific aspect ratios
          log("Cropping generated image to aspect ratio", {
            jobId: job.id,
            index,
            aspectRatio
          });
          fileBytes = await cropBase64ToAspect(b64, aspectRatio);
        } else {
          // No aspect ratio specified OR 'source' selected - preserve original dimensions
          log("Using original image dimensions (no crop)", {
            jobId: job.id,
            index,
            aspectRatio: aspectRatio || 'none'
          });
          fileBytes = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
        }
        // Store as PNG
        let storedFormat = "png";
        let contentType = "image/png";
        let extension = "png";
        const storagePath = `${job.user_id}/${job.id}/${index}.${extension}`;
        const { error: upErr } = await supabase.storage.from("ugc").upload(storagePath, fileBytes, {
          contentType,
          upsert: false
        });
        if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage.from("ugc").getPublicUrl(storagePath);
        const { error: saveErr } = await supabase.from("ugc_images").insert({
          job_id: job.id,
          user_id: job.user_id,
          storage_path: storagePath,
          public_url: pub.publicUrl,
      meta: {
        index,
        size,
        quality,
        format: storedFormat,
        provider: "gemini",
        model: "2.5-image-flash-preview",
        aspectRatio: aspectRatio || 'none'
      },
          prompt: prompt,
          source_image_id: job.source_image_id
        });
        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);
        return; // success
      } finally{
        clearTimeout(timeout);
      }
    } catch (e) {
      const msg = e?.message ?? String(e);
      const retryable = /AbortError/.test(e?.name) || /Gemini API error 5\d\d/.test(msg) || /429/.test(msg) || /Missing image data/.test(msg);
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`Gemini API error (attempt ${attempt}/${MAX_ATTEMPTS}): ${msg}`);
    }
  }
}
// Signed URLs for user-provided source images (supports multiple)
async function getSignedSourceUrls(source_image_ids, supabase) {
  if (!source_image_ids || source_image_ids.length === 0) return [];
  const urls = [];
  for (const id of source_image_ids){
    const { data: src } = await supabase.from("source_images").select("storage_path").eq("id", id).maybeSingle();
    if (src?.storage_path) {
      const { data: signed } = await supabase.storage.from("ugc-inputs").createSignedUrl(src.storage_path, 3600);
      if (signed?.signedUrl) {
        urls.push(signed.signedUrl);
      }
    }
  }
  return urls;
}
// Legacy: Single source image URL (for backward compatibility)
async function getSignedSourceUrl(source_image_id, supabase) {
  if (!source_image_id) return null;
  const { data: src } = await supabase.from("source_images").select("storage_path").eq("id", source_image_id).single();
  if (!src?.storage_path) return null;
  const { data: signed } = await supabase.storage.from("ugc-inputs").createSignedUrl(src.storage_path, 3600);
  return signed?.signedUrl ?? null;
}
// RLS-safe reads
async function getJob(userId, jobId, supaUser) {
  const { data: job, error } = await supaUser.from("image_jobs").select("*").eq("id", jobId).eq("user_id", userId).eq("model_type", "gemini-v3") // Only return Gemini V3 jobs
  .single();
  if (error) return errorJson("Job not found", 404);
  return json({
    job
  });
}
async function getJobImages(userId, jobId, supaUser) {
  const { data: images, error } = await supaUser.from("ugc_images").select("*").eq("job_id", jobId).eq("user_id", userId).order("created_at", {
    ascending: true
  });
  if (error) return errorJson("Failed to fetch images", 400);
  return json({
    images
  });
}
// Cancel job + refund unused credits
async function cancelJob(userId, jobId, supabase) {
  const { data: job, error } = await supabase.from("image_jobs").update({
    status: "canceled"
  }).eq("id", jobId).eq("user_id", userId).eq("model_type", "gemini-v3") // Only cancel Gemini V3 jobs
  .in("status", [
    "queued",
    "processing"
  ]).select().single();
  if (error || !job) return errorJson("Job not found or cannot be canceled", 400);
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId
  });
  if (!isAdmin) {
    const totalCost = calculateImageCost(job.settings ?? {}) * ((job.settings?.number ?? job.total) || 1);
    const usedCost = calculateImageCost(job.settings ?? {}) * (job.completed ?? 0);
    const refund = Math.max(0, totalCost - usedCost);
    if (refund > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: refund,
        p_reason: "gemini_v3_job_canceled"
      });
    }
  }
  return json({
    success: true
  });
}
// Resume a stuck job (re-triggers worker)
async function resumeJob(userId, jobId, supabase) {
  // ensure ownership and that it's a Gemini job
  const { data: job, error } = await supabase.from("image_jobs").select("id,user_id,status,completed,total").eq("id", jobId).eq("model_type", "gemini-v3").single();
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);
  const resumable = job.status === "queued" || job.status === "processing" || job.status === "failed" && (job.completed ?? 0) === 0;
  if (!resumable) {
    return json({
      resumed: false,
      reason: "Not resumable"
    });
  }
  // re-trigger
  try {
    await serviceClient().functions.invoke("ugc-gemini-v3", {
      body: {
        action: "generateImages",
        jobId
      },
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY
      }
    });
  } catch (e) {
    // fallback
    try {
      // @ts-ignore
      EdgeRuntime?.waitUntil?.(generateImages(jobId, supabase));
    } catch (_) {}
  }
  return json({
    resumed: true
  });
}
// Return the latest queued/processing Gemini job for the user
async function getActiveJob(userId, supabase) {
  const { data: job, error } = await supabase.from("image_jobs").select("*").eq("user_id", userId).eq("model_type", "gemini-v3") // Only get Gemini V3 jobs
  .in("status", [
    "queued",
    "processing"
  ]).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  if (error && error.code !== "PGRST116") {
    return errorJson("Failed to fetch active job", 400);
  }
  return json({
    job: job ?? null
  });
}
// Sweep queued Gemini jobs that never got picked up
async function recoverQueued(supabase) {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // older than 3m
  const { data: jobs, error } = await supabase.from("image_jobs").select("id,status").eq("status", "queued").eq("model_type", "gemini-v3") // Only recover Gemini V3 jobs
  .lte("created_at", cutoff).limit(20);
  if (error) return errorJson("Failed to list queued jobs", 400);
  for (const j of jobs ?? []){
    try {
      await serviceClient().functions.invoke("ugc-gemini-v3", {
        body: {
          action: "generateImages",
          jobId: j.id
        },
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY
        }
      });
    } catch (_) {}
  }
  return json({
    recovered: jobs?.length ?? 0
  });
}
