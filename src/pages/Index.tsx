// functions/ugc/index.ts
// Supabase Edge Function (Deno)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ----------------------------- CONFIG / CORS ----------------------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

// Tuneables
const DEFAULT_QUALITY: "low" | "medium" | "high" = "medium"; // faster than "high"
const GEN_MAX_RETRIES = 2;               // fewer retries = faster feel
const EDITS_CONCURRENCY = 2;             // small parallelism for edits
const GEN_BATCH_SIZE = 3;                // generations: ask for n at once
const HEARTBEAT_MS = 5000;               // Realtime heartbeat while running

/* --------------------------------- ENV ---------------------------------- */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

/* -------------------------------- UTILS --------------------------------- */

const log = (step: string, meta?: unknown) =>
  console.log(`[UGC] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorJson = (message: string, status = 400, meta?: unknown) => {
  log(`ERROR: ${message}`, meta);
  return json({ error: message }, status);
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function backoffMs(attempt: number) {
  return 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}
function userClient(authorization: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
}

async function getUserIdFromAuth(authHeader: string) {
  const supa = userClient(authHeader);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error("Invalid authentication token");
  return data.user.id;
}

type Settings = {
  size?: string;                     // "1024x1024"
  quality?: "low" | "medium" | "high";
  number?: number;                   // total images
  input_fidelity?: "low" | "medium" | "high"; // for edits
  batch_size?: number;               // optional override for generations batching
  [k: string]: unknown;
};

function calculateImageCost(settings: Settings) {
  const table: Record<string, number> = { low: 1, medium: 1.5, high: 2 };
  return table[settings.quality ?? DEFAULT_QUALITY] ?? 2;
}

/* -------------------------------- ROUTER -------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const action = body?.action ?? new URL(req.url).searchParams.get("action");
    const svc = serviceClient();
    const isInternal = action === "generateImages" || action === "recoverQueued";

    let userId: string | null = null;
    if (isInternal && isServiceCall) {
      // internal worker call
    } else {
      if (!authHeader) return errorJson("Missing authorization header", 401);
      userId = await getUserIdFromAuth(authHeader);
    }

    switch (action) {
      case "createImageJob":
        if (!userId) return errorJson("Auth required", 401);
        return await createImageJob(userId, body, svc);

      case "generateImages": // worker
        if (!(isInternal && isServiceCall)) return errorJson("Forbidden", 403);
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
        if (!(isInternal && isServiceCall)) return errorJson("Forbidden", 403);
        return await recoverQueued(svc);

      default:
        return errorJson(`Unknown action: ${action ?? "none"}`, 400);
    }
  } catch (e: any) {
    return errorJson(e?.message ?? String(e), 500);
  }
});

/* ------------------------------- ACTIONS -------------------------------- */

// Enqueue job, reserve credits, idempotent
async function createImageJob(
  userId: string,
  payload: {
    prompt: string;
    settings: Settings;
    source_image_id?: string | null;
    idempotency_window_minutes?: number;
  },
  supabase: SupabaseClient
) {
  const { prompt, settings, source_image_id } = payload;
  const idempoWindow = payload.idempotency_window_minutes ?? 60;

  log("Create job", { userId, quality: settings?.quality, number: settings?.number });

  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  // Idempotency: try RPC, fall back to local SHA-256
  let contentHash: string;
  try {
    const { data: keyResult, error: keyErr } = await supabase.rpc("generate_idempotency_key", {
      p_user_id: userId,
      p_source_image_id: source_image_id ?? null,
      p_prompt: prompt,
      p_settings: settings,
    });
    if (keyErr || !keyResult) throw keyErr ?? new Error("no key");
    contentHash = keyResult as string;
  } catch (err: any) {
    log("Idempotency RPC failed; falling back to local hash", { message: err?.message });
    const normalized = `${userId}|${source_image_id ?? ""}|${String(prompt).replace(/\s+/g, " ")}|${JSON.stringify(settings)}`;
    contentHash = await sha256Hex(normalized);
  }

  // reuse existing job within window
  const windowStart = new Date(Date.now() - idempoWindow * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("image_jobs")
    .select("*, ugc_images(*)")
    .eq("content_hash", contentHash)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const res: any = { jobId: existing.id, status: existing.status };
    if (existing.status === "completed") {
      res.existingImages = (existing.ugc_images ?? []).map((img: any) => ({
        url: img.public_url,
        prompt: existing.prompt,
      }));
    }
    return json(res, 200);
  }

  // reserve credits (skip admin)
  const totalImages = settings?.number ?? 1;
  const totalCost = (isAdmin ? 0 : calculateImageCost(settings) * totalImages);

  if (!isAdmin) {
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();

    if (!subscriber || (subscriber.credits_balance ?? 0) < totalCost) {
      return errorJson("Insufficient credits", 400, { need: totalCost, have: subscriber?.credits_balance ?? 0 });
    }
    const { data: deduct, error: deductErr } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: totalCost,
      p_reason: "reserve:image_job",
    });
    if (deductErr || !deduct?.success) {
      return errorJson(deduct?.error ?? deductErr?.message ?? "Failed to reserve credits", 400);
    }
  }

  // insert queued job
  const { data: job, error: jobErr } = await supabase
    .from("image_jobs")
    .insert({
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
    })
    .select()
    .single();

  if (jobErr) {
    if (!isAdmin && totalCost > 0) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: totalCost,
        p_reason: "job_creation_failed",
      });
    }
    return errorJson(`Job insert failed: ${jobErr.message}`, 400);
  }

  // Start worker NOW (fastest)
  try {
    // @ts-ignore
    EdgeRuntime?.waitUntil?.(generateImages(job.id, supabase));
  } catch (_) {}

  // Fallback self-invoke (in case waitUntil isn't available)
  try {
    await serviceClient().functions.invoke("ugc", {
      body: { action: "generateImages", jobId: job.id },
    });
  } catch (_) {}

  return json({ jobId: job.id, status: "queued" }, 200);
}

// Worker: claim & generate with batching/concurrency
async function generateImages(jobId: string, supabase: SupabaseClient) {
  log("Worker start", { jobId });

  // atomic claim
  const { data: job, error: claimErr } = await supabase
    .from("image_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress: 3, // early ping so UI doesn't look frozen
    })
    .eq("id", jobId)
    .eq("status", "queued")
    .select()
    .single();

  if (claimErr || !job) {
    const { data: existing } = await supabase.from("image_jobs").select("status").eq("id", jobId).single();
    if (existing?.status === "processing") return json({ message: "Already processing" });
    return errorJson("Job not found or already processed", 404);
  }

  // heartbeat while running (helps Realtime/polling)
  const hb = setInterval(() => {
    supabase.from("image_jobs").update({ updated_at: new Date().toISOString() }).eq("id", jobId);
  }, HEARTBEAT_MS);

  let completed = 0;
  let failed = 0;
  const total = job.total ?? 1;

  try {
    // prepare source blob once
    let sourceBlob: Blob | null = null;
    if (job.source_image_id) {
      const signed = await getSignedSourceUrl(job.source_image_id, supabase);
      if (signed) {
        const src = await fetch(signed);
        sourceBlob = new Blob([await src.arrayBuffer()], {
          type: src.headers.get("content-type") || "image/png",
        });
      }
    }

    // generations: batch using n
    if (!sourceBlob) {
      const batchSize = Math.min(Number(job?.settings?.batch_size) || GEN_BATCH_SIZE, 10);
      for (let i = 0; i < total; i += batchSize) {
        const count = Math.min(batchSize, total - i);
        try {
          const uploaded = await generateBatchGenerations(job, i, count, supabase);
          completed += uploaded;
          const progress = Math.floor((completed / total) * 100);
          await supabase.from("image_jobs").update({ completed, progress, updated_at: new Date().toISOString() }).eq("id", jobId);
        } catch (e: any) {
          failed += count;
          log("Batch(gen) failed", { jobId, start: i, count, error: e?.message ?? String(e) });
        }
      }
    } else {
      // edits: small concurrency (n may not be supported)
      const limit = EDITS_CONCURRENCY;
      let next = 0;
      const runners: Promise<void>[] = [];

      const runOne = async (idx: number) => {
        try {
          await generateOneEdit(job, idx, sourceBlob!, supabase);
          completed++;
          const progress = Math.floor((completed / total) * 100);
          await supabase.from("image_jobs").update({ completed, progress, updated_at: new Date().toISOString() }).eq("id", jobId);
        } catch (e: any) {
          failed++;
          log("Edit failed", { jobId, index: idx, error: e?.message ?? String(e) });
        }
      };

      while (next < total || runners.length) {
        while (runners.length < limit && next < total) {
          runners.push(runOne(next));
          next++;
        }
        await Promise.race(runners).catch(() => {});
        // prune settled promises
        for (let i = runners.length - 1; i >= 0; i--) {
          if ((runners[i] as any).settled) runners.splice(i, 1);
        }
        // mark settled (simple trick)
        runners.forEach((p: any) => (p.settled = true));
      }
    }

    const finalStatus = completed > 0 ? "completed" : "failed";
    const update: any = {
      status: finalStatus,
      completed,
      failed,
      progress: completed > 0 ? 100 : 0,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (finalStatus === "failed") update.error = "generation failed";
    await supabase.from("image_jobs").update(update).eq("id", jobId);

    // partial refunds (skip admins)
    if (failed > 0) {
      const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: job.user_id });
      if (!isAdmin) {
        const refundAmount = failed * calculateImageCost({ ...(job.settings ?? {}), number: 1 });
        await supabase.rpc("refund_user_credits", {
          p_user_id: job.user_id,
          p_amount: refundAmount,
          p_reason: "failed_image_generation",
        });
      }
    }
  } catch (e: any) {
    await supabase
      .from("image_jobs")
      .update({ status: "failed", error: e?.message ?? String(e), finished_at: new Date().toISOString() })
      .eq("id", jobId);

    const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: job.user_id });
    if (!isAdmin) {
      const cost = calculateImageCost(job.settings ?? {}) * ((job.settings?.number ?? job.total) || 1);
      await supabase.rpc("refund_user_credits", {
        p_user_id: job.user_id,
        p_amount: cost,
        p_reason: "job_processing_failed",
      });
    }
  } finally {
    clearInterval(hb);
  }

  return json({ success: true });
}

/* ------------------------ GENERATION IMPLEMENTATION ---------------------- */

// Batch generations using n (fast path)
async function generateBatchGenerations(job: any, startIndex: number, count: number, supabase: SupabaseClient) {
  const size = job?.settings?.size ?? "1024x1024";
  const quality = (job?.settings?.quality ?? DEFAULT_QUALITY) as "low" | "medium" | "high";
  const prompt = String(job?.prompt ?? "");

  // retry loop
  for (let attempt = 1; attempt <= GEN_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size, quality, n: count }),
      });
      const reqId = res.headers.get("x-request-id") || undefined;
      if (!res.ok) {
        const text = await res.text();
        const retryable = res.status >= 500 || res.status === 429;
        if (retryable && attempt < GEN_MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`OpenAI gen ${res.status}${reqId ? ` req=${reqId}` : ""}: ${text}`);
      }

      const jsonResp = await res.json();
      const items: string[] = (jsonResp?.data ?? []).map((d: any) => d?.b64_json).filter(Boolean);
      if (!items.length) throw new Error("No images returned");

      // upload & save
      let uploaded = 0;
      for (let i = 0; i < items.length; i++) {
        const b64 = items[i];
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const idx = startIndex + i;
        const storagePath = `${job.user_id}/${job.id}/${idx}.png`;
        const { error: upErr } = await supabase.storage.from("ugc").upload(storagePath, bytes, {
          contentType: "image/png",
          upsert: false,
        });
        if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage.from("ugc").getPublicUrl(storagePath);
        const { error: saveErr } = await supabase.from("ugc_images").insert({
          job_id: job.id,
          user_id: job.user_id,
          storage_path: storagePath,
          public_url: pub.publicUrl,
          meta: { index: idx, size, quality, provider: "openai", model: "gpt-image-1", prompt },
        });
        if (saveErr) throw new Error(`Save image record failed: ${saveErr.message}`);
        uploaded++;
      }
      return uploaded;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const retryable = /OpenAI gen (5\d\d|429)/.test(msg) || /No images returned/.test(msg);
      if (retryable && attempt < GEN_MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
  return 0;
}

// Single edit (used with small concurrency)
async function generateOneEdit(job: any, index: number, sourceBlob: Blob, supabase: SupabaseClient) {
  const size = job?.settings?.size ?? "1024x1024";
  const quality = (job?.settings?.quality ?? DEFAULT_QUALITY) as "low" | "medium" | "high";
  const prompt = String(job?.prompt ?? "");

  for (let attempt = 1; attempt <= GEN_MAX_RETRIES; attempt++) {
    try {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("image", sourceBlob, "source.png");
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", quality);
      if (job?.settings?.input_fidelity) form.append("input_fidelity", String(job.settings.input_fidelity));

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      });
      const reqId = res.headers.get("x-request-id") || undefined;
      if (!res.ok) {
        const text = await res.text();
        const retryable = res.status >= 500 || res.status === 429;
        if (retryable && attempt < GEN_MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`OpenAI edit ${res.status}${reqId ? ` req=${reqId}` : ""}: ${text}`);
      }

      const jsonResp = await res.json();
      const b64 = jsonResp?.data?.[0]?.b64_json;
      if (!b64) {
        if (attempt < GEN_MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error("Missing b64_json");
      }

      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const storagePath = `${job.user_id}/${job.id}/${index}.png`;
      const { error: upErr } = await supabase.storage.from("ugc").upload(storagePath, bytes, {
        contentType: "image/png",
        upsert: false,
      });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
      const { data: pub } = supabase.storage.from("ugc").getPublicUrl(storagePath);
      const { error: saveErr } = await supabase.from("ugc_images").insert({
        job_id: job.id,
        user_id: job.user_id,
        storage_path: storagePath,
        public_url: pub.publicUrl,
        meta: { index, size, quality, provider: "openai", model: "gpt-image-1", prompt },
      });
      if (saveErr) throw new Error(`Save image record failed: ${saveErr.message}`);
      return;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const retryable = /OpenAI edit (5\d\d|429)/.test(msg) || /Missing b64_json/.test(msg);
      if (retryable && attempt < GEN_MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
}

/* ------------------------------- HELPERS -------------------------------- */

async function getSignedSourceUrl(source_image_id: string | null, supabase: SupabaseClient) {
  if (!source_image_id) return null;
  const { data: src } = await supabase.from("source_images").select("storage_path").eq("id", source_image_id).single();
  if (!src?.storage_path) return null;
  const { data: signed } = await supabase.storage.from("ugc-inputs").createSignedUrl(src.storage_path, 3600);
  return signed?.signedUrl ?? null;
}

/* ------------------------------ USER READS ------------------------------ */

async function getJob(userId: string, jobId: string, supaUser: SupabaseClient) {
  const { data: job, error } = await supaUser
    .from("image_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
  if (error) return errorJson("Job not found", 404);
  return json({ job });
}

async function getJobImages(userId: string, jobId: string, supaUser: SupabaseClient) {
  const { data: images, error } = await supaUser
    .from("ugc_images")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return errorJson("Failed to fetch images", 400);
  return json({ images });
}

/* --------------------------- CANCEL / RESUME ---------------------------- */

async function cancelJob(userId: string, jobId: string, supabase: SupabaseClient) {
  const { data: job, error } = await supabase
    .from("image_jobs")
    .update({ status: "canceled" })
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("status", ["queued", "processing"])
    .select()
    .single();
  if (error || !job) return errorJson("Job not found or cannot be canceled", 400);

  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });
  if (!isAdmin) {
    const totalCost = calculateImageCost(job.settings ?? {}) * ((job.settings?.number ?? job.total) || 1);
    const usedCost = calculateImageCost(job.settings ?? {}) * (job.completed ?? 0);
    const refund = Math.max(0, totalCost - usedCost);
    if (refund > 0) {
      await supabase.rpc("refund_user_credits", { p_user_id: userId, p_amount: refund, p_reason: "job_canceled" });
    }
  }
  return json({ success: true });
}

async function resumeJob(userId: string, jobId: string, supabase: SupabaseClient) {
  const { data: job, error } = await supabase
    .from("image_jobs")
    .select("id,user_id,status,completed,total")
    .eq("id", jobId)
    .single();
  if (error || !job) return errorJson("Job not found", 404);
  if (job.user_id !== userId) return errorJson("Forbidden", 403);

  const resumable =
    job.status === "queued" ||
    job.status === "processing" ||
    (job.status === "failed" && (job.completed ?? 0) === 0);
  if (!resumable) return json({ resumed: false, reason: "Not resumable" });

  try {
    await serviceClient().functions.invoke("ugc", { body: { action: "generateImages", jobId } });
  } catch (_) {
    try {
      // @ts-ignore
      EdgeRuntime?.waitUntil?.(generateImages(jobId, supabase));
    } catch (_) {}
  }
  return json({ resumed: true });
}

/* --------------------------- ACTIVE / RECOVER --------------------------- */

async function getActiveJob(userId: string, supabase: SupabaseClient) {
  const { data: job, error } = await supabase
    .from("image_jobs")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && (error as any).code !== "PGRST116") return errorJson("Failed to fetch active job", 400);
  return json({ job: job ?? null });
}

async function recoverQueued(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // older than 3 min
  const { data: jobs, error } = await supabase
    .from("image_jobs")
    .select("id,status")
    .eq("status", "queued")
    .lte("created_at", cutoff)
    .limit(20);
  if (error) return errorJson("Failed to list queued jobs", 400);

  for (const j of jobs ?? []) {
    try {
      await serviceClient().functions.invoke("ugc", { body: { action: "generateImages", jobId: j.id } });
    } catch (_) {}
  }
  return json({ recovered: jobs?.length ?? 0 });
}
