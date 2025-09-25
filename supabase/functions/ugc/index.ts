// functions/ugc/index.ts
// Supabase Edge Function (Deno)
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
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// ---------- LOG ----------
const log = (step: string, meta?: any) => console.log(`[UGC] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  }
});

const errorJson = (message: string, status = 400, meta?: any) => {
  log(`ERROR: ${message}`, meta);
  return json({
    error: message
  }, status);
};
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}
// credit price table (fallback; you can move to DB as discussed)
function calculateImageCost(settings: any) {
  const qualityCosts: Record<string, number> = {
    low: 1,
    medium: 1.5,
    high: 2
  };
  const quality = settings?.quality ?? "high";
  return qualityCosts[quality] ?? 2;
}
// ---------- AUTH / CLIENTS ----------
function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });
}
function userClient(authorization: string) {
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
async function getUserIdFromAuth(authHeader: string) {
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
    let body: any = {};
    try {
      body = await req.json();
    } catch {
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
  } catch (e: any) {
    return errorJson(e?.message ?? String(e), 500);
  }
});
// ---------- ACTIONS ----------
// Enqueue job, reserve credits, idempotent
async function createImageJob(userId: string, payload: any, supabase: any) {
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
  const { data: existing } = await supabase
    .from("image_jobs")
    .select("*, ugc_images(*)")
    .eq("content_hash", contentHash)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && ["queued", "processing"].includes(existing.status)) {
    const res = {
      jobId: existing.id,
      status: existing.status
    };
    return json(res, 200);
  }

  if (existing && existing.status === "completed") {
    const res: any = {
      jobId: existing.id,
      status: existing.status,
      existingImages: (existing.ugc_images ?? []).map((img: any) => ({
        url: img.public_url,
        prompt: existing.prompt,
        format: img.meta?.format ?? "webp"
      }))
    };
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

    if (jobErr?.message?.includes("idx_image_jobs_user_content_hash_active_unique")) {
      const { data: conflicting } = await supabase
        .from("image_jobs")
        .select("*, ugc_images(*)")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflicting) {
        return json({
          jobId: conflicting.id,
          status: conflicting.status
        }, 200);
      }
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
async function generateImages(jobId: string, supabase: any) {
  log("Worker start", {
    jobId
  });
  // --- Atomic claim: queued -> processing
  const { data: job, error: claimErr } = await supabase.from("image_jobs").update({
    status: "processing",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", jobId).eq("status", "queued").select().single();
  if (claimErr || !job) {
    // already processing or done?
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
  try {
    // --- Optional source image
    const sourceImageUrl = await getSignedSourceUrl(job.source_image_id, supabase);
    log("Source image prepared", {
      jobId,
      hasSourceImage: !!sourceImageUrl
    });
    const numImages = job.total;
    const quality = job?.settings?.quality ?? "high";
    // --- Quality-aware settings (keep your semantics)
    const getQualitySettings = (quality: string) => {
      switch(quality){
        case "low":
          return {
            timeout: 210000,
            concurrency: 3
          }; // 3.5m, 3 concurrent
        case "medium":
          return {
            timeout: 300000,
            concurrency: 2
          }; // 5m, 2 concurrent
        case "high":
        default:
          return {
            timeout: 420000,
            concurrency: 1
          }; // 7m, sequential
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
    // --- Batch runner with progress updates (FLAT results)
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
      for(let i = 0; i < imagePromises.length; i += maxConcurrency){
        const batchIndex = Math.ceil((i + 1) / maxConcurrency);
        const batch = imagePromises.slice(i, i + maxConcurrency).map((fn: () => Promise<any>) => fn());
        log(`Processing batch ${batchIndex}`, {
          jobId,
          batchSize: batch.length,
          startIndex: i,
          endIndex: Math.min(i + maxConcurrency - 1, imagePromises.length - 1)
        });
        const batchStartTime = Date.now();
        const batchResults = await Promise.allSettled(batch);
        const batchDuration = Date.now() - batchStartTime;
        // Count & log
        const succeededInBatch = batchResults.filter((r)=>r.status === "fulfilled").length;
        const failedInBatch = batchResults.filter((r)=>r.status === "rejected").length;
        completedCount += succeededInBatch;
        failedCount += failedInBatch;
        log(`Batch ${batchIndex} completed`, {
          jobId,
          batchDuration: `${batchDuration / 1000}s`,
          succeededInBatch,
          failedInBatch,
          totalCompleted: completedCount,
          totalFailed: failedCount,
          progress: Math.round(completedCount / numImages * 100)
        });
        // Log failures for debugging
        batchResults.forEach((result, idx)=>{
          if (result.status === "rejected") {
            log(`Image ${i + idx + 1} failed in batch ${batchIndex}`, {
              jobId,
              imageIndex: i + idx,
              error: result.reason?.message || String(result.reason)
            });
          }
        });
        // Update job progress
        await supabase.from("image_jobs").update({
          progress: Math.round(completedCount / numImages * 100),
          completed: completedCount,
          failed: failedCount,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);
        // ✅ flatten: append individual results (no nested arrays)
        results.push(...batchResults);
      }
      log("Batch processing completed", {
        jobId,
        totalCompleted: completedCount,
        totalFailed: failedCount,
        successRate: `${Math.round(completedCount / numImages * 100)}%`
      });
      return results;
    };
    // --- Build tasks: one function per image (keep your request shape)
    // IMPORTANT: no outer Promise.race; rely on AbortController inside generateSingleImage
    const tasks = Array.from({
      length: numImages
    }, (_, i)=>{
      return ()=>generateSingleImage(job, i, sourceImageUrl, supabase);
    });
    // --- Run with quality-aware concurrency
    const imageResults = await processImagesBatch(tasks, qualitySettings.concurrency);
    // --- Final accounting from FLAT array
    const successful = imageResults.filter((r)=>r.status === "fulfilled").length;
    const failedResults = imageResults.filter((r)=>r.status === "rejected");
    const errorDetails = failedResults.map((r, index)=>{
      const error = r.reason;
      return {
        imageIndex: index,
        message: error?.message || String(error),
        type: error?.name || "Unknown"
      };
    });
    const errorSummary = errorDetails.map((e)=>`Image ${e.imageIndex + 1}: ${e.message}`);
    log("Job processing completed", {
      jobId,
      successful,
      failed: failedResults.length,
      errorDetails: errorDetails.slice(0, 3)
    });
    // --- Status update (keep your semantics + fields)
    if (successful > 0) {
      const isPartialFailure = failedResults.length > 0;
      const statusUpdate = {
        status: isPartialFailure ? "partially_completed" : "completed",
        progress: 100,
        completed: successful,
        failed: failedResults.length,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...isPartialFailure && {
          error: `${failedResults.length} of ${numImages} images failed. ${errorSummary.slice(0, 2).join("; ")}${errorSummary.length > 2 ? "..." : ""}`
        }
      };
      await supabase.from("image_jobs").update(statusUpdate).eq("id", jobId);
    } else {
      // All failed
      await supabase.from("image_jobs").update({
        status: "failed",
        error: `All ${numImages} images failed. Common issues: ${errorSummary.slice(0, 3).join("; ")}${errorSummary.length > 3 ? "..." : ""}`,
        failed: failedResults.length,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", jobId);
    }
    // --- Partial refund for failed images (skip admins)
    if (failedResults.length > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", {
        check_user_id: job.user_id
      });
      if (!isAdmin) {
        const refundAmount = failedResults.length * calculateImageCost({
          ...job.settings ?? {},
          number: 1
        });
        log("Issuing partial refund for failed images", {
          jobId,
          refundAmount,
          failedCount: failedResults.length,
          successful
        });
        await supabase.rpc("refund_user_credits", {
          p_user_id: job.user_id,
          p_amount: refundAmount,
          p_reason: "failed_image_generation"
        });
      }
    }
  } catch (e) {
    // --- Catastrophic failure (function-level)
    const errorMsg = (e as any)?.message ?? String(e);
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
async function generateSingleImage(job: any, index: number, sourceImageUrl: string | null, supabase: any) {
  const MAX_ATTEMPTS = 3;
  const quality = job?.settings?.quality ?? "high";
  // Quality-aware timeout for individual API calls (per attempt)
  const getIndividualTimeout = (quality: string) => {
    switch(quality){
      case "low":
        return 70000; // 70 seconds per attempt for low quality
      case "medium":
        return 100000; // 100 seconds per attempt for medium quality
      case "high":
      default:
        return 140000; // 140 seconds per attempt for high quality
    }
  };
  const INDIVIDUAL_TIMEOUT = getIndividualTimeout(quality);
  const size = job?.settings?.size ?? "1024x1024";
  const prompt = String(job?.prompt ?? "");
  for(let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
    log("Starting image generation attempt", {
      jobId: job.id,
      imageIndex: index,
      attempt,
      maxAttempts: MAX_ATTEMPTS,
      quality,
      individualTimeout: `${INDIVIDUAL_TIMEOUT / 1000}s`
    });
    
    let timeout1: number | undefined;
    try {
      const controller = new AbortController();
      timeout1 = setTimeout(() => controller.abort(), INDIVIDUAL_TIMEOUT);
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
            quality
          }),
          signal: controller.signal
        });
      }
      try {
        if (timeout1) clearTimeout(timeout1); // Clear timeout on successful response
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
        const decodedBytes = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
        // Store as PNG directly (no WEBP conversion since WASM is not supported in edge functions)
        let fileBytes = decodedBytes;
        let storedFormat = "webp";
        let contentType = "image/webp";
        let extension = "webp";
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
            provider: "openai",
            model: "gpt-image-1"
          },
          prompt: prompt,
          source_image_id: job.source_image_id
        });
        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);
        log("Image generation successful", {
          jobId: job.id,
          imageIndex: index,
          attempt,
          storagePath
        });
        return; // success
      } finally{
        if (timeout1) clearTimeout(timeout1);
      }
    } catch (e: any) {
      if (timeout1) clearTimeout(timeout1);
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
      const retryable = /AbortError/.test(errorInfo.name) || /OpenAI error 5\d\d/.test(msg) || /429/.test(msg) || /Missing b64_json/.test(msg) || /timeout/.test(msg.toLowerCase());
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
async function getSignedSourceUrl(source_image_id: string | null, supabase: any) {
  if (!source_image_id) return null;
  const { data: src } = await supabase.from("source_images").select("storage_path").eq("id", source_image_id).single();
  if (!src?.storage_path) return null;
  const { data: signed } = await supabase.storage.from("ugc-inputs").createSignedUrl(src.storage_path, 3600);
  return signed?.signedUrl ?? null;
}
// RLS-safe reads
async function getJob(userId: string, jobId: string, supaUser: any) {
  const { data: job, error } = await supaUser.from("image_jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (error) return errorJson("Job not found", 404);
  return json({
    job
  });
}
async function getJobImages(userId: string, jobId: string, supaUser: any) {
  const { data: images, error } = await supaUser.from("ugc_images").select("*").eq("job_id", jobId).eq("user_id", userId).order("created_at", {
    ascending: true
  });
  if (error) return errorJson("Failed to fetch images", 400);
  return json({
    images
  });
}
// Cancel job + refund unused credits
async function cancelJob(userId: string, jobId: string, supabase: any) {
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
async function resumeJob(userId: string, jobId: string, supabase: any) {
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
async function getActiveJob(userId: string, supabase: any) {
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
async function recoverQueued(supabase: any) {
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
