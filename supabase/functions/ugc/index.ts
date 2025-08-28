// index.ts — UGC Jobs (durable) for ProduktPix
// Deno + Supabase Edge Functions

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

const INPUT_BUCKET = "ugc-inputs";
const OUTPUT_BUCKET = "ugc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // if you need cookies, reflect origin and enable credentials instead
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

// Service-role client for backend operations (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// -------- Utilities --------
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function backoffMs(attempt: number) { return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250); }

type Quality = "low" | "medium" | "high";

type CreateJobSettings = {
  number: number;
  size: "1024x1024" | "1536x1024" | "1024x1536" | string;
  quality: Quality;
  orientation?: "1:1" | "3:2" | "2:3";
  style?: string;
  timeOfDay?: string;
  highlight?: boolean;
  output_format?: "png" | "webp";
  input_fidelity?: "low" | "medium" | "high";
  // optional direct storage path to the uploaded image in INPUT_BUCKET
  source_storage_path?: string;
};

function normalizeSettings(raw: any): CreateJobSettings {
  return {
    number: Math.max(1, Number(raw?.number) || 1),
    size: (raw?.size as string) || "1024x1024",
    quality: (raw?.quality as Quality) || "high",
    orientation: raw?.orientation ?? undefined,
    style: raw?.style ?? undefined,
    timeOfDay: raw?.timeOfDay ?? undefined,
    highlight: !!raw?.highlight,
    output_format: (raw?.output_format as "png" | "webp") || "png",
    input_fidelity: (raw?.input_fidelity as "low" | "medium" | "high") || undefined,
    source_storage_path: raw?.source_storage_path ?? undefined
  };
}

// Simple credits cost function (keep consistent with your UI)
function calculateImageCost(settings: CreateJobSettings) {
  const qualityCosts: Record<Quality, number> = { low: 1, medium: 1.5, high: 2 };
  return qualityCosts[settings.quality] ?? 2;
}

// -------- HTTP Entrypoint --------
serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Parse body once
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const action = body?.action;
    const authHeader = req.headers.get("Authorization") || "";
    const apiKeyHeader = req.headers.get("apikey") || "";

    // “Internal” when called with service key (either Authorization or apikey header)
    const isServiceCall =
      authHeader === `Bearer ${supabaseServiceKey}` || apiKeyHeader === supabaseServiceKey;
    const isInternalAction = action === "generateImages" || action === "recoverQueued";

    // Client-scoped (RLS) client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Require user auth for non-internal paths
    let userId: string | null = null;
    if (isInternalAction && isServiceCall) {
      // allowed: worker/sweeper with service role
    } else {
      if (!authHeader) throw new Error("Missing authorization header");
      const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
      if (userErr || !user) throw new Error("Invalid authentication token");
      userId = user.id;
    }

    // Route
    const payload = { ...body }; delete payload.action;

    switch (action) {
      case "createImageJob":
        if (!userId) throw new Error("Auth required");
        return await createImageJob(userId, payload, supabaseService);

      case "generateImages": // worker
        if (!(isInternalAction && isServiceCall)) throw new Error("Forbidden");
        if (!payload?.jobId) throw new Error("Missing jobId");
        return await generateImages(payload.jobId, supabaseService);

      case "getJob":
        if (!userId) throw new Error("Auth required");
        if (!payload?.jobId) throw new Error("Missing jobId");
        return await getJob(userId, payload.jobId, supabaseClient);

      case "getJobImages":
        if (!userId) throw new Error("Auth required");
        if (!payload?.jobId) throw new Error("Missing jobId");
        return await getJobImages(userId, payload.jobId, supabaseClient);

      case "cancelJob":
        if (!userId) throw new Error("Auth required");
        if (!payload?.jobId) throw new Error("Missing jobId");
        return await cancelJob(userId, payload.jobId, supabaseService);

      case "recoverQueued": // optional sweeper
        if (!(isInternalAction && isServiceCall)) throw new Error("Forbidden");
        return await recoverQueued(supabaseService);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("UGC function error:", error);
    return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// -------- Actions --------
async function createImageJob(userId: string, payload: any, supabase: SupabaseClient) {
  const {
    prompt,
    settings: rawSettings,
    source_image_id,
    idempotency_window_minutes = 60
  } = payload ?? {};

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid or missing prompt");
  }

  const settings = normalizeSettings(rawSettings);
  const totalCost = calculateImageCost(settings) * settings.number;

  // Admin?
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  if (adminErr) throw new Error(`is_user_admin failed: ${adminErr.message}`);

  // Idempotency key
  const { data: keyResult, error: keyErr } = await supabase.rpc("generate_idempotency_key", {
    p_user_id: userId,
    p_source_image_id: source_image_id || null,
    p_prompt: prompt,
    p_settings: settings
  });
  if (keyErr) throw new Error(`generate_idempotency_key failed: ${keyErr.message}`);
  const idempotencyKey = keyResult as string;

  // Existing job within window
  const windowStartIso = new Date(Date.now() - idempotency_window_minutes * 60 * 1000).toISOString();
  const { data: existingJob, error: existErr } = await supabase
    .from("image_jobs")
    .select("*, ugc_images(*)")
    .eq("content_hash", idempotencyKey)
    .gte("created_at", windowStartIso)
    .maybeSingle();

  if (existErr && existErr.code !== "PGRST116") {
    console.warn("[createImageJob] existing lookup warning:", existErr.message);
  }
  if (existingJob) {
    const resp: any = { jobId: existingJob.id, status: existingJob.status };
    if (existingJob.status === "completed" && Array.isArray(existingJob.ugc_images)) {
      resp.existingImages = existingJob.ugc_images.map((img: any) => ({
        url: img.public_url,
        prompt: existingJob.prompt
      }));
    }
    return new Response(JSON.stringify(resp), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Reserve credits unless admin
  if (!isAdmin) {
    const { data: sub, error: subErr } = await supabase
      .from("subscribers")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();
    if (subErr) throw new Error(`Failed to read subscriber: ${subErr.message}`);
    if (!sub || typeof sub.credits_balance !== "number" || sub.credits_balance < totalCost) {
      throw new Error("Insufficient credits");
    }
    const { data: creditResult, error: reserveErr } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: totalCost,
      p_reason: "reserve:image_job"
    });
    if (reserveErr) throw new Error(`Credit reservation failed: ${reserveErr.message}`);
    if (!creditResult?.success) throw new Error(creditResult?.error || "Credit reservation failed");
  }

  // Insert job (persist source_image_id if provided)
  const insertPayload: any = {
    user_id: userId,
    prompt,
    settings,
    content_hash: idempotencyKey,
    total: settings.number,
    progress: 0,
    completed: 0,
    failed: 0,
    status: "queued"
  };
  if (source_image_id) insertPayload.source_image_id = source_image_id;

  const { data: job, error: jobErr } = await supabase
    .from("image_jobs")
    .insert(insertPayload)
    .select()
    .single();

  if (jobErr) {
    if (!isAdmin) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: totalCost,
        p_reason: "job_creation_failed"
      }).catch((e: any) => console.error("[createImageJob] refund on insert fail:", e?.message));
    }
    throw new Error(`Job insert failed: ${jobErr.message}`);
  }

  // Fire-and-forget: trigger worker with service role (do NOT await)
  supabase.functions
    .invoke("ugc", {
      body: { action: "generateImages", jobId: job.id },
      headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey }
    })
    .then(() => console.log(`[createImageJob] worker triggered for job ${job.id}`))
    .catch((e: any) => console.error("[createImageJob] worker trigger failed:", e?.message));

  return new Response(JSON.stringify({ jobId: job.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function generateImages(jobId: string, supabase: SupabaseClient) {
  console.log(`[worker] generateImages start job=${jobId}`);

  // Claim the job atomically
  const { data: job, error: claimErr } = await supabase
    .from("image_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select()
    .single();

  if (claimErr || !job) {
    console.error("[worker] claim failed:", claimErr);
    const { data: row } = await supabase.from("image_jobs").select("status").eq("id", jobId).single();
    if (row?.status === "processing") {
      return new Response(JSON.stringify({ message: "already processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Job not found or already processed" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Resolve source image signed URL (settings.source_storage_path OR source_image_id → source_images.storage_path)
  let sourceImageUrl: string | null = null;
  const sourcePath = job?.settings?.source_storage_path as string | undefined;
  if (sourcePath) {
    const { data: signedA } = await supabase.storage.from(INPUT_BUCKET).createSignedUrl(sourcePath, 3600);
    sourceImageUrl = signedA?.signedUrl ?? null;
  } else if (job.source_image_id) {
    const { data: row } = await supabase
      .from("source_images")
      .select("storage_path")
      .eq("id", job.source_image_id)
      .single();
    if (row?.storage_path) {
      const { data: signedB } = await supabase.storage.from(INPUT_BUCKET).createSignedUrl(row.storage_path, 3600);
      sourceImageUrl = signedB?.signedUrl ?? null;
    }
  }

  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (let i = 0; i < job.total; i++) {
      try {
        await generateSingleImage(job, i, sourceImageUrl, supabase);
        completed++;
        await supabase
          .from("image_jobs")
          .update({
            completed,
            progress: Math.floor((completed / job.total) * 100),
            updated_at: new Date().toISOString()
          })
          .eq("id", jobId);
      } catch (e: any) {
        console.error(`[worker] image ${i} failed:`, e?.message || e);
        failed++;
        errors.push(e?.message || String(e));
      }
    }

    const finalStatus = completed > 0 ? "completed" : "failed";
    await supabase
      .from("image_jobs")
      .update({
        status: finalStatus,
        completed,
        failed,
        progress: completed > 0 ? 100 : 0,
        error: finalStatus === "failed" ? errors.join("; ") : null,
        finished_at: new Date().toISOString()
      })
      .eq("id", jobId);

    // Partial refunds when some images failed (skip admins)
    if (failed > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: job.user_id });
      if (!isAdmin) {
        const refund = failed * calculateImageCost(job.settings);
        await supabase.rpc("refund_user_credits", {
          p_user_id: job.user_id,
          p_amount: refund,
          p_reason: "failed_image_generation"
        }).catch((e: any) => console.error("[worker] refund partial error:", e?.message));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("[worker] fatal job error:", e?.message || e);
    await supabase
      .from("image_jobs")
      .update({
        status: "failed",
        error: e?.message || String(e),
        finished_at: new Date().toISOString()
      })
      .eq("id", jobId);

    const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: job.user_id });
    if (!isAdmin) {
      const total = calculateImageCost(job.settings) * (job.settings.number || 1);
      await supabase.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: total,
        p_reason: "job_processing_failed"
      }).catch((err: any) => console.error("[worker] refund total error:", err?.message));
    }

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

async function generateSingleImage(job: any, index: number, sourceImageUrl: string | null, supabase: SupabaseClient) {
  const MAX_ATTEMPTS = 3;

  const size: string = job?.settings?.size || "1024x1024";
  const quality: Quality = (job?.settings?.quality ?? "high") as Quality;
  const prompt: string = String(job?.prompt ?? "");

  let lastErr: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      let res: Response;
      let requestId: string | undefined;

      if (sourceImageUrl) {
        // Edits endpoint — multipart form
        const src = await fetch(sourceImageUrl);
        if (!src.ok) throw new Error(`Failed to fetch source image: ${src.status} ${await src.text()}`);
        const ctype = src.headers.get("content-type") || "image/png";
        const buf = await src.arrayBuffer();
        const blob = new Blob([buf], { type: ctype });
        const ext = (ctype.split("/")[1] || "png").split(";")[0];

        const form = new FormData();
        form.append("model", "gpt-image-1");
        form.append("image", blob, `source.${ext}`);
        form.append("prompt", prompt);
        form.append("size", size);
        form.append("quality", quality);
        if (job?.settings?.input_fidelity) form.append("input_fidelity", String(job.settings.input_fidelity));
        // gpt-image-1 always returns base64; no response_format field

        res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}` },
          body: form,
          signal: controller.signal
        });
      } else {
        // Generations endpoint — JSON
        const body = { model: "gpt-image-1", prompt, size, quality };
        res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      }

      clearTimeout(timeout);
      requestId = res.headers.get("x-request-id") || undefined;

      if (!res.ok) {
        const text = await res.text();
        const retryable = res.status >= 500 || res.status === 429;
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`OpenAI error ${res.status}${requestId ? ` req=${requestId}` : ""}: ${text}`);
      }

      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`Missing b64_json in response${requestId ? ` req=${requestId}` : ""}`);
      }

      // Upload to storage
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const storagePath = `${job.user_id}/${job.id}/${index}.png`;

      const { error: uploadError } = await supabase
        .storage
        .from(OUTPUT_BUCKET)
        .upload(storagePath, bytes, { contentType: "image/png", upsert: false });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage.from(OUTPUT_BUCKET).getPublicUrl(storagePath);

      const { error: saveError } = await supabase.from("ugc_images").insert({
        job_id: job.id,
        user_id: job.user_id,
        storage_path: storagePath,
        public_url: publicUrl.publicUrl,
        meta: {
          index,
          size,
          quality,
          openai_request_id: requestId
        }
      });
      if (saveError) throw new Error(`Failed to save image record: ${saveError.message}`);

      return; // success
    } catch (e: any) {
      lastErr = e;
      const msg = e?.message || String(e);
      const retryable =
        e?.name === "AbortError" || /OpenAI error 5\d\d/.test(msg) || /429/.test(msg) || /Missing b64_json/.test(msg);
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`OpenAI API error (attempt ${attempt}/${MAX_ATTEMPTS}): ${msg}`);
    }
  }

  throw lastErr ?? new Error("Unknown error in generateSingleImage");
}

async function getJob(userId: string, jobId: string, supabase: SupabaseClient) {
  const { data: job, error } = await supabase
    .from("image_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error("Job not found");

  return new Response(JSON.stringify({ job }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function getJobImages(userId: string, jobId: string, supabase: SupabaseClient) {
  const { data: images, error } = await supabase
    .from("ugc_images")
    .select("*")
    .eq("job_id", '76069656-e420-4eb6-87a1-ebca666ff3df')
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Failed to fetch images");

  return new Response(JSON.stringify({ images }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function cancelJob(userId: string, jobId: string, supabase: SupabaseClient) {
  const { data: job, error } = await supabase
    .from("image_jobs")
    .update({ status: "canceled" })
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("status", ["queued", "processing"])
    .select()
    .single();
  if (error || !job) throw new Error("Job not found or cannot be canceled");

  // Refund remaining credits (skip admins)
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  if (!isAdmin) {
    const totalCost = calculateImageCost(job.settings) * (job.settings.number || 1);
    const usedCost = calculateImageCost(job.settings) * (job.completed || 0);
    const refundAmount = Math.max(0, totalCost - usedCost);
    if (refundAmount > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: refundAmount,
        p_reason: "job_canceled"
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// Optional: sweeper to recover stuck queued jobs (> 60s old)
async function recoverQueued(supabase: SupabaseClient) {
  const { data: job } = await supabase
    .from("image_jobs")
    .select("id")
    .eq("status", "queued")
    .lt("created_at", new Date(Date.now() - 60_000).toISOString())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return new Response(JSON.stringify({ recovered: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  supabase.functions.invoke("ugc", {
    body: { action: "generateImages", jobId: job.id },
    headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey }
  }).catch((e: any) => console.error("[sweeper] trigger failed:", e?.message));

  return new Response(JSON.stringify({ recovered: 1, jobId: job.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
