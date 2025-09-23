// functions/ugc/index.ts
// Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// ---------- LOG ----------
const log = (step, meta)=>console.log(`[UGC] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);
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


type Settings = {
  size?: string; // "1024x1024"
  quality?: "low" | "medium" | "high";
  number?: number;
  input_fidelity?: "low" | "medium" | "high"; // optional for edits
  output_format?: "png" | "webp";
  [k: string]: unknown;
};

// credit price table (fallback; you can move to DB as discussed)
function calculateImageCost(settings) {
  const qualityCosts = {
    low: 1,
    medium: 1.5,
    high: 2
  };
  return qualityCosts[settings.quality ?? "high"] ?? 2;
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
  const { prompt, settings, source_image_id } = payload;
  const idempotency_window_minutes = payload.idempotency_window_minutes ?? 60;
  log("Create job", {
    userId,
    quality: settings?.quality,
    number: settings?.number
  });
  // admin?
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId
  });
  // idempotency key
  const { data: keyResult, error: keyErr } = await supabase.rpc("generate_idempotency_key", {
    p_user_id: userId,
    p_source_image_id: source_image_id ?? null,
    p_prompt: prompt,
    p_settings: settings
  });
  if (keyErr) return errorJson(`Idempotency error: ${keyErr.message}`, 400);
  const contentHash = keyResult;
  // existing job inside window
  const windowStart = new Date(Date.now() - idempotency_window_minutes * 60 * 1000).toISOString();
  const { data: existing } = await supabase.from("image_jobs").select("*, ugc_images(*)").eq("content_hash", contentHash).gte("created_at", windowStart).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  if (existing) {
    const res = {
      jobId: existing.id,
      status: existing.status
    };
    if (existing.status === "completed") {

      res.existingImages = (existing.ugc_images ?? []).map((img: any) => ({
        url: img.public_url,
        prompt: existing.prompt,
        format: img.meta?.format ?? "webp",
      }));
    }
    return json(res, 200);
  }
  // credits
  const costPerImage = calculateImageCost(settings);
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
      p_reason: "reserve:image_job"
    });
    if (deductErr || !deduct?.success) {
      return errorJson(deduct?.error ?? deductErr?.message ?? "Failed to reserve credits", 400);
    }
  }
  // create job (queued)
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
    source_image_id: source_image_id ?? null
  }).select().single();
  if (jobErr) {
    if (!isAdmin && totalCost > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: totalCost,
        p_reason: "job_creation_failed"
      });
    }
    return errorJson(`Job insert failed: ${jobErr.message}`, 400);
  }
  // trigger worker (self-invoke with service auth) + deno waitUntil fallback
  try {
    // Fire-and-forget
    await serviceClient().functions.invoke("ugc", {
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
  // EdgeRuntime fallback for platforms that support it (ignored if not available)
  try {
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(generateImages(job.id, supabase));
  } catch (_) {}
  return json({
    jobId: job.id,
    status: "queued"
  }, 200);
}
// Worker: claim and generate
async function generateImages(jobId, supabase) {
  log("Worker start", {
    jobId
  });
  // atomic claim
  const { data: job, error: claimErr } = await supabase.from("image_jobs").update({
    status: "processing",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", jobId).eq("status", "queued").select().single();
  if (claimErr || !job) {
    // already processing or done?
    const { data: existing } = await supabase.from("image_jobs").select("status").eq("id", jobId).maybeSingle(); // Use maybeSingle to handle missing jobs gracefully
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
    // prepare source image (optional)
    const sourceImageUrl = await getSignedSourceUrl(job.source_image_id, supabase);
    log("Source image prepared", {
      jobId,
      hasSourceImage: !!sourceImageUrl
    });
    
    const numImages = job.total;
    const quality = job?.settings?.quality ?? "high";
    
    // Quality-aware timeout and concurrency settings
    const getQualitySettings = (quality: string) => {
      switch (quality) {
        case "low":
          return { timeout: 210000, concurrency: 3 }; // 3.5 minutes, 3 concurrent
        case "medium":
          return { timeout: 300000, concurrency: 2 }; // 5 minutes, 2 concurrent
        case "high":
        default:
          return { timeout: 420000, concurrency: 1 }; // 7 minutes, 1 concurrent (sequential)
      }
    };
    
    const qualitySettings = getQualitySettings(quality);
    
    log("Quality-aware processing settings", {
      jobId,
      quality,
      timeout: `${qualitySettings.timeout / 1000}s`,
      concurrency: qualitySettings.concurrency,
      totalImages: numImages
    });
    
      // Enhanced batch processing with quality-aware settings and improved error recovery
      const processImagesBatch = async (imagePromises: Array<() => Promise<any>>, maxConcurrency: number) => {
        const results = [];
        let completedCount = 0;
        let failedCount = 0;
        
        log("Starting batch processing", {
          jobId,
          totalBatches: Math.ceil(imagePromises.length / maxConcurrency),
          maxConcurrency,
          totalImages: imagePromises.length
        });
        
        for (let i = 0; i < imagePromises.length; i += maxConcurrency) {
          const batchIndex = Math.ceil((i + 1) / maxConcurrency);
          const batch = imagePromises.slice(i, i + maxConcurrency).map(fn => fn());
          
          log(`Processing batch ${batchIndex}`, {
            jobId,
            batchSize: batch.length,
            startIndex: i,
            endIndex: Math.min(i + maxConcurrency - 1, imagePromises.length - 1)
          });
          
          const batchStartTime = Date.now();
          const batchResults = await Promise.allSettled(batch);
          const batchDuration = Date.now() - batchStartTime;
          
          // Count results for this batch
          const succeededInBatch = batchResults.filter(r => r.status === 'fulfilled').length;
          const failedInBatch = batchResults.filter(r => r.status === 'rejected').length;
          
          // Update counters
          completedCount += succeededInBatch;
          failedCount += failedInBatch;
          
          // Log batch completion details
          log(`Batch ${batchIndex} completed`, {
            jobId,
            batchDuration: `${batchDuration / 1000}s`,
            succeededInBatch,
            failedInBatch,
            totalCompleted: completedCount,
            totalFailed: failedCount,
            progress: Math.round((completedCount / numImages) * 100)
          });
          
          // Log any batch failures for debugging
          batchResults.forEach((result, idx) => {
            if (result.status === 'rejected') {
              log(`Image ${i + idx + 1} failed in batch ${batchIndex}`, {
                jobId,
                imageIndex: i + idx,
                error: result.reason?.message || String(result.reason)
              });
            }
          });
          
          // Update job progress in database
          await supabase
            .from('image_jobs')
            .update({ 
              progress: Math.round((completedCount / numImages) * 100),
              completed: completedCount,
              failed: failedCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
          
          results.push(...batchResults);
        }
        
        log("Batch processing completed", {
          jobId,
          totalCompleted: completedCount,
          totalFailed: failedCount,
          successRate: `${Math.round((completedCount / numImages) * 100)}%`
        });
        
        return results;
      };

      // Create array of image generation functions with quality-aware timeout wrapper
      const generateSingleImageWithTimeout = async (jobData, index) => {
        const timeoutMs = qualitySettings.timeout;
        
        log(`Starting image ${index + 1} generation`, {
          jobId,
          imageIndex: index,
          quality,
          timeout: `${timeoutMs / 1000}s`
        });
        
        const startTime = Date.now();
        
        return Promise.race([
          generateSingleImage(jobData, index, sourceImageUrl, supabase),
          new Promise((_, reject) => 
            setTimeout(() => {
              const duration = Date.now() - startTime;
              log(`Image ${index + 1} timed out`, {
                jobId,
                imageIndex: index,
                quality,
                timeoutAfter: `${duration / 1000}s`,
                maxTimeout: `${timeoutMs / 1000}s`
              });
              reject(new Error(`Image ${index + 1} timed out after ${timeoutMs / 1000} seconds (${quality} quality)`));
            }, timeoutMs)
          )
        ]).then(result => {
          const duration = Date.now() - startTime;
          log(`Image ${index + 1} completed successfully`, {
            jobId,
            imageIndex: index,
            quality,
            duration: `${duration / 1000}s`
          });
          return result;
        }).catch(error => {
          const duration = Date.now() - startTime;
          log(`Image ${index + 1} failed`, {
            jobId,
            imageIndex: index,
            quality,
            duration: `${duration / 1000}s`,
            error: error.message
          });
          throw error;
        });
      };

      const imageGenerationTasks = Array.from({ length: numImages }, (_, index) => 
        () => generateSingleImageWithTimeout(job, index)
      );

      // Process all images with quality-aware concurrency control
      const imageResults = await processImagesBatch(imageGenerationTasks, qualitySettings.concurrency);
      // Enhanced result processing with better error reporting
      const successful = imageResults.filter(result => result.status === 'fulfilled').length;
      const failedResults = imageResults.filter(result => result.status === 'rejected');
      
      // Collect detailed error information for better debugging
      const errorDetails = failedResults.map((result, index) => {
        const error = (result as PromiseRejectedResult).reason;
        return {
          imageIndex: index,
          errorType: error?.name || 'Unknown',
          errorMessage: error?.message || String(error),
          timestamp: new Date().toISOString()
        };
      });

      log("Image generation batch completed", {
        jobId,
        total: numImages,
        successful,
        failed: failedResults.length,
        successRate: `${Math.round((successful / numImages) * 100)}%`,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      });

      // Update final job status based on results
      let finalStatus = 'completed';
      let statusReason = null;
      
      if (successful === 0) {
        finalStatus = 'failed';
        statusReason = 'all_images_failed';
      } else if (failedResults.length > 0) {
        finalStatus = 'completed_with_errors';
        statusReason = `${successful}_of_${numImages}_succeeded`;
      }

      // Update job with final status and detailed progress
      await supabase.from("image_jobs").update({
        status: finalStatus,
        progress: 100,
        completed: successful,
        failed: failedResults.length,
        total: numImages,
        updated_at: new Date().toISOString(),
        ...(statusReason && { status_reason: statusReason })
      }).eq("id", jobId);

      // If some images succeeded, return success with details
      if (successful > 0) {
        return json({
          success: true,
          completed: successful,
          failed: failedResults.length,
          total: numImages,
          message: failedResults.length > 0 
            ? `${successful} of ${numImages} images generated successfully`
            : `All ${successful} images generated successfully`
        });
      } else {
        // All failed - return error with details  
        const firstError = errorDetails[0];
        return errorJson(
          `All images failed to generate. First error: ${firstError?.errorMessage || 'Unknown error'}`,
          500,
          { errorDetails }
        );
      }
    } catch (error: any) {
      log("Error in generateImages", {
        jobId,
        error: error?.message || String(error),
        errorName: error?.name || 'Unknown',
        stack: error?.stack
      });

      // Update job status to failed with error details
      await supabase.from("image_jobs").update({
        status: "failed",
        progress: 0,
        failed: numImages,
        completed: 0,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: error?.message || String(error)
      }).eq("id", jobId);

      return errorJson(`Image generation failed: ${error?.message || String(error)}`, 500);
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
        p_reason: "job_processing_failed"
      });
    }
  }
  return json({
    success: true
  });
}
// Generate 1 image (with retries/backoff). Supports generations and edits.
async function generateSingleImage(job, index, sourceImageUrl, supabase) {
  const MAX_ATTEMPTS = 3;
  const quality = (job?.settings?.quality ?? "high") as "low" | "medium" | "high";
  
  // Quality-aware timeout for individual API calls (per attempt)
  const getIndividualTimeout = (quality: "low" | "medium" | "high") => {
    switch (quality) {
      case "low": return 70000;    // 70 seconds per attempt for low quality
      case "medium": return 100000; // 100 seconds per attempt for medium quality
      case "high":
      default: return 140000;      // 140 seconds per attempt for high quality
    }
  };
  
  const INDIVIDUAL_TIMEOUT = getIndividualTimeout(quality);
  const size = job?.settings?.size ?? "1024x1024";
  const prompt = String(job?.prompt ?? "");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    log("Starting image generation attempt", {
      jobId: job.id,
      imageIndex: index,
      attempt,
      maxAttempts: MAX_ATTEMPTS,
      quality,
      individualTimeout: `${INDIVIDUAL_TIMEOUT / 1000}s`
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), INDIVIDUAL_TIMEOUT);
      let res;
      if (sourceImageUrl) {
        // ----- edits -----
        const src = await fetch(sourceImageUrl);
        if (!src.ok) throw new Error(`Failed to fetch source image: ${src.status}`);
        const blob = new Blob([
          await src.arrayBuffer()
        ], {
          type: src.headers.get("content-type") || "image/webp"
        });
        const form = new FormData();
        form.append("model", "gpt-image-1");
        form.append("image", blob, "source.webp");
        form.append("prompt", prompt);
        form.append("size", size);
        form.append("quality", quality);
        if (job?.settings?.input_fidelity) {
          form.append("input_fidelity", String(job.settings.input_fidelity));
        }
        res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`
          },
          body: form,
          signal: controller.signal
        });
      } else {
        // ----- generations -----
        res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt,
            size,
            quality,
          }),
          signal: controller.signal
        });
      }


      try {
        clearTimeout(timeout); // Clear timeout on successful response
        const reqId = res.headers.get("x-request-id") || undefined;
        if (!res.ok) {
          const text = await res.text();
          const retryable = res.status >= 500 || res.status === 429;
          log("OpenAI API error", {
            jobId: job.id,
            imageIndex: index,
            attempt,
            status: res.status,
            error: text,
            retryable,
            reqId
          });
          if (retryable && attempt < MAX_ATTEMPTS) {
            const backoffDelay = backoffMs(attempt);
            log("Retrying after backoff", {
              jobId: job.id,
              imageIndex: index,
              attempt,
              delay: backoffDelay
            });
            await sleep(backoffDelay);
            continue;
          }
          throw new Error(`OpenAI error ${res.status}${reqId ? ` req=${reqId}` : ""}: ${text}`);
        }

        const jsonResp = await res.json();
        
        // upload to storage
        const b64 = jsonResp?.data?.[0]?.b64_json;
        if (!b64) {
          if (attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Missing b64_json in response${reqId ? ` req=${reqId}` : ""}`);
        }

        const decodedBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

        // Store as PNG directly (no WEBP conversion since WASM is not supported in edge functions)
        let fileBytes = decodedBytes;
        let storedFormat = "png";
        let contentType = "image/png";
        let extension = "png";

        const storagePath = `${job.user_id}/${job.id}/${index}.${extension}`;
        const { error: upErr } = await supabase.storage
          .from("ugc")
          .upload(storagePath, fileBytes, { contentType, upsert: false });
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
            provider: "openai",
            model: "gpt-image-1",
          },
          prompt: prompt,
          source_image_id: job.source_image_id,
        });
        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);

        log("Image generation successful", {
          jobId: job.id,
          imageIndex: index,
          attempt,
          storagePath
        });
        return; // success
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: any) {
      clearTimeout(timeout);
      
      // Enhanced error reporting with full context
      const errorInfo = {
        name: e?.name || 'Unknown',
        message: e?.message || String(e),
        stack: e?.stack,
        code: e?.code,
        status: e?.status
      };
      
      log("Image generation error (detailed)", {
        jobId: job.id,
        imageIndex: index,
        attempt,
        errorInfo,
        quality,
        timeout: INDIVIDUAL_TIMEOUT,
        timestamp: new Date().toISOString()
      });
      
      const msg = errorInfo.message;
      const retryable = /AbortError/.test(errorInfo.name) || 
                       /OpenAI error 5\d\d/.test(msg) || 
                       /429/.test(msg) || 
                       /Missing b64_json/.test(msg) ||
                       /timeout/.test(msg.toLowerCase());
      
      if (retryable && attempt < MAX_ATTEMPTS) {
        const backoffDelay = backoffMs(attempt);
        log("Retrying after error", {
          jobId: job.id,
          imageIndex: index,
          attempt,
          delay: backoffDelay,
          errorType: errorInfo.name
        });
        await sleep(backoffDelay);
        continue;
      }
      
      // Throw with enhanced error message including original error details
      throw new Error(`Image generation failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${errorInfo.name}: ${msg}`);
    }
  }
  
  throw new Error(`Failed to generate image after ${MAX_ATTEMPTS} attempts`);
}
// Signed URL for user-provided source image (optional)
async function getSignedSourceUrl(source_image_id, supabase) {
  if (!source_image_id) return null;
  const { data: src } = await supabase.from("source_images").select("storage_path").eq("id", source_image_id).single();
  if (!src?.storage_path) return null;
  const { data: signed } = await supabase.storage.from("ugc-inputs").createSignedUrl(src.storage_path, 3600);
  return signed?.signedUrl ?? null;
}
// RLS-safe reads
async function getJob(userId, jobId, supaUser) {
  const { data: job, error } = await supaUser.from("image_jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
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
  }).eq("id", jobId).eq("user_id", userId).in("status", [
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
        p_reason: "job_canceled"
      });
    }
  }
  return json({
    success: true
  });
}
// Resume a stuck job (re-triggers worker)
async function resumeJob(userId, jobId, supabase) {
  // ensure ownership
  const { data: job, error } = await supabase.from("image_jobs").select("id,user_id,status,completed,total").eq("id", jobId).single();
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);
  const resumable = job.status === "queued" || job.status === "processing" || job.status === "failed" && (job.completed ?? 0) === 0;
  if (!resumable) return json({
    resumed: false,
    reason: "Not resumable"
  });
  // re-trigger
  try {
    await serviceClient().functions.invoke("ugc", {
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
// Return the latest queued/processing job for the user
async function getActiveJob(userId, supabase) {
  const { data: job, error } = await supabase.from("image_jobs").select("*").eq("user_id", userId).in("status", [
    "queued",
    "processing"
  ]).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  if (error && error.code !== "PGRST116") return errorJson("Failed to fetch active job", 400);
  return json({
    job: job ?? null
  });
}
// Sweep queued jobs that never got picked up
async function recoverQueued(supabase) {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // older than 3m
  const { data: jobs, error } = await supabase.from("image_jobs").select("id,status").eq("status", "queued").lte("created_at", cutoff).limit(20);
  if (error) return errorJson("Failed to list queued jobs", 400);
  for (const j of jobs ?? []){
    try {
      await serviceClient().functions.invoke("ugc", {
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
