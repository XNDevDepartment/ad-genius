// functions/ugc-gemini-v3/index.ts
// Supabase Edge Function for Google Gemini 3.0 image generation (Admin Testing Only)
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
const log = (step: string, meta?: any) => console.log(`[UGC-GEMINI-V3] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

// ---------- HELPERS ----------
const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  }
});

const errorJson = (message: string, status = 400, meta?: any) => {
  log(`ERROR: ${message}`, meta);
  return json({ error: message }, status);
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}

// Fixed credit cost: 1 credit per image
function calculateImageCost(settings: any) {
  return 1;
}

// Crop base64 image to exact aspect ratio
async function cropBase64ToAspect(base64Data: string, aspectRatio: string) {
  const parts = aspectRatio.split(':');
  if (parts.length !== 2) {
    log("Invalid aspect ratio format, skipping crop", { aspectRatio });
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  }
  const [w, h] = parts.map(Number);
  if (!w || !h || w <= 0 || h <= 0) {
    log("Invalid aspect ratio values, skipping crop", { aspectRatio, w, h });
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  }
  const targetRatio = w / h;
  try {
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const imageBuffer = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
    const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');
    const image = await Image.decode(imageBuffer);
    const srcW = image.width;
    const srcH = image.height;
    const srcRatio = srcW / srcH;
    log("Cropping image", { srcW, srcH, srcRatio: srcRatio.toFixed(3), targetRatio: targetRatio.toFixed(3), aspectRatio });
    
    let cropW, cropH, cropX, cropY;
    if (Math.abs(srcRatio - targetRatio) < 0.01) {
      log("Image already at target aspect ratio", { aspectRatio });
      return await image.encode();
    }
    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = Math.round(cropH * targetRatio);
      cropX = Math.round((srcW - cropW) / 2);
      cropY = 0;
    } else {
      cropW = srcW;
      cropH = Math.round(cropW / targetRatio);
      cropX = 0;
      cropY = Math.round((srcH - cropH) / 2);
    }
    log("Crop parameters", { cropX, cropY, cropW, cropH });
    const croppedImage = image.crop(cropX, cropY, cropW, cropH);
    const croppedBuffer = await croppedImage.encode();
    log("Image cropped successfully", { originalSize: `${srcW}x${srcH}`, croppedSize: `${cropW}x${cropH}`, aspectRatio });
    return croppedBuffer;
  } catch (error: any) {
    log("Error cropping image, returning original", { error: error?.message ?? String(error), aspectRatio });
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  }
}

// ---------- AUTH / CLIENTS ----------
function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

function userClient(authorization: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
}

// ---------- EXTRACT DATA FROM IMAGE ----------
function extractBase64Image(jsonResp: any) {
  if (jsonResp?.predictions?.length) {
    const p0 = jsonResp.predictions[0];
    if (p0?.image?.imageBytes) return p0.image.imageBytes;
    if (p0?.bytesBase64Encoded) return p0.bytesBase64Encoded;
  }
  const parts = jsonResp?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p?.inlineData?.mimeType?.startsWith('image/'));
  return imgPart?.inlineData?.data ?? null;
}

async function getUserIdFromAuth(authHeader: string) {
  const supa = userClient(authHeader);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error("Invalid authentication token");
  return data.user.id;
}

// ---------- ADMIN CHECK ----------
async function checkIsAdmin(userId: string, supabase: any): Promise<boolean> {
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  return !!isAdmin;
}

// ---------- ROUTER ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;
    
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const action = body?.action ?? new URL(req.url).searchParams.get("action");
    const svc = serviceClient();
    const isInternalAction = action === "generateImages" || action === "recoverQueued";
    
    let userId: string | null = null;
    if (isInternalAction && isServiceCall) {
      // ok, internal worker call
    } else {
      if (!authHeader) return errorJson("Missing authorization header", 401);
      userId = await getUserIdFromAuth(authHeader);
      
      // ADMIN CHECK: Block non-admins from using this endpoint
      const isAdmin = await checkIsAdmin(userId, svc);
      if (!isAdmin) {
        return errorJson("Admin access required for Gemini 3.0 testing", 403);
      }
    }

    switch (action) {
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
async function createImageJob(userId: string, payload: any, supabase: any) {
  const { prompt, settings, source_image_id, source_image_ids, desiredAudience, prodSpecs } = payload;
  const idempotency_window_minutes = payload.idempotency_window_minutes ?? 60;
  
  log("Create job (Gemini 3.0)", {
    userId,
    quality: settings?.quality,
    number: settings?.number,
    source_images: source_image_ids?.length || (source_image_id ? 1 : 0),
    desiredAudience: desiredAudience || 'not specified',
    prodSpecs: prodSpecs || 'not specified'
  });

  // Admin check (already enforced at router level, but double-check)
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  if (!isAdmin) {
    return errorJson("Admin access required", 403);
  }

  const finalSourceIds = source_image_ids && source_image_ids.length > 0 
    ? source_image_ids 
    : source_image_id ? [source_image_id] : [];

  // idempotency key
  const { data: keyResult, error: keyErr } = await supabase.rpc("generate_idempotency_key", {
    p_user_id: userId,
    p_source_image_id: source_image_id ?? null,
    p_prompt: prompt,
    p_settings: settings
  });
  if (keyErr) return errorJson(`Idempotency error: ${keyErr.message}`, 400);
  const contentHash = keyResult;

  // Check for existing job with same content hash - use gemini-v3 model_type
  const { data: existing } = await supabase.from("image_jobs")
    .select("*, ugc_images(*)")
    .eq("user_id", userId)
    .eq("content_hash", contentHash)
    .eq("model_type", "gemini-v3")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const status = existing.status;
    const age = Date.now() - new Date(existing.created_at).getTime();
    const ageMinutes = Math.floor(age / 60000);

    if (["queued", "processing"].includes(status)) {
      log("Returning existing active job", { jobId: existing.id, status, ageMinutes });
      return json({ jobId: existing.id, status: status }, 200);
    }

    if (status === "completed" && age < idempotency_window_minutes * 60 * 1000) {
      log("Returning cached completed job", { jobId: existing.id, ageMinutes });
      return json({
        jobId: existing.id,
        status: status,
        existingImages: (existing.ugc_images ?? []).map((img: any) => ({
          url: img.public_url,
          prompt: existing.prompt,
          format: img.meta?.format ?? "webp"
        }))
      }, 200);
    }

    log("Deleting old/failed job to allow retry", { jobId: existing.id, status, ageMinutes });
    const { error: deleteErr } = await supabase.from("image_jobs").delete().eq("id", existing.id);
    if (deleteErr) {
      log("Failed to delete old job", { error: deleteErr.message });
    }
  }

  // Admins don't pay credits for testing
  const costPerImage = calculateImageCost(settings ?? {});
  const totalImages = settings?.number ?? 1;
  const totalCost = 0; // Free for admins

  // Create job with model_type = 'gemini-v3'
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
    model_type: "gemini-v3", // Different model type for v3
    desiredAudience: desiredAudience ?? null,
    prodSpecs: prodSpecs ?? null
  }).select().single();

  if (jobErr) {
    const isDuplicateError = jobErr?.message?.includes("duplicate key") || 
                            jobErr?.message?.includes("idx_image_jobs_user_content_hash");
    
    if (isDuplicateError) {
      log("Duplicate key constraint hit, fetching conflicting job", { contentHash });
      const { data: conflicting } = await supabase.from("image_jobs")
        .select("*, ugc_images(*)")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .eq("model_type", "gemini-v3")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (conflicting) {
        log("Found conflicting job, returning it", { jobId: conflicting.id, status: conflicting.status });
        const response: any = { jobId: conflicting.id, status: conflicting.status };
        if (conflicting.status === "completed") {
          response.existingImages = (conflicting.ugc_images ?? []).map((img: any) => ({
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

  // trigger worker
  try {
    await serviceClient().functions.invoke("ugc-gemini-v3", {
      body: { action: "generateImages", jobId: job.id },
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
    }).catch(() => {});
  } catch (_) {}

  try {
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(generateImages(job.id, supabase));
  } catch (_) {}

  return json({ jobId: job.id, status: "queued" }, 200);
}

async function generateImages(jobId: string, supabase: any) {
  log("Worker start (Gemini 3.0)", { jobId });

  const { data: job, error: claimErr } = await supabase.from("image_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .eq("status", "queued")
    .eq("model_type", "gemini-v3")
    .select()
    .single();

  if (claimErr || !job) {
    const { data: existing } = await supabase.from("image_jobs").select("status").eq("id", jobId).maybeSingle();
    if (existing?.status === "processing") {
      log("Job already processing", { jobId });
      return json({ message: "Already processing" });
    }
    log("Job not found or already processed", { jobId, existing });
    return errorJson("Job not found or already processed", 404);
  }

  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const sourceImageIds = job.source_image_ids && Array.isArray(job.source_image_ids) && job.source_image_ids.length > 0
      ? job.source_image_ids
      : job.source_image_id ? [job.source_image_id] : [];
    const sourceImageUrls = await getSignedSourceUrls(sourceImageIds, supabase);
    log("Source images prepared", { jobId, sourceImageCount: sourceImageUrls.length });

    for (let i = 0; i < (job.total ?? 1); i++) {
      try {
        const sourceImageUrl = sourceImageUrls.length > 0
          ? sourceImageUrls[Math.floor(Math.random() * sourceImageUrls.length)]
          : null;
        log("Starting image generation (Gemini 3.0)", { jobId, imageIndex: i, usingSourceImage: !!sourceImageUrl });
        
        await generateSingleImageWithGemini(job, i, sourceImageUrl, supabase);
        completed++;
        const progress = Math.floor(completed / (job.total ?? 1) * 100);
        log("Image generation completed", { jobId, imageIndex: i, completed, progress });
        
        await supabase.from("image_jobs").update({
          completed,
          progress,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);
      } catch (e: any) {
        failed++;
        const errorMsg = e?.message ?? String(e);
        errors.push(errorMsg);
        log("Image generation failed", { jobId, index: i, error: errorMsg });
      }
    }

    const finalStatus = completed > 0 ? "completed" : "failed";
    const update: any = {
      status: finalStatus,
      completed,
      failed,
      progress: completed > 0 ? 100 : 0,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (finalStatus === "failed") update.error = errors.join("; ");
    log("Job processing completed", { jobId, finalStatus, completed, failed });
    await supabase.from("image_jobs").update(update).eq("id", jobId);

  } catch (e: any) {
    const errorMsg = e?.message ?? String(e);
    log("Job processing catastrophic failure", { jobId, error: errorMsg });
    await supabase.from("image_jobs").update({
      status: "failed",
      error: errorMsg,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", jobId);
  }

  return json({ success: true });
}

// Generate 1 image using Google Gemini 3.0 Pro Image Preview
async function generateSingleImageWithGemini(job: any, index: number, sourceImageUrl: string | null, supabase: any) {
  const MAX_ATTEMPTS = 3;
  const size = job?.settings?.size ?? "1024x1024";
  const quality = job?.settings?.quality ?? "high";
  const prompt = String(job?.prompt ?? "");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let res: Response | undefined;

      if (sourceImageUrl) {
        const src = await fetch(sourceImageUrl);
        if (!src.ok) throw new Error(`Failed to fetch source image: ${src.status}`);
        const mimeType = src.headers.get('content-type') ?? 'image/png';
        const imageBuffer = await src.arrayBuffer();
        
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        const chunkSize = 32768;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Image = btoa(binary);

        // Use gemini-3-pro-image-preview endpoint
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
                  { text: prompt },
                  { inlineData: { mimeType: mimeType, data: base64Image } }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          }),
          signal: controller.signal
        });
      }

      try {
        if (!res || !res.ok) {
          const text = res ? await res.text() : 'No response';
          const retryable = res && (res.status >= 500 || res.status === 429);
          if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Gemini 3.0 API error ${res?.status}: ${text}`);
        }

        const jsonResp = await res.json();
        const b64 = extractBase64Image(jsonResp);
        if (!b64) {
          log("Gemini 3.0 raw response (truncated)", { jobId: job.id, raw: JSON.stringify(jsonResp).slice(0, 2000) });
          if (attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Missing image data in Gemini 3.0 response`);
        }

        const aspectRatio = job?.settings?.aspectRatio;
        let fileBytes: Uint8Array;
        if (aspectRatio && aspectRatio !== 'source') {
          log("Cropping generated image to aspect ratio", { jobId: job.id, index, aspectRatio });
          fileBytes = await cropBase64ToAspect(b64, aspectRatio);
        } else {
          log("Using original image dimensions (no crop)", { jobId: job.id, index, aspectRatio: aspectRatio || 'none' });
          fileBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        }

        const storedFormat = "png";
        const contentType = "image/png";
        const extension = "png";
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
            model: "3.0-pro-image-preview", // Different model version tag
            aspectRatio: aspectRatio || 'none'
          },
          prompt: prompt,
          source_image_id: job.source_image_id
        });
        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);
        return;
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const retryable = /AbortError/.test(e?.name) || /Gemini 3.0 API error 5\d\d/.test(msg) || /429/.test(msg) || /Missing image data/.test(msg);
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`Gemini 3.0 API error (attempt ${attempt}/${MAX_ATTEMPTS}): ${msg}`);
    }
  }
}

async function getSignedSourceUrls(source_image_ids: string[], supabase: any) {
  if (!source_image_ids || source_image_ids.length === 0) return [];
  const urls: string[] = [];
  for (const id of source_image_ids) {
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

async function getJob(userId: string, jobId: string, supaUser: any) {
  const { data: job, error } = await supaUser.from("image_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("model_type", "gemini-v3")
    .single();
  if (error) return errorJson("Job not found", 404);
  return json({ job });
}

async function getJobImages(userId: string, jobId: string, supaUser: any) {
  const { data: images, error } = await supaUser.from("ugc_images")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return errorJson("Failed to fetch images", 400);
  return json({ images });
}

async function cancelJob(userId: string, jobId: string, supabase: any) {
  const { data: job, error } = await supabase.from("image_jobs")
    .update({ status: "canceled" })
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("model_type", "gemini-v3")
    .in("status", ["queued", "processing"])
    .select()
    .single();
  if (error || !job) return errorJson("Job not found or cannot be canceled", 400);
  return json({ success: true });
}

async function resumeJob(userId: string, jobId: string, supabase: any) {
  const { data: job, error } = await supabase.from("image_jobs")
    .select("id,user_id,status,completed,total")
    .eq("id", jobId)
    .eq("model_type", "gemini-v3")
    .single();
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);

  const resumable = job.status === "queued" || job.status === "processing" || (job.status === "failed" && (job.completed ?? 0) === 0);
  if (!resumable) {
    return json({ resumed: false, reason: "Not resumable" });
  }

  try {
    await serviceClient().functions.invoke("ugc-gemini-v3", {
      body: { action: "generateImages", jobId },
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
    });
  } catch (e) {
    try {
      // @ts-ignore
      EdgeRuntime?.waitUntil?.(generateImages(jobId, supabase));
    } catch (_) {}
  }
  return json({ resumed: true });
}

async function getActiveJob(userId: string, supabase: any) {
  const { data: job, error } = await supabase.from("image_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("model_type", "gemini-v3")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    return errorJson("Failed to fetch active job", 400);
  }
  return json({ job: job ?? null });
}

async function recoverQueued(supabase: any) {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data: jobs, error } = await supabase.from("image_jobs")
    .select("id,status")
    .eq("status", "queued")
    .eq("model_type", "gemini-v3")
    .lte("created_at", cutoff)
    .limit(20);
  if (error) return errorJson("Failed to list queued jobs", 400);
  
  for (const j of jobs ?? []) {
    try {
      await serviceClient().functions.invoke("ugc-gemini-v3", {
        body: { action: "generateImages", jobId: j.id },
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
      });
    } catch (_) {}
  }
  return json({ recovered: jobs?.length ?? 0 });
}
