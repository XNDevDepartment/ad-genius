// functions/ugc-gemini-v3/index.ts
// Supabase Edge Function (Deno) for Google Gemini 3 Pro image generation with native aspect ratio support
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
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";

// ---------- LOG ----------
const log = (step: string, meta?: unknown): void => 
  console.log(`[UGC-GEMINI-V3] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

// ---------- HELPERS ----------
const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  }
});

const errorJson = (message: string, status = 400, meta?: unknown): Response => {
  log(`ERROR: ${message}`, meta);
  return json({ error: message }, status);
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number): number {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}

// Resolution-based credit cost: 1 (1K), 2 (2K), 3 (4K)
function calculateImageCost(settings: unknown): number {
  const s = settings as Record<string, unknown> | null;
  const size = (s?.size as string) ?? '1024x1024';
  const width = parseInt(size.split('x')[0], 10) || 1024;
  if (width >= 2800) return 3;  // 4K
  if (width >= 1700) return 2;  // 2K
  return 1;                      // 1K
}

// Supported native aspect ratios by Gemini 3 Pro
const NATIVE_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

// Fallback crop for custom aspect ratios not natively supported
async function cropBase64ToAspect(base64Data: string, aspectRatio: string): Promise<Uint8Array> {
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

    log("Cropping image (fallback)", { srcW, srcH, srcRatio: srcRatio.toFixed(3), targetRatio: targetRatio.toFixed(3), aspectRatio });

    if (Math.abs(srcRatio - targetRatio) < 0.01) {
      log("Image already at target aspect ratio", { aspectRatio });
      return await image.encode();
    }

    let cropW: number, cropH: number, cropX: number, cropY: number;
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
    const croppedBuffer: Uint8Array = await croppedImage.encode();
    
    log("Image cropped successfully", {
      originalSize: `${srcW}x${srcH}`,
      croppedSize: `${cropW}x${cropH}`,
      aspectRatio
    });

    return croppedBuffer;
  } catch (error: unknown) {
    log("Error cropping image, returning original", {
      error: error instanceof Error ? error.message : String(error),
      aspectRatio
    });
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  }
}

// ---------- AUTH / CLIENTS ----------
function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });
}

function userClient(authorization: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
}

// ---------- EXTRACT DATA FROM IMAGE ----------
interface GeminiResponse {
  predictions?: Array<{ image?: { imageBytes?: string }; bytesBase64Encoded?: string }>;
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
}

function extractBase64Image(jsonResp: GeminiResponse): string | null {
  if (jsonResp?.predictions?.length) {
    const p0 = jsonResp.predictions[0];
    if (p0?.image?.imageBytes) return p0.image.imageBytes;
    if (p0?.bytesBase64Encoded) return p0.bytesBase64Encoded;
  }
  const parts = jsonResp?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p?.inlineData?.mimeType?.startsWith('image/'));
  return imgPart?.inlineData?.data ?? null;
}

async function getUserIdFromAuth(authHeader: string): Promise<string> {
  const supa = userClient(authHeader);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error("Invalid authentication token");
  return data.user.id;
}

interface RequestBody {
  action?: string;
  jobId?: string;
  sourceImageId?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

interface JobSettings {
  number?: number;
  quality?: string;
  size?: string;
  aspectRatio?: string;
  [key: string]: unknown;
}

interface ImageJob {
  id: string;
  user_id: string;
  prompt: string;
  settings: JobSettings;
  content_hash: string;
  total: number;
  progress: number;
  completed: number;
  failed: number;
  status: string;
  source_image_id?: string;
  source_image_ids?: string[];
  model_type: string;
  desiredAudience?: string;
  prodSpecs?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
}

interface UgcImage {
  id: string;
  job_id: string;
  user_id: string;
  public_url: string;
  storage_path: string;
  prompt?: string;
  meta?: Record<string, unknown>;
}

// ---------- ROUTER ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;
    
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const action = body?.action ?? new URL(req.url).searchParams.get("action");
    const svc = serviceClient();
    const isInternalAction = action === "generateImages" || action === "recoverQueued";
    const isServiceCreateJob = action === "createImageJob" && isServiceCall && body.source_image_id;
    
    let userId: string | null = null;
    if (isInternalAction && isServiceCall) {
      // ok, internal worker call
    } else if (isServiceCreateJob) {
      // API gateway delegates job creation with service auth + userId from body
      userId = (body as any).user_id || null;
      if (!userId) {
        // Resolve userId from source_image ownership
        const { data: srcImg } = await svc.from("source_images")
          .select("user_id")
          .eq("id", body.source_image_id)
          .single();
        userId = srcImg?.user_id || null;
      }
      if (!userId) return errorJson("Could not resolve user from source image", 400);
    } else {
      if (!authHeader) return errorJson("Missing authorization header", 401);
      userId = await getUserIdFromAuth(authHeader);
    }

    switch (action) {
      case "createImageJob":
        if (!userId) return errorJson("Auth required", 401);
        return await createImageJob(userId, body, svc);
      case "generateImages":
        if (!(isInternalAction && isServiceCall)) return errorJson("Forbidden", 403);
        return await generateImages(body.jobId!, svc);
      case "getJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getJob(userId, body.jobId!, userClient(authHeader));
      case "getJobImages":
        if (!userId) return errorJson("Auth required", 401);
        return await getJobImages(userId, body.jobId!, userClient(authHeader));
      case "cancelJob":
        if (!userId) return errorJson("Auth required", 401);
        return await cancelJob(userId, body.jobId!, svc);
      case "resumeJob":
        if (!userId) return errorJson("Auth required", 401);
        return await resumeJob(userId, body.jobId!, svc);
      case "getActiveJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getActiveJob(userId, svc);
      case "recoverQueued":
        if (!(isInternalAction && isServiceCall)) return errorJson("Forbidden", 403);
        return await recoverQueued(svc);
      default:
        return errorJson(`Unknown action: ${action ?? "none"}`, 400);
    }
  } catch (e: unknown) {
    const err = e as Error;
    return errorJson(err?.message ?? String(e), 500);
  }
});

// ---------- ACTIONS ----------

// Enqueue job, reserve credits, idempotent
async function createImageJob(userId: string, payload: RequestBody, supabase: SupabaseClient): Promise<Response> {
  const { prompt, settings, source_image_id, source_image_ids, guidelineImageIds, desiredAudience, prodSpecs } = payload;
  const idempotency_window_minutes = (payload.idempotency_window_minutes as number) ?? 60;
  
  log("Create job", {
    userId,
    quality: (settings as JobSettings)?.quality,
    number: (settings as JobSettings)?.number,
    aspectRatio: (settings as JobSettings)?.aspectRatio,
    source_images: (source_image_ids as string[])?.length || (source_image_id ? 1 : 0),
    desiredAudience: desiredAudience || 'not specified',
    prodSpecs: prodSpecs || 'not specified'
  });

  // admin?
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  // Determine which source images to use
  const finalSourceIds = source_image_ids && (source_image_ids as string[]).length > 0 
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

  // Check for existing job with same content hash
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

    // Active jobs: return existing job immediately
    if (["queued", "processing"].includes(status)) {
      log("Returning existing active job", { jobId: existing.id, status, ageMinutes });
      return json({ jobId: existing.id, status: status }, 200);
    }

    // Completed jobs within idempotency window: return cached results
    if (status === "completed" && age < idempotency_window_minutes * 60 * 1000) {
      log("Returning cached completed job", { jobId: existing.id, ageMinutes });
      return json({
        jobId: existing.id,
        status: status,
        existingImages: (existing.ugc_images ?? []).map((img: UgcImage) => ({
          url: img.public_url,
          prompt: existing.prompt,
          format: (img.meta as Record<string, unknown>)?.format ?? "webp"
        }))
      }, 200);
    }

    // Failed/cancelled/old completed jobs: delete and allow retry
    log("Deleting old/failed job to allow retry", { jobId: existing.id, status, ageMinutes });
    const { error: deleteErr } = await supabase.from("image_jobs").delete().eq("id", existing.id);
    if (deleteErr) {
      log("Failed to delete old job", { error: deleteErr.message });
    }
  }

  // credits
  const costPerImage = calculateImageCost(settings ?? {});
  const totalImages = (settings as JobSettings)?.number ?? 1;
  const totalCost = isAdmin ? 0 : costPerImage * totalImages;

  if (!isAdmin) {
    const { data: subscriber } = await supabase.from("subscribers")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();
      
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

  // Merge guidelineImageIds into settings so they persist with the job
  const guidelineIds = (payload as any).guidelineImageIds as string[] | undefined;
  const finalSettings = guidelineIds && guidelineIds.length > 0
    ? { ...(settings ?? {}), guidelineImageIds: guidelineIds }
    : settings;

  // create job (queued)
  const { data: job, error: jobErr } = await supabase.from("image_jobs").insert({
    user_id: userId,
    prompt,
    settings: finalSettings,
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
    prodSpecs: prodSpecs ?? null
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
        const response: Record<string, unknown> = {
          jobId: conflicting.id,
          status: conflicting.status
        };
        if (conflicting.status === "completed") {
          response.existingImages = (conflicting.ugc_images ?? []).map((img: UgcImage) => ({
            url: img.public_url,
            prompt: conflicting.prompt,
            format: (img.meta as Record<string, unknown>)?.format ?? "webp"
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
      body: { action: "generateImages", jobId: job.id },
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
    }).catch(() => {});
  } catch (_) {}

  // EdgeRuntime fallback
  try {
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(generateImages(job.id, supabase));
  } catch (_) {}

  return json({ jobId: job.id, status: "queued" }, 200);
}

// Worker: claim and generate using Google Gemini
async function generateImages(jobId: string, supabase: SupabaseClient): Promise<Response> {
  log("Worker start", { jobId });

  // atomic claim
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
    const { data: existing } = await supabase.from("image_jobs")
      .select("status")
      .eq("id", jobId)
      .maybeSingle();
      
    if (existing?.status === "processing") {
      log("Job already processing", { jobId });
      return json({ message: "Already processing" });
    }
    log("Job not found or already processed", { jobId, existing });
    return errorJson("Job not found or already processed", 404);
  }

  const typedJob = job as ImageJob;
  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Prepare source images (support multiple)
    const sourceImageIds = typedJob.source_image_ids && Array.isArray(typedJob.source_image_ids) && typedJob.source_image_ids.length > 0
      ? typedJob.source_image_ids
      : typedJob.source_image_id ? [typedJob.source_image_id] : [];

    const sourceImageUrls = await getSignedSourceUrls(sourceImageIds, supabase);
    
    // Prepare guideline/reference images (stored in settings)
    const guidelineIds = (typedJob.settings as Record<string, unknown>)?.guidelineImageIds as string[] | undefined;
    const guidelineUrls = guidelineIds && guidelineIds.length > 0
      ? await getSignedSourceUrls(guidelineIds, supabase)
      : [];
    
    log("Source images prepared", { jobId, sourceImageCount: sourceImageUrls.length, guidelineImageCount: guidelineUrls.length });

    // loop images
    for (let i = 0; i < (typedJob.total ?? 1); i++) {
      try {
        // Randomly select a source image from the available sources
        const sourceImageUrl = sourceImageUrls.length > 0
          ? sourceImageUrls[Math.floor(Math.random() * sourceImageUrls.length)]
          : null;

        log("Starting image generation", {
          jobId,
          imageIndex: i,
          usingSourceImage: !!sourceImageUrl,
          guidelineCount: guidelineUrls.length
        });

        await generateSingleImageWithGemini(typedJob, i, sourceImageUrl, guidelineUrls, supabase);
        completed++;

        const progress = Math.floor((completed / (typedJob.total ?? 1)) * 100);
        log("Image generation completed", { jobId, imageIndex: i, completed, progress });

        await supabase.from("image_jobs").update({
          completed,
          progress,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);
      } catch (e: unknown) {
        failed++;
        const err = e as Error;
        const errorMsg = err?.message ?? String(e);
        errors.push(errorMsg);
        log("Image generation failed", { jobId, index: i, error: errorMsg });
      }
    }

    const finalStatus = completed > 0 ? "completed" : "failed";
    const update: Record<string, unknown> = {
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

    // Trigger webhook if job was created via API
    const settings = typedJob.settings as JobSettings;
    if (settings?.source === 'api' && settings?.api_key_id) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/api-webhook-dispatcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKeyId: settings.api_key_id,
            jobId: jobId,
            jobType: 'ugc',
            eventType: finalStatus === 'completed' ? 'job.completed' : 'job.failed',
            userId: typedJob.user_id,
            data: { completed, failed, total: typedJob.total }
          })
        });
        log("Webhook triggered", { jobId, eventType: finalStatus });
      } catch (webhookErr) {
        log("Webhook trigger failed (non-blocking)", { jobId, error: String(webhookErr) });
      }
    }

    // partial refunds (skip admins)
    if (failed > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: typedJob.user_id });
      if (!isAdmin) {
        const refundAmount = failed * calculateImageCost({ ...(typedJob.settings ?? {}), number: 1 });
        log("Issuing partial refund", { jobId, refundAmount, failed });
        await supabase.rpc("refund_user_credits", {
          p_user_id: typedJob.user_id,
          p_amount: refundAmount,
          p_reason: "failed_gemini_v3_image_generation"
        });
      }
    }
  } catch (e: unknown) {
    const err = e as Error;
    const errorMsg = err?.message ?? String(e);
    log("Job processing catastrophic failure", { jobId, error: errorMsg });

    await supabase.from("image_jobs").update({
      status: "failed",
      error: errorMsg,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", jobId);

    // full refund on catastrophic failure (skip admins)
    const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: typedJob.user_id });
    if (!isAdmin) {
      const cost = calculateImageCost(typedJob.settings ?? {}) * ((typedJob.settings?.number ?? typedJob.total) || 1);
      log("Issuing full refund", { jobId, cost });
      await supabase.rpc("refund_user_credits", {
        p_user_id: typedJob.user_id,
        p_amount: cost,
        p_reason: "gemini_v3_job_processing_failed"
      });
    }
  }

  return json({ success: true });
}

// Generate 1 image using Google Gemini 3 Pro (with native aspect ratio support)
async function generateSingleImageWithGemini(
  job: ImageJob,
  index: number,
  sourceImageUrl: string | null,
  guidelineImageUrls: string[],
  supabase: SupabaseClient
): Promise<void> {
  const MAX_ATTEMPTS = 3;
  const size = job?.settings?.size ?? "1024x1024";
  const quality = job?.settings?.quality ?? "high";
  const prompt = String(job?.prompt ?? "");
  const aspectRatio = job?.settings?.aspectRatio as string | undefined;
  const imageSize = job?.settings?.imageSize as string | undefined;

  // Check if aspect ratio is natively supported by Gemini 3 Pro
  const useNativeAspect = aspectRatio && aspectRatio !== 'source' && NATIVE_ASPECT_RATIOS.includes(aspectRatio);
  // 4K + non-source aspect ratio causes Gemini API timeouts — generate at 4K without aspect, then crop locally
  const use4kFallback = imageSize === '4K' && useNativeAspect;

  log("Image generation config", {
    jobId: job.id,
    index,
    aspectRatio: aspectRatio || 'none',
    imageSize: imageSize || 'default',
    useNativeAspect,
    use4kFallback,
    hasSourceImage: !!sourceImageUrl
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 90s to fail before edge function kill
      
      let res: Response | undefined;

      if (sourceImageUrl) {
        // ----- Image editing mode -----
        const src = await fetch(sourceImageUrl);
        if (!src.ok) throw new Error(`Failed to fetch source image: ${src.status}`);
        
        const mimeType = src.headers.get('content-type') ?? 'image/png';
        const imageBuffer = await src.arrayBuffer();
        
        // Convert to base64 safely without stack overflow
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        const chunkSize = 32768;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Image = btoa(binary);

        // Build generation config with native aspect ratio if supported
        const generationConfig: Record<string, unknown> = {
          responseModalities: ['TEXT', 'IMAGE']
        };

        // Build imageConfig: avoid sending 4K + aspectRatio together (causes API timeout)
        if (use4kFallback) {
          // Gemini Flash can't do 4K reliably — downgrade to 2K with native aspect ratio
          generationConfig.imageConfig = { imageSize: '2K', aspectRatio };
          log("4K requested but downgraded to 2K (model limitation)", { jobId: job.id, index, aspectRatio });
        } else if (useNativeAspect) {
          generationConfig.imageConfig = { aspectRatio, ...(imageSize && { imageSize }) };
          log("Using native API aspect ratio", { jobId: job.id, index, aspectRatio, imageSize });
        }

        // Build parts: prompt + main product image + guideline/reference images
        const parts: Record<string, unknown>[] = [];
        
        if (guidelineImageUrls.length > 0) {
          parts.push({ text: `${prompt}\n\nIMPORTANT MULTI-IMAGE INSTRUCTIONS:\n- The FIRST image is the MAIN PRODUCT. Reproduce this product EXACTLY in the generated image.\n- The ADDITIONAL image(s) are REFERENCE GUIDELINES showing how the product is used, worn, its scale, or context. Use them to understand the product better (size, how it fits, how it's worn) but ALWAYS feature the product from the FIRST image as the hero product.\n- DO NOT reproduce the reference images — only use them as context and guidance.` });
        } else {
          parts.push({ text: prompt });
        }
        
        parts.push({ inlineData: { mimeType: mimeType, data: base64Image } });
        
        // Guideline/reference images
        for (const guidelineUrl of guidelineImageUrls) {
          try {
            const gSrc = await fetch(guidelineUrl);
            if (!gSrc.ok) {
              log("Failed to fetch guideline image, skipping", { status: gSrc.status });
              continue;
            }
            const gMimeType = gSrc.headers.get('content-type') ?? 'image/png';
            const gBuffer = await gSrc.arrayBuffer();
            const gUint8 = new Uint8Array(gBuffer);
            let gBinary = '';
            for (let gi = 0; gi < gUint8.length; gi += chunkSize) {
              const gChunk = gUint8.subarray(gi, gi + chunkSize);
              gBinary += String.fromCharCode.apply(null, Array.from(gChunk));
            }
            const gBase64 = btoa(gBinary);
            parts.push({ inlineData: { mimeType: gMimeType, data: gBase64 } });
            log("Added guideline image to request", { jobId: job.id });
          } catch (gErr) {
            log("Error processing guideline image, skipping", { error: String(gErr) });
          }
        }

        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`, {
          method: "POST",
          headers: {
            "x-goog-api-key": GOOGLE_AI_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig
          }),
          signal: controller.signal
        });
      } else {
        // ----- Text-to-image mode (no source image) -----
        const generationConfig: Record<string, unknown> = {
          responseModalities: ['TEXT', 'IMAGE']
        };

        if (use4kFallback) {
          generationConfig.imageConfig = { imageSize: '4K' };
          log("4K fallback (text-to-image): sending imageSize only, will crop locally", { jobId: job.id, index, aspectRatio });
        } else if (useNativeAspect) {
          generationConfig.imageConfig = { aspectRatio, ...(imageSize && { imageSize }) };
          log("Using native API aspect ratio (text-to-image)", { jobId: job.id, index, aspectRatio, imageSize });
        }

        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`, {
          method: "POST",
          headers: {
            "x-goog-api-key": GOOGLE_AI_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig
          }),
          signal: controller.signal
        });
      }

      try {
        if (!res || !res.ok) {
          const text = res ? await res.text() : "No response";
          const retryable = res && (res.status >= 500 || res.status === 429);
          if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Gemini API error ${res?.status ?? 'unknown'}: ${text}`);
        }

        const jsonResp = await res.json();
        const b64 = extractBase64Image(jsonResp);

        if (!b64) {
          log("Gemini raw response (truncated)", { jobId: job.id, raw: JSON.stringify(jsonResp).slice(0, 2000) });
          if (attempt < MAX_ATTEMPTS) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`Missing image data in Gemini response`);
        }

        // Process image based on aspect ratio method
        let fileBytes: Uint8Array;
        let aspectMethod: string;

        if (use4kFallback && aspectRatio) {
          // 4K fallback: generated at 4K without aspect ratio, crop to requested ratio now
          aspectMethod = '4k-fallback-crop';
          log("4K fallback: cropping to requested aspect ratio", { jobId: job.id, index, aspectRatio });
          fileBytes = await cropBase64ToAspect(b64, aspectRatio);
        } else if (useNativeAspect) {
          // Native aspect ratio from API - no crop needed
          aspectMethod = 'native-api';
          fileBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        } else if (aspectRatio && aspectRatio !== 'source' && !NATIVE_ASPECT_RATIOS.includes(aspectRatio)) {
          // Custom aspect ratio not supported natively - use fallback crop
          aspectMethod = 'fallback-crop';
          log("Using fallback crop for custom aspect ratio", { jobId: job.id, index, aspectRatio });
          fileBytes = await cropBase64ToAspect(b64, aspectRatio);
        } else {
          // 'source' or no aspect ratio - preserve original dimensions
          aspectMethod = 'preserved';
          fileBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        }

        log("Image processed", {
          jobId: job.id,
          index,
          aspectRatio: aspectRatio || 'none',
          method: aspectMethod
        });

        // Store as PNG
        const storedFormat = "png";
        const contentType = "image/png";
        const extension = "png";
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
            provider: "gemini",
            model: "gemini-3.1-flash-image-preview",
            aspectRatio: aspectRatio || 'none',
            aspectMethod
          },
          prompt: prompt,
          source_image_id: job.source_image_id
        });

        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);
        return; // success

      } finally {
        clearTimeout(timeout);
      }
    } catch (e: unknown) {
      const err = e as Error & { name?: string };
      const msg = err?.message ?? String(e);
      const retryable = /AbortError/.test(err?.name ?? '') || 
                       /Gemini API error 5\d\d/.test(msg) || 
                       /429/.test(msg) || 
                       /Missing image data/.test(msg);
                       
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`Gemini API error (attempt ${attempt}/${MAX_ATTEMPTS}): ${msg}`);
    }
  }
}

// Signed URLs for user-provided source images (supports multiple)
// Detects bucket dynamically from public_url to support both legacy (ugc-inputs) and new (source-images) buckets
async function getSignedSourceUrls(source_image_ids: string[], supabase: SupabaseClient): Promise<string[]> {
  if (!source_image_ids || source_image_ids.length === 0) return [];
  
  const urls: string[] = [];
  for (const id of source_image_ids) {
    const { data: src } = await supabase.from("source_images")
      .select("storage_path, public_url")
      .eq("id", id)
      .maybeSingle();
    
    if (src?.storage_path && src?.public_url) {
      // Detect bucket from public_url - legacy images are in ugc-inputs, new ones in source-images
      let bucket = "source-images";
      if (src.public_url.includes("/ugc-inputs/")) {
        bucket = "ugc-inputs";
      }
      
      log("Signing source image URL", { id, bucket, path: src.storage_path });
      
      const { data: signed, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(src.storage_path, 3600);
      
      if (error) {
        log("Failed to sign source image", { id, bucket, error: error.message });
        continue;
      }
      
      if (signed?.signedUrl) {
        urls.push(signed.signedUrl);
      }
    }
  }
  return urls;
}

// Legacy: Single source image URL (for backward compatibility)
async function getSignedSourceUrl(source_image_id: string | null, supabase: SupabaseClient): Promise<string | null> {
  if (!source_image_id) return null;
  
  const { data: src } = await supabase.from("source_images")
    .select("storage_path, public_url")
    .eq("id", source_image_id)
    .single();
  
  if (!src?.storage_path || !src?.public_url) return null;
  
  // Detect bucket from public_url
  let bucket = "source-images";
  if (src.public_url.includes("/ugc-inputs/")) {
    bucket = "ugc-inputs";
  }
  
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(src.storage_path, 3600);
  
  return signed?.signedUrl ?? null;
}

// RLS-safe reads
async function getJob(userId: string, jobId: string, supaUser: SupabaseClient): Promise<Response> {
  const { data: job, error } = await supaUser.from("image_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("model_type", "gemini-v3")
    .single();
    
  if (error) return errorJson("Job not found", 404);
  return json({ job });
}

async function getJobImages(userId: string, jobId: string, supaUser: SupabaseClient): Promise<Response> {
  const { data: images, error } = await supaUser.from("ugc_images")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
    
  if (error) return errorJson("Failed to fetch images", 400);
  return json({ images });
}

// Cancel job + refund unused credits
async function cancelJob(userId: string, jobId: string, supabase: SupabaseClient): Promise<Response> {
  const { data: job, error } = await supabase.from("image_jobs")
    .update({ status: "canceled" })
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("model_type", "gemini-v3")
    .in("status", ["queued", "processing"])
    .select()
    .single();
    
  if (error || !job) return errorJson("Job not found or cannot be canceled", 400);

  const typedJob = job as ImageJob;
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  
  if (!isAdmin) {
    const totalCost = calculateImageCost(typedJob.settings ?? {}) * ((typedJob.settings?.number ?? typedJob.total) || 1);
    const usedCost = calculateImageCost(typedJob.settings ?? {}) * (typedJob.completed ?? 0);
    const refund = Math.max(0, totalCost - usedCost);
    
    if (refund > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: refund,
        p_reason: "gemini_v3_job_canceled"
      });
    }
  }

  return json({ success: true });
}

// Resume a stuck job (re-triggers worker)
async function resumeJob(userId: string, jobId: string, supabase: SupabaseClient): Promise<Response> {
  const { data: job, error } = await supabase.from("image_jobs")
    .select("id,user_id,status,completed,total")
    .eq("id", jobId)
    .eq("model_type", "gemini-v3")
    .single();
    
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);

  const resumable = job.status === "queued" || 
                   job.status === "processing" || 
                   (job.status === "failed" && (job.completed ?? 0) === 0);
                   
  if (!resumable) {
    return json({ resumed: false, reason: "Not resumable" });
  }

  // re-trigger
  try {
    await serviceClient().functions.invoke("ugc-gemini-v3", {
      body: { action: "generateImages", jobId },
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
    });
  } catch (_) {
    try {
      // @ts-ignore
      EdgeRuntime?.waitUntil?.(generateImages(jobId, supabase));
    } catch (_) {}
  }

  return json({ resumed: true });
}

// Return the latest queued/processing Gemini job for the user
async function getActiveJob(userId: string, supabase: SupabaseClient): Promise<Response> {
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

// Sweep queued AND stuck processing Gemini V3 jobs
async function recoverQueued(supabase: SupabaseClient): Promise<Response> {
  const queuedCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // queued > 3m
  const processingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // processing > 10m (stuck)
  
  // Recover queued jobs that never started
  const { data: queuedJobs, error } = await supabase.from("image_jobs")
    .select("id,status")
    .eq("status", "queued")
    .eq("model_type", "gemini-v3")
    .lte("created_at", queuedCutoff)
    .limit(20);
    
  if (error) return errorJson("Failed to list queued jobs", 400);

  // Recover processing jobs that got stuck (timeout/crash)
  const { data: stuckJobs } = await supabase.from("image_jobs")
    .select("id,status,user_id,settings,total,completed")
    .eq("status", "processing")
    .eq("model_type", "gemini-v3")
    .lte("updated_at", processingCutoff)
    .limit(20);

  let recoveredCount = 0;
  let failedCount = 0;

  for (const j of queuedJobs ?? []) {
    try {
      await serviceClient().functions.invoke("ugc-gemini-v3", {
        body: { action: "generateImages", jobId: j.id },
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
      });
    } catch (_) {}
    recoveredCount++;
  }

  // Process stuck jobs - mark as failed and refund
  for (const j of stuckJobs ?? []) {
    log("Recovering stuck processing job (v3)", { jobId: j.id, completed: j.completed });
    
    await supabase.from("image_jobs").update({
      status: "failed",
      error: "Job timed out during processing - automatic recovery",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", j.id);
    
    // Refund unused credits
    const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: j.user_id });
    if (!isAdmin) {
      const totalImages = j.total ?? 1;
      const completedImages = j.completed ?? 0;
      const unusedImages = totalImages - completedImages;
      if (unusedImages > 0) {
        const costPerImage = calculateImageCost(j.settings ?? {});
        const refundAmount = unusedImages * costPerImage;
        await supabase.rpc("refund_user_credits", {
          p_user_id: j.user_id,
          p_amount: refundAmount,
          p_reason: "stuck_job_auto_recovery_v3"
        });
        log("Refunded credits for stuck v3 job", { jobId: j.id, refund: refundAmount, costPerImage });
      }
    }
    failedCount++;
  }

  return json({ recovered: recoveredCount, failed_recovered: failedCount });
}
