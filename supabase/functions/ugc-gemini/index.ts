// functions/ugc-gemini/index.ts
// Supabase Edge Function (Deno) for Google Gemini image generation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------- TYPES ----------
interface ImageJob {
  id: string;
  user_id: string;
  prompt: string;
  settings: Record<string, unknown> | null;
  content_hash: string;
  total: number | null;
  completed: number | null;
  failed: number | null;
  status: string;
  source_image_id: string | null;
  source_image_ids: string[] | null;
  model_type: string | null;
  desiredAudience: string | null;
  prodSpecs: string | null;
  created_at: string;
  error?: string;
}

interface UgcImage {
  id: string;
  public_url: string;
  meta: Record<string, unknown> | null;
}

interface ExistingJobResult extends ImageJob {
  ugc_images: UgcImage[];
}

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
const log = (step: string, meta?: Record<string, unknown>): void => console.log(`[UGC-GEMINI] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

// ---------- HELPERS ----------
const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });

const errorJson = (message: string, status = 400, meta?: Record<string, unknown>): Response => {
  log(`ERROR: ${message}`, meta);
  return json({
    error: message
  }, status);
};

function sleep(ms: number): Promise<void> {
  return new Promise((r)=>setTimeout(r, ms));
}

function backoffMs(attempt: number): number {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}

// Resolution-based credit cost: 1 (1K), 2 (2K), 3 (4K)
function calculateImageCost(settings: Record<string, unknown>): number {
  // Prefer explicit imageSize tier if available
  const imageSize = settings?.imageSize as string | undefined;
  if (imageSize === '4K') return 3;
  if (imageSize === '2K') return 2;
  if (imageSize === '1K') return 1;
  // Fallback: derive from pixel dimensions using max dimension (handles portrait ratios)
  const size = (settings?.size as string) ?? '1024x1024';
  const parts = size.split('x').map(n => parseInt(n, 10) || 1024);
  const maxDim = Math.max(...parts);
  if (maxDim >= 2500) return 3;  // 4K
  if (maxDim >= 1500) return 2;  // 2K
  return 1;                      // 1K
}

// Crop base64 image to exact aspect ratio
async function cropBase64ToAspect(base64Data: string, aspectRatio: string): Promise<Uint8Array> {
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
    let cropW: number, cropH: number, cropX: number, cropY: number;
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("Error cropping image, returning original", {
      error: errorMessage,
      aspectRatio
    });
    // Return original data if cropping fails
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return Uint8Array.from(atob(base64Content), (c)=>c.charCodeAt(0));
  }
}

// ---------- AUTH / CLIENTS ----------
// deno-lint-ignore no-explicit-any
function serviceClient(): SupabaseClient<any> {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

// deno-lint-ignore no-explicit-any
function userClient(authorization: string): SupabaseClient<any> {
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
function extractBase64Image(jsonResp: Record<string, unknown> | null): string | null {
  // deno-lint-ignore no-explicit-any
  if ((jsonResp as any)?.predictions?.length) {
    // deno-lint-ignore no-explicit-any
    const p0 = (jsonResp as any).predictions[0];
    if (p0?.image?.imageBytes) return p0.image.imageBytes;
    if (p0?.bytesBase64Encoded) return p0.bytesBase64Encoded;
  }
  // deno-lint-ignore no-explicit-any
  const parts = (jsonResp as any)?.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const imgPart = parts.find((p: any)=>p?.inlineData?.mimeType?.startsWith('image/'));
  return imgPart?.inlineData?.data ?? null;
}

async function getUserIdFromAuth(authHeader: string): Promise<string> {
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
    let body: Record<string, unknown> = {};
    try {
      body = await req.json() as Record<string, unknown>;
    } catch  {
      body = {};
    }
    const action = (body?.action as string) ?? new URL(req.url).searchParams.get("action");
    // clients
    const svc = serviceClient();
    const isInternalAction = action === "generateImages";
    const isCronRecovery = action === "recoverQueued"; // Allow cron with anon key
    let userId: string | null = null;
    
    if (isCronRecovery && authHeader) {
      // Allow recovery calls with any valid auth (cron uses anon key)
      log("Recovery action triggered", { hasAuth: !!authHeader });
    } else if (isInternalAction && isServiceCall) {
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
        return await generateImages(body.jobId as string, svc);
      case "getJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getJob(userId, body.jobId as string, userClient(authHeader));
      case "getJobImages":
        if (!userId) return errorJson("Auth required", 401);
        return await getJobImages(userId, body.jobId as string, userClient(authHeader));
      case "cancelJob":
        if (!userId) return errorJson("Auth required", 401);
        return await cancelJob(userId, body.jobId as string, svc);
      case "resumeJob":
        if (!userId) return errorJson("Auth required", 401);
        return await resumeJob(userId, body.jobId as string, svc);
      case "getActiveJob":
        if (!userId) return errorJson("Auth required", 401);
        return await getActiveJob(userId, svc);
      case "recoverQueued":
        if (!authHeader) return errorJson("Auth required", 401);
        return await recoverQueued(svc);
      default:
        return errorJson(`Unknown action: ${action ?? "none"}`, 400);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorJson(message, 500);
  }
});

// ---------- ACTIONS ----------
// deno-lint-ignore no-explicit-any
async function createImageJob(userId: string, payload: Record<string, unknown>, supabase: SupabaseClient<any>): Promise<Response> {
  const { prompt, settings, source_image_id, source_image_ids, desiredAudience, prodSpecs } = payload as {
    prompt?: string;
    settings?: Record<string, unknown>;
    source_image_id?: string;
    source_image_ids?: string[];
    desiredAudience?: string;
    prodSpecs?: string;
    idempotency_window_minutes?: number;
  };
  const idempotency_window_minutes = (payload.idempotency_window_minutes as number) ?? 60;
  log("Create job", {
    userId,
    quality: (settings as Record<string, unknown>)?.quality,
    number: (settings as Record<string, unknown>)?.number,
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
  const contentHash = keyResult as string;
  // Check for existing job with same content hash (ANY status, ANY time)
  // This prevents constraint violations and enables smart idempotency
  const { data: existing } = await supabase.from("image_jobs").select("*, ugc_images(*)").eq("user_id", userId).eq("content_hash", contentHash).eq("model_type", "gemini").order("created_at", {
    ascending: false
  }).limit(1).maybeSingle() as { data: ExistingJobResult | null };
  
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
        existingImages: (existing.ugc_images ?? []).map((img: UgcImage)=>({
            url: img.public_url,
            prompt: existing.prompt,
            format: (img.meta as Record<string, unknown>)?.format ?? "webp"
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
  const totalImages = (settings?.number as number) ?? 1;
  const totalCost = isAdmin ? 0 : costPerImage * totalImages;
  if (!isAdmin) {
    const { data: subscriber } = await supabase.from("subscribers").select("credits_balance").eq("user_id", userId).single() as { data: { credits_balance: number } | null };
    if (!subscriber || (subscriber.credits_balance ?? 0) < totalCost) {
      return errorJson("Insufficient credits", 400, {
        need: totalCost,
        have: subscriber?.credits_balance ?? 0
      });
    }
    const { data: deduct, error: deductErr } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: totalCost,
      p_reason: "reserve:gemini_image_job"
    }) as { data: { success: boolean; error?: string } | null; error: Error | null };
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
    model_type: "gemini",
    desiredAudience: desiredAudience ?? null,
    prodSpecs: prodSpecs ?? null // Store the user's product specs
  }).select().single() as { data: ImageJob | null; error: Error | null };
  if (jobErr || !job) {
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
      const { data: conflicting } = await supabase.from("image_jobs").select("*, ugc_images(*)").eq("user_id", userId).eq("content_hash", contentHash).eq("model_type", "gemini").order("created_at", {
        ascending: false
      }).limit(1).maybeSingle() as { data: ExistingJobResult | null };
      
      if (conflicting) {
        log("Found conflicting job, returning it", { 
          jobId: conflicting.id, 
          status: conflicting.status 
        });
        
        // Return the existing job based on its status
        // deno-lint-ignore no-explicit-any
        const response: any = {
          jobId: conflicting.id,
          status: conflicting.status
        };
        
        // If completed, include images
        if (conflicting.status === "completed") {
          response.existingImages = (conflicting.ugc_images ?? []).map((img: UgcImage)=>({
            url: img.public_url,
            prompt: conflicting.prompt,
            format: (img.meta as Record<string, unknown>)?.format ?? "webp"
          }));
        }
        
        return json(response, 200);
      }
    }
    
    return errorJson(`Job insert failed: ${jobErr?.message ?? "Unknown error"}`, 400);
  }
  log("Job created", { jobId: job.id, userId, total: totalImages });

  // Trigger worker with retry logic (fire-and-forget, non-blocking)
  const triggerWorker = async (jid: string, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ugc-gemini`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey": SERVICE_KEY
          },
          body: JSON.stringify({ action: "generateImages", jobId: jid })
        });
        
        if (response.ok) {
          log("Worker triggered successfully", { jobId: jid, attempt });
          return;
        }
        
        log("Worker trigger failed", { jobId: jid, attempt, status: response.status });
        if (attempt < retries) await sleep(1000 * attempt); // Exponential backoff
      } catch (e) {
        log("Worker trigger error", { jobId: jid, attempt, error: String(e) });
        if (attempt < retries) await sleep(1000 * attempt);
      }
    }
    log("All worker trigger attempts failed, relying on recovery", { jobId: jid });
  };

  // Fire and don't block the response
  triggerWorker(job.id).catch(() => {});

  return json({
    jobId: job.id,
    status: "queued"
  }, 200);
}

// Worker: claim and generate using Google Gemini
// deno-lint-ignore no-explicit-any
async function generateImages(jobId: string, supabase: SupabaseClient<any>): Promise<Response> {
  const workerStartTime = Date.now();
  log("Worker claiming job", { jobId });
  
  // atomic claim
  const { data: job, error: claimErr } = await supabase.from("image_jobs").update({
    status: "processing",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", jobId).eq("status", "queued").eq("model_type", "gemini") // Ensure we're processing a Gemini job
  .select().single() as { data: ImageJob | null; error: Error | null };
  if (claimErr || !job) {
    const { data: existing } = await supabase.from("image_jobs").select("status").eq("id", jobId).maybeSingle() as { data: { status: string } | null };
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
  const errors: string[] = [];
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
      } catch (e: unknown) {
        failed++;
        const errorMsg = e instanceof Error ? e.message : String(e);
        errors.push(errorMsg);
        log("Image generation failed", {
          jobId,
          index: i,
          error: errorMsg
        });
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
    const durationMs = Date.now() - workerStartTime;
    log("Job completed", {
      jobId,
      finalStatus,
      completed,
      failed,
      duration_ms: durationMs
    });
    await supabase.from("image_jobs").update(update).eq("id", jobId);
    // partial refunds (skip admins)
    if (failed > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", {
        check_user_id: job.user_id
      });
      if (!isAdmin) {
        const refundAmount = failed * calculateImageCost({
          ...(job.settings ?? {}),
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
          p_reason: "failed_gemini_image_generation"
        });
      }
    }
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
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
      const settingsNumber = (job.settings as Record<string, unknown>)?.number as number | undefined;
      const cost = calculateImageCost(job.settings ?? {}) * (settingsNumber ?? job.total ?? 1);
      log("Issuing full refund", {
        jobId,
        cost
      });
      await supabase.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: cost,
        p_reason: "gemini_job_processing_failed"
      });
    }
  }
  return json({
    success: true
  });
}

// Generate 1 image using Google Gemini (with retries/backoff)
// deno-lint-ignore no-explicit-any
async function generateSingleImageWithGemini(job: ImageJob, index: number, sourceImageUrl: string | null, supabase: SupabaseClient<any>): Promise<void> {
  const MAX_ATTEMPTS = 3;
  const settings = job?.settings as Record<string, unknown> | null;
  const size = (settings?.size as string) ?? "1024x1024";
  const quality = (settings?.quality as string) ?? "high";
  const prompt = String(job?.prompt ?? "");
  for(let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
    try {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 90000); // 90s to fail before edge function kill
      let res: Response | undefined;
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
        // Gemini 3 Pro Image Preview
        // Native aspect ratio support for Gemini 3 Pro
        const aspectRatio = settings?.aspectRatio as string | undefined;
        const imageSize = settings?.imageSize as string | undefined;
        const NATIVE_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
        const useNativeAspect = aspectRatio && aspectRatio !== 'source' && NATIVE_ASPECT_RATIOS.includes(aspectRatio);
        // 4K + non-source aspect ratio causes Gemini API timeouts — generate at 4K without aspect, then crop locally
        const use4kFallback = imageSize === '4K' && useNativeAspect;

        log("Generating image with Gemini 3 Pro (image edit mode)", {
          jobId: job.id,
          aspectRatio: aspectRatio || 'none',
          imageSize: imageSize || 'default',
          useNativeAspect,
          use4kFallback
        });

        // Build imageConfig: avoid sending 4K + aspectRatio together
        const imageConfig: Record<string, unknown> = {};
        if (use4kFallback) {
          imageConfig.imageSize = '4K'; // 4K only, crop aspect locally after
          log("4K fallback: sending imageSize only, will crop locally", { jobId: job.id, aspectRatio });
        } else if (useNativeAspect) {
          imageConfig.aspectRatio = aspectRatio;
          if (imageSize) imageConfig.imageSize = imageSize;
        }

        res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": GOOGLE_AI_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Image
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                ...(Object.keys(imageConfig).length > 0 && { imageConfig })
              },
            }),
            signal: controller.signal,
          }
        );
      } else {
        // ----- Text-to-image mode (no source image) -----
        const aspectRatio = settings?.aspectRatio as string | undefined;
        const imageSize = settings?.imageSize as string | undefined;
        const NATIVE_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
        const useNativeAspect = aspectRatio && aspectRatio !== 'source' && NATIVE_ASPECT_RATIOS.includes(aspectRatio);
        const use4kFallback = imageSize === '4K' && useNativeAspect;

        log("Generating image with Gemini 3 Pro (text-to-image mode)", {
          jobId: job.id,
          aspectRatio: aspectRatio || 'none',
          imageSize: imageSize || 'default',
          useNativeAspect,
          use4kFallback
        });

        const imageConfig: Record<string, unknown> = {};
        if (use4kFallback) {
          imageConfig.imageSize = '4K';
          log("4K fallback: sending imageSize only, will crop locally", { jobId: job.id, aspectRatio });
        } else if (useNativeAspect) {
          imageConfig.aspectRatio = aspectRatio;
          if (imageSize) imageConfig.imageSize = imageSize;
        }

        res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": GOOGLE_AI_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                ...(Object.keys(imageConfig).length > 0 && { imageConfig })
              },
            }),
            signal: controller.signal,
          }
        );
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
        // Check if native aspect ratio was used (no cropping needed)
        const aspectRatioSetting = settings?.aspectRatio as string | undefined;
        const imageSizeSetting = settings?.imageSize as string | undefined;
        const NATIVE_ASPECT_RATIOS_CHECK = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
        const usedNativeAspect = aspectRatioSetting && aspectRatioSetting !== 'source' && NATIVE_ASPECT_RATIOS_CHECK.includes(aspectRatioSetting);
        const was4kFallback = imageSizeSetting === '4K' && usedNativeAspect;
        
        let fileBytes: Uint8Array;
        if (was4kFallback && aspectRatioSetting) {
          // 4K fallback: generated at 4K without aspect ratio, crop to requested ratio now
          log("4K fallback: cropping to requested aspect ratio", {
            jobId: job.id,
            index,
            aspectRatio: aspectRatioSetting
          });
          fileBytes = await cropBase64ToAspect(b64, aspectRatioSetting);
        } else if (usedNativeAspect) {
          // Native aspect ratio was used - no cropping needed
          log("Image generated with native aspect ratio, no crop needed", {
            jobId: job.id,
            index,
            aspectRatio: aspectRatioSetting
          });
          fileBytes = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
        } else if (aspectRatioSetting && aspectRatioSetting !== 'source') {
          // Non-native aspect ratio - fallback to cropping
          log("Cropping generated image to non-native aspect ratio", {
            jobId: job.id,
            index,
            aspectRatio: aspectRatioSetting
          });
          fileBytes = await cropBase64ToAspect(b64, aspectRatioSetting);
        } else {
          // No aspect ratio specified OR 'source' selected - preserve original dimensions
          log("Using original image dimensions (no crop)", {
            jobId: job.id,
            index,
            aspectRatio: aspectRatioSetting || 'none'
          });
          fileBytes = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
        }
        // Determine output format from settings (default to PNG)
        const requestedFormat = (settings?.output_format as string) || "png";
        let storedFormat = requestedFormat;
        let contentType = requestedFormat === "webp" ? "image/webp" : "image/png";
        let extension = requestedFormat;
        
        // If webp is requested but we have PNG bytes, convert or keep as PNG
        // (Gemini returns PNG, so we keep as PNG for now - webp conversion could be added later)
        if (requestedFormat === "webp") {
          log("WebP requested but Gemini returns PNG, keeping as PNG for quality", { jobId: job.id });
          storedFormat = "png";
          contentType = "image/png";
          extension = "png";
        }
        
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
        model: "gemini-3.1-flash-image-preview",
        aspectRatio: aspectRatioSetting || 'none',
        nativeAspectRatio: usedNativeAspect
      },
          prompt: prompt,
          source_image_id: job.source_image_id
        });
        if (saveErr) throw new Error(`Failed to save image record: ${saveErr.message}`);
        return; // success
      } finally{
        clearTimeout(timeout);
      }
    } catch (e: unknown) {
      const err = e as Error;
      const msg = err?.message ?? String(e);
      const retryable = /AbortError/.test(err?.name ?? '') || /Gemini API error 5\d\d/.test(msg) || /429/.test(msg) || /Missing image data/.test(msg);
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
// deno-lint-ignore no-explicit-any
async function getSignedSourceUrls(source_image_ids: string[], supabase: SupabaseClient<any>): Promise<string[]> {
  if (!source_image_ids || source_image_ids.length === 0) return [];
  const urls: string[] = [];
  for (const id of source_image_ids) {
    const { data: src } = await supabase.from("source_images")
      .select("storage_path, public_url")
      .eq("id", id)
      .maybeSingle() as { data: { storage_path: string; public_url: string } | null };
    
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
// deno-lint-ignore no-explicit-any
async function getSignedSourceUrl(source_image_id: string | null, supabase: SupabaseClient<any>): Promise<string | null> {
  if (!source_image_id) return null;
  
  const { data: src } = await supabase.from("source_images")
    .select("storage_path, public_url")
    .eq("id", source_image_id)
    .single() as { data: { storage_path: string; public_url: string } | null };
  
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
// deno-lint-ignore no-explicit-any
async function getJob(userId: string, jobId: string, supaUser: SupabaseClient<any>): Promise<Response> {
  const { data: job, error } = await supaUser.from("image_jobs").select("*").eq("id", jobId).eq("user_id", userId).eq("model_type", "gemini") // Only return Gemini jobs
  .single();
  if (error) return errorJson("Job not found", 404);
  return json({
    job
  });
}

// deno-lint-ignore no-explicit-any
async function getJobImages(userId: string, jobId: string, supaUser: SupabaseClient<any>): Promise<Response> {
  const { data: images, error } = await supaUser.from("ugc_images").select("*").eq("job_id", jobId).eq("user_id", userId).order("created_at", {
    ascending: true
  });
  if (error) return errorJson("Failed to fetch images", 400);
  return json({
    images
  });
}

// Cancel job + refund unused credits
// deno-lint-ignore no-explicit-any
async function cancelJob(userId: string, jobId: string, supabase: SupabaseClient<any>): Promise<Response> {
  const { data: job, error } = await supabase.from("image_jobs").update({
    status: "canceled"
  }).eq("id", jobId).eq("user_id", userId).eq("model_type", "gemini") // Only cancel Gemini jobs
  .in("status", [
    "queued",
    "processing"
  ]).select().single() as { data: ImageJob | null; error: Error | null };
  if (error || !job) return errorJson("Job not found or cannot be canceled", 400);
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId
  });
  if (!isAdmin) {
    const settingsNumber = (job.settings as Record<string, unknown>)?.number as number | undefined;
    const totalCost = calculateImageCost(job.settings ?? {}) * (settingsNumber ?? job.total ?? 1);
    const usedCost = calculateImageCost(job.settings ?? {}) * (job.completed ?? 0);
    const refund = Math.max(0, totalCost - usedCost);
    if (refund > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: refund,
        p_reason: "gemini_job_canceled"
      });
    }
  }
  return json({
    success: true
  });
}

// Resume a stuck job (re-triggers worker)
// deno-lint-ignore no-explicit-any
async function resumeJob(userId: string, jobId: string, supabase: SupabaseClient<any>): Promise<Response> {
  // ensure ownership and that it's a Gemini job
  const { data: job, error } = await supabase.from("image_jobs").select("id,user_id,status,completed,total").eq("id", jobId).eq("model_type", "gemini").single() as { data: { id: string; user_id: string; status: string; completed: number | null; total: number | null } | null; error: Error | null };
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);
  const resumable = job.status === "queued" || job.status === "processing" || job.status === "failed" && (job.completed ?? 0) === 0;
  if (!resumable) {
    return json({
      resumed: false,
      reason: "Not resumable"
    });
  }
  // re-trigger (fire-and-forget)
  serviceClient().functions.invoke("ugc-gemini", {
    body: {
      action: "generateImages",
      jobId
    },
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY
    }
  }).catch(() => {
    log("Resume invoke failed", { jobId });
  });
  
  return json({
    resumed: true
  });
}

// Return the latest queued/processing Gemini job for the user
// deno-lint-ignore no-explicit-any
async function getActiveJob(userId: string, supabase: SupabaseClient<any>): Promise<Response> {
  const { data: job, error } = await supabase.from("image_jobs").select("*").eq("user_id", userId).eq("model_type", "gemini") // Only get Gemini jobs
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

// Sweep queued AND stuck processing Gemini jobs
// deno-lint-ignore no-explicit-any
async function recoverQueued(supabase: SupabaseClient<any>): Promise<Response> {
  const queuedCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // queued > 3m
  const processingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // processing > 10m (stuck)
  
  // Recover queued jobs that never started
  const { data: queuedJobs } = await supabase.from("image_jobs")
    .select("id,status,user_id,settings,total")
    .eq("status", "queued")
    .eq("model_type", "gemini")
    .lte("created_at", queuedCutoff)
    .limit(20) as { data: { id: string; status: string; user_id: string; settings: Record<string, unknown> | null; total: number | null }[] | null };
  
  // Recover processing jobs that got stuck (timeout/crash)
  const { data: stuckJobs } = await supabase.from("image_jobs")
    .select("id,status,user_id,settings,total,completed")
    .eq("status", "processing")
    .eq("model_type", "gemini")
    .lte("updated_at", processingCutoff)
    .limit(20) as { data: { id: string; status: string; user_id: string; settings: Record<string, unknown> | null; total: number | null; completed: number | null }[] | null };
  
  let recoveredCount = 0;
  let failedCount = 0;
  
  // Process queued jobs
  for (const j of queuedJobs ?? []) {
    log("Recovering queued job", { jobId: j.id });
    serviceClient().functions.invoke("ugc-gemini", {
      body: { action: "generateImages", jobId: j.id },
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY
      }
    }).catch(() => {
      log("Failed to recover queued job", { jobId: j.id });
    });
    recoveredCount++;
  }
  
  // Process stuck jobs - mark as failed and refund
  for (const j of stuckJobs ?? []) {
    log("Recovering stuck processing job", { jobId: j.id, completed: j.completed });
    
    // Mark as failed
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
          p_reason: "stuck_job_auto_recovery"
        });
        log("Refunded credits for stuck job", { jobId: j.id, refund: refundAmount, costPerImage });
      }
    }
    failedCount++;
  }
  
  return json({
    recovered: recoveredCount,
    failed_recovered: failedCount
  });
}
