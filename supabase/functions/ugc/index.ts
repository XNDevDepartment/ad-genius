// functions/ugc/index.ts
// Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.16/mod.ts";
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
    // loop images
    for(let i = 0; i < (job.total ?? 1); i++){
      try {
        log("Starting image generation", {
          jobId,
          imageIndex: i
        });
        await generateSingleImage(job, i, sourceImageUrl, supabase);
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
          p_reason: "failed_image_generation"
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
  const size = job?.settings?.size ?? "1024x1024";

  const quality = (job?.settings?.quality ?? "high") as "low" | "medium" | "high";
  const outputFormat = (job?.settings?.output_format ?? "png") as "png" | "webp";
  const prompt = String(job?.prompt ?? "");

  const webpQualityBySetting: Record<string, number> = { low: 60, medium: 75, high: 90 };

  const resolveFormat = (requested: "png" | "webp") => (requested === "webp" ? "webp" : "webp");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 120000);
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
        form.append("response_format", "b64_json");
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
            response_format: "b64_json",
          }),
          signal: controller.signal
        });
      }


      try {
        const reqId = res.headers.get("x-request-id") || undefined;
        if (!res.ok) {
          const text = await res.text();
          const retryable = res.status >= 500 || res.status === 429;
          if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`OpenAI error ${res.status}${reqId ? ` req=${reqId}` : ""}: ${text}`);
        }

        const jsonResp = await res.json();
        const b64 = jsonResp?.data?.[0]?.b64_json;
        if (!b64) {
          if (attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Missing b64_json in response${reqId ? ` req=${reqId}` : ""}`);
        }

        // upload to storage
        const decodedBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

        let fileBytes = decodedBytes;
        let storedFormat = resolveFormat(outputFormat);
        let contentType = storedFormat === "webp" ? "image/webp" : "image/png";
        let extension = storedFormat;

        if (storedFormat === "webp") {
          try {
            const image = await Image.decode(decodedBytes);
            const webpQuality = webpQualityBySetting[quality] ?? 90;
            fileBytes = await image.encodeWEBP(webpQuality);
          } catch (err) {
            storedFormat = "png";
            contentType = "image/png";
            extension = "png";
            fileBytes = decodedBytes;
            log("WEBP conversion failed, falling back to PNG", { jobId: job.id, index, error: err?.message });
          }
        }

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

        return; // success
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: any) {

      const msg = e?.message ?? String(e);
      const retryable = /AbortError/.test(e?.name) || /OpenAI error 5\d\d/.test(msg) || /429/.test(msg) || /Missing b64_json/.test(msg);
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`OpenAI API error (attempt ${attempt}/${MAX_ATTEMPTS}): ${msg}`);
    }
  }
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
