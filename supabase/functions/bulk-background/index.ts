import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SettingsPayload {
  outputFormat?: 'png' | 'webp';
  quality?: 'high' | 'medium';
  customPrompt?: string;
  editRequest?: string;
  imageSize?: string;
  aspectRatio?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY")!;
const GEMINI_MODEL = "gemini-3-pro-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const STORAGE_BUCKET = "bulk-backgrounds";

function getCreditsPerImage(settings: Record<string, unknown> | null): number {
  const size = (settings as any)?.imageSize || '1K';
  return size === '4K' ? 4 : size === '2K' ? 2 : 1;
}

const BASE_PROMPT = `Ultra-realistic studio product photo. Use reference for environment/lighting only. Product image is the ONLY geometry source. No 3D reconstruction, exact proportions preserved, no stretching/warping. Match scene by scale/position/rotation. Soft grounded shadows. No floating. Natural lens, no CGI. No added objects. Prioritize geometric accuracy.`;

const PRESET_HINTS: Record<string, string> = {
  'white-seamless':'white seamless studio, soft light','black-studio':'black matte studio, rim lighting',
  'gradient-gray':'gray gradient, catalog style','soft-pink':'pastel pink, feminine',
  'living-room':'modern living room, natural light','kitchen':'modern kitchen, marble counter',
  'bedroom':'cozy bedroom, neutral tones','home-office':'modern office with plants',
  'beach':'beach, golden light','forest':'serene forest, filtered light',
  'garden':'colorful garden','mountain':'majestic mountain landscape',
  'cafe':'rustic café, warm ambience','street':'modern urban street',
  'rooftop':'rooftop, city skyline','subway':'modern subway station',
  'editorial':'editorial high-fashion setup','fashion':'fashion photography studio',
  'minimal':'ultra-minimal, negative space','vogue':'luxurious Vogue style',
  'christmas':'festive Christmas scene','summer':'vibrant tropical summer',
  'autumn':'autumn, colorful leaves','spring':'spring, blooming flowers'
};

const FOLLOWUP_PROMPT = `Second image is reference scene. REMOVE any product in it. Extract ONLY background/lighting/surface. Place NEW product (first image) into that scene. Match background exactly. Only first image product visible. Maintain size/proportions.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function uploadToStorage(adminClient: any, imageData: Uint8Array, storagePath: string, contentType: string) {
  const { error } = await adminClient.storage.from(STORAGE_BUCKET).upload(storagePath, imageData, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let b = "";
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

function buildPrompt(presetId: string | null, hasCustomBg: boolean, customPrompt?: string, isFollowUp = false, editRequest?: string): string {
  let p = BASE_PROMPT;
  if (customPrompt) {
    p += `\n\nCena pretendida: ${customPrompt}`;
    if (isFollowUp) p += `\n\n${FOLLOWUP_PROMPT}`;
  } else if (hasCustomBg || isFollowUp) {
    p += isFollowUp ? `\n\n${FOLLOWUP_PROMPT}` : "\n\nNOTA: Use a segunda imagem fornecida como fundo.";
  } else if (presetId && PRESET_HINTS[presetId]) {
    p += `\n\n${PRESET_HINTS[presetId]}`;
  }
  if (editRequest) {
    p += `\n\nAdditional editing instructions: ${editRequest}`;
  }
  return p;
}

function extractBase64Image(data: unknown): string | null {
  for (const c of ((data as any)?.candidates || [])) {
    for (const p of (c?.content?.parts || [])) {
      if (p?.inlineData?.data) return p.inlineData.data;
    }
  }
  return null;
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

function bytesToB64(bytes: Uint8Array): string {
  let b = "";
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

async function callGemini(parts: unknown[], settings?: SettingsPayload | null) {
  return fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": GOOGLE_AI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: settings?.aspectRatio, imageSize: settings?.imageSize } },
    }),
  });
}

async function generateImageWithRetry(productB64: string, bgB64: string | null, prompt: string, maxRetries = 3, settings: SettingsPayload | null): Promise<Uint8Array | null> {
  for (let a = 1; a <= maxRetries; a++) {
    try {
      if (a > 1) await sleep(Math.pow(2, a - 1) * 1000 + Math.random() * 500);
      const parts: unknown[] = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: productB64 } }];
      if (bgB64) parts.push({ inlineData: { mimeType: "image/jpeg", data: bgB64 } });
      const res = await callGemini(parts, settings);
      if (!res.ok) {
        console.error(`[Attempt ${a}] Gemini error (${res.status}):`, await res.text());
        if (a === maxRetries) return null;
        continue;
      }
      const img = extractBase64Image(await res.json());
      if (!img) { if (a === maxRetries) return null; continue; }
      return b64ToBytes(img);
    } catch (e) { console.error(`[Attempt ${a}]`, e); if (a === maxRetries) return null; }
  }
  return null;
}

async function triggerWorker(jobId: string, retry = 0): Promise<void> {
  try {
    await sleep(Math.pow(2, retry) * 1000);
    const r = await fetch(`${SUPABASE_URL}/functions/v1/bulk-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ action: "processJob", jobId }),
    });
    if (!r.ok && retry < 3) return triggerWorker(jobId, retry + 1);
  } catch (e) { console.error("Worker trigger error:", e); if (retry < 3) return triggerWorker(jobId, retry + 1); }
}

interface BJJob { id: string; user_id: string; status: string; background_type: string; background_preset_id: string | null; background_image_url: string | null; total_images: number; completed_images: number; failed_images: number; settings: Record<string, unknown> | null; }
interface BJResult { id: string; job_id: string; source_image_url: string; status: string; image_index: number; retry_count: number; }

async function processSingleResult(result: BJResult, job: BJJob, ac: any, bgB64: string | null, isFollowUp = false): Promise<{ success: boolean; error?: string; imageData?: Uint8Array }> {
  const t0 = Date.now();
  try {
    await (ac.from("bulk_background_results") as any).update({ status: "processing", last_attempt_at: new Date().toISOString(), retry_count: result.retry_count + 1 }).eq("id", result.id);
    const productB64 = await fetchImageAsBase64(result.source_image_url);
    const prompt = buildPrompt(job.background_preset_id, !!bgB64, (job.settings as any)?.customPrompt, isFollowUp, (job.settings as any)?.editRequest);
    const img = await generateImageWithRetry(productB64, bgB64, prompt, 3, job.settings as any);
    if (!img) throw new Error("Image generation failed after all retries");
    const sp = `${job.user_id}/${job.id}/${result.image_index}-result.webp`;
    const { storagePath: fp, publicUrl } = await uploadToStorage(ac, img, sp, "image/webp");
    await (ac.from("bulk_background_results") as any).update({ status: "completed", result_url: publicUrl, storage_path: fp, processing_time_ms: Date.now() - t0, updated_at: new Date().toISOString() }).eq("id", result.id);
    return { success: true, imageData: img };
  } catch (e) {
    console.error(`Failed result ${result.id}:`, e);
    await (ac.from("bulk_background_results") as any).update({ status: "failed", error: e instanceof Error ? e.message : "Processing failed", updated_at: new Date().toISOString() }).eq("id", result.id);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function checkAdmin(ac: any, uid: string) {
  const { data } = await ac.rpc("is_admin", { check_user_id: uid });
  return data === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    let userId: string | null = null;
    if (!isServiceRole) {
      const sc = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader || "" } } });
      const { data: { user }, error } = await sc.auth.getUser();
      if (error || !user) return errorResponse("Unauthorized", 401);
      userId = user.id;
    }
    const ac = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case "createJob": {
        if (!userId) return errorResponse("Unauthorized", 401);
        const { sourceImageIds, backgroundType, backgroundPresetId, backgroundImageUrl, settings } = body;
        if (!sourceImageIds?.length) return errorResponse("No source images provided");
        if (backgroundType === "preset" && !backgroundPresetId) return errorResponse("No background preset selected");
        if (backgroundType === "custom" && !backgroundImageUrl) return errorResponse("No custom background provided");
        const { data: sourceImages, error: srcErr } = await ac.from("source_images").select("id, public_url").in("id", sourceImageIds);
        if (srcErr || !sourceImages?.length) return errorResponse("Failed to fetch source images");
        const isAdmin = await checkAdmin(ac, userId);
        const creditsPerImg = getCreditsPerImage(settings || null);
        const totalCost = sourceImages.length * creditsPerImg;
        if (!isAdmin) {
          const { data: sub } = await ac.from("subscribers").select("credits_balance").eq("user_id", userId).single();
          if (!sub || sub.credits_balance < totalCost) return json({ error: "Insufficient credits", required: totalCost, available: sub?.credits_balance || 0 }, 400);
          const { error: dErr } = await ac.rpc("deduct_user_credits", { p_user_id: userId, p_amount: totalCost, p_reason: "bulk_background_generation" });
          if (dErr) return errorResponse("Failed to deduct credits", 500);
        }
        const finalBgUrl = backgroundType === "custom" ? backgroundImageUrl : null;
        const { data: job, error: jErr } = await ac.from("bulk_background_jobs").insert({ user_id: userId, status: "queued", background_type: backgroundType, background_preset_id: backgroundPresetId || null, background_image_url: finalBgUrl, total_images: sourceImages.length, settings: settings || {} }).select().single();
        if (jErr || !job) {
          if (!isAdmin) await ac.rpc("refund_user_credits", { p_user_id: userId, p_amount: totalCost, p_reason: "bulk_background_job_creation_failed" });
          return errorResponse("Failed to create job", 500);
        }
        await ac.from("bulk_background_results").insert(sourceImages.map((img: any, i: number) => ({ job_id: job.id, user_id: userId, source_image_id: img.id, source_image_url: img.public_url, status: "pending", image_index: i, retry_count: 0 })));
        triggerWorker(job.id);
        return json({ jobId: job.id });
      }

      case "processJob": {
        if (!isServiceRole) return errorResponse("Forbidden", 403);
        const { jobId } = body;
        const { data: job } = await ac.from("bulk_background_jobs").select("*").eq("id", jobId).single();
        if (!job) return errorResponse("Job not found", 404);
        if (["completed", "failed", "canceled"].includes(job.status)) return json({ status: job.status });
        if (job.status === "queued") await ac.from("bulk_background_jobs").update({ status: "processing", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", jobId);
        const { data: results } = await ac.from("bulk_background_results").select("*").eq("job_id", jobId).in("status", ["pending", "processing"]).order("image_index");
        if (!results?.length) {
          const { data: all } = await ac.from("bulk_background_results").select("status").eq("job_id", jobId);
          const fc = all?.filter((r: any) => r.status === "failed").length || 0;
          const cc = all?.filter((r: any) => r.status === "completed").length || 0;
          const fs = cc === 0 ? "failed" : "completed";
          await ac.from("bulk_background_jobs").update({ status: fs, completed_images: cc, failed_images: fc, progress: 100, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", jobId);
          return json({ status: fs, completed: cc, failed: fc });
        }
        let bgB64: string | null = null;
        if (job.background_type === "custom" && job.background_image_url) { try { bgB64 = await fetchImageAsBase64(job.background_image_url); } catch (e) { console.error("Bg fetch failed:", e); } }
        let cc = job.completed_images || 0, fc = job.failed_images || 0;
        let refB64: string | null = null;
        const isPre = job.background_type === "preset";
        for (const r of results) {
          const { data: cur } = await ac.from("bulk_background_jobs").select("status").eq("id", jobId).single();
          if (cur?.status === "canceled") break;
          const bg = (isPre && refB64) ? refB64 : bgB64;
          const pr = await processSingleResult(r as BJResult, job as BJJob, ac, bg, isPre && !!refB64);
          if (pr.success) { cc++; if (isPre && pr.imageData) refB64 = bytesToB64(pr.imageData); } else fc++;
          await ac.from("bulk_background_jobs").update({ completed_images: cc, failed_images: fc, progress: Math.round(((cc + fc) / job.total_images) * 100), updated_at: new Date().toISOString() }).eq("id", jobId);
        }
        const { data: fj } = await ac.from("bulk_background_jobs").select("status").eq("id", jobId).single();
        if (fj?.status === "canceled") return json({ status: "canceled" });
        if (fc > 0) { const adm = await checkAdmin(ac, job.user_id); if (!adm) await ac.rpc("refund_user_credits", { p_user_id: job.user_id, p_amount: fc * getCreditsPerImage(job.settings || null), p_reason: "bulk_background_failed_images_refund" }); }
        const fs = cc === 0 ? "failed" : "completed";
        await ac.from("bulk_background_jobs").update({ status: fs, finished_at: new Date().toISOString(), error: fc > 0 ? `${fc} image(s) failed` : null, updated_at: new Date().toISOString() }).eq("id", jobId);
        return json({ status: fs, completed: cc, failed: fc });
      }

      case "retryResult": {
        if (!userId) return errorResponse("Unauthorized", 401);
        const { resultId } = body;
        const { data: result } = await ac.from("bulk_background_results").select("*, bulk_background_jobs!inner(user_id, background_type, background_preset_id, background_image_url, total_images, settings)").eq("id", resultId).single();
        if (!result) return errorResponse("Result not found", 404);
        const jd = result.bulk_background_jobs as any;
        if (jd.user_id !== userId) return errorResponse("Forbidden", 403);
        if (result.status !== "failed") return errorResponse("Only failed results can be retried");
        const isAdmin = await checkAdmin(ac, userId);
        const cpi = getCreditsPerImage(jd.settings || null);
        if (!isAdmin) {
          const { data: sub } = await ac.from("subscribers").select("credits_balance").eq("user_id", userId).single();
          if (!sub || sub.credits_balance < cpi) return errorResponse("Insufficient credits", 402);
          await ac.rpc("deduct_user_credits", { p_user_id: userId, p_amount: cpi, p_reason: "bulk_background_retry" });
        }
        await ac.from("bulk_background_results").update({ status: "pending", error: null, updated_at: new Date().toISOString() }).eq("id", resultId);
        let bgB64: string | null = null;
        if (jd.background_type === "custom" && jd.background_image_url) { try { bgB64 = await fetchImageAsBase64(jd.background_image_url); } catch (e) { console.error("Bg fetch failed:", e); } }
        const pr = await processSingleResult({ id: result.id, job_id: result.job_id, source_image_url: result.source_image_url, status: "pending", image_index: result.image_index, retry_count: result.retry_count || 0 }, { id: result.job_id, user_id: jd.user_id, status: "processing", background_type: jd.background_type, background_preset_id: jd.background_preset_id, background_image_url: jd.background_image_url, total_images: jd.total_images, completed_images: 0, failed_images: 0, settings: jd.settings || null }, ac, bgB64);
        if (!pr.success) { if (!isAdmin) await ac.rpc("refund_user_credits", { p_user_id: userId, p_amount: cpi, p_reason: "bulk_background_retry_failed_refund" }); return json({ success: false, error: pr.error }); }
        return json({ success: true });
      }

      case "recoverJobs": {
        if (!isServiceRole) return errorResponse("Forbidden", 403);
        const qCut = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const sCut = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: qj } = await ac.from("bulk_background_jobs").select("id").eq("status", "queued").lte("created_at", qCut).limit(10);
        for (const j of qj || []) triggerWorker(j.id);
        const { data: sj } = await ac.from("bulk_background_jobs").select("id, user_id, completed_images, total_images, settings").eq("status", "processing").lte("updated_at", sCut).limit(10);
        for (const j of sj || []) {
          await ac.from("bulk_background_jobs").update({ status: "failed", error: "Job timeout", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", j.id);
          const un = j.total_images - j.completed_images;
          if (un > 0) { const adm = await checkAdmin(ac, j.user_id); if (!adm) await ac.rpc("refund_user_credits", { p_user_id: j.user_id, p_amount: un * getCreditsPerImage((j as any).settings || null), p_reason: "bulk_background_timeout_refund" }); }
        }
        return json({ recovered: qj?.length || 0, failed: sj?.length || 0 });
      }

      case "getJob": {
        const { jobId } = body;
        const { data: job } = await ac.from("bulk_background_jobs").select("*").eq("id", jobId).single();
        if (!job) return errorResponse("Job not found", 404);
        if (!isServiceRole && job.user_id !== userId) return errorResponse("Forbidden", 403);
        return json({ job });
      }

      case "getLastJob": {
        if (!userId) return errorResponse("Unauthorized", 401);
        const { data: jobs } = await ac.from("bulk_background_jobs").select("*").eq("user_id", userId).in("status", ["completed", "processing", "queued"]).order("created_at", { ascending: false }).limit(1);
        const lastJob = jobs?.[0] || null;
        if (!lastJob) return json({ job: null, results: [] });
        const { data: results } = await ac.from("bulk_background_results").select("*").eq("job_id", lastJob.id).order("image_index");
        return json({ job: lastJob, results: results || [] });
      }

      case "getJobResults": {
        const { jobId } = body;
        const { data: job } = await ac.from("bulk_background_jobs").select("user_id").eq("id", jobId).single();
        if (!job || (!isServiceRole && job.user_id !== userId)) return errorResponse("Forbidden", 403);
        const { data: results } = await ac.from("bulk_background_results").select("*").eq("job_id", jobId).order("image_index");
        return json({ results: results || [] });
      }

      case "cancelJob": {
        const { jobId } = body;
        const { data: job } = await ac.from("bulk_background_jobs").select("*").eq("id", jobId).single();
        if (!job || job.user_id !== userId) return errorResponse("Forbidden", 403);
        if (!["queued", "processing"].includes(job.status)) return errorResponse("Cannot cancel finished job");
        const { data: pending } = await ac.from("bulk_background_results").select("id").eq("job_id", jobId).in("status", ["pending", "processing"]);
        const rc = pending?.length || 0;
        await ac.from("bulk_background_jobs").update({ status: "canceled", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", jobId);
        if (rc > 0) { const adm = await checkAdmin(ac, userId!); if (!adm) { const ra = rc * getCreditsPerImage((job as any)?.settings || null); await ac.rpc("refund_user_credits", { p_user_id: userId, p_amount: ra, p_reason: "bulk_background_job_canceled" }); } }
        return json({ success: true, refunded: rc * getCreditsPerImage((job as any)?.settings || null) });
      }

      case "downloadAll": {
        const { jobId } = body;
        const { data: job } = await ac.from("bulk_background_jobs").select("user_id").eq("id", jobId).single();
        if (!job || (!isServiceRole && job.user_id !== userId)) return errorResponse("Forbidden", 403);
        const { data: results } = await ac.from("bulk_background_results").select("result_url, image_index").eq("job_id", jobId).eq("status", "completed").order("image_index");
        if (!results?.length) return errorResponse("No completed images to download");
        return json({ images: results.map((r: any) => ({ url: r.result_url, index: r.image_index })) });
      }

      case "createProductViews": {
        if (!userId) return errorResponse("Unauthorized", 401);
        const { resultId, selectedViews, aspectRatio: pvAspectRatio } = body;
        if (!resultId) return errorResponse("Missing resultId");
        if (!selectedViews?.length) return errorResponse("No views selected");
        const validV = ['macro', 'environment', 'angle'];
        const views = (selectedViews as string[]).filter(v => validV.includes(v));
        if (!views.length) return errorResponse("Invalid view types");
        const { data: pvR } = await ac.from("bulk_background_results").select("*, bulk_background_jobs!inner(user_id, id)").eq("id", resultId).single();
        if (!pvR) return errorResponse("Result not found", 404);
        const pvJ = pvR.bulk_background_jobs as any;
        if (pvJ.user_id !== userId) return errorResponse("Forbidden", 403);
        if (pvR.status !== "completed" || !pvR.result_url) return errorResponse("Result must be completed first");
        const cost = views.length;
        const adm = await checkAdmin(ac, userId);
        if (!adm) {
          const { data: sub } = await ac.from("subscribers").select("credits_balance").eq("user_id", userId).single();
          if (!sub || sub.credits_balance < cost) return errorResponse("Insufficient credits", 402);
          const { error: dErr } = await ac.rpc("deduct_user_credits", { p_user_id: userId, p_amount: cost, p_reason: "bulk_background_product_views" });
          if (dErr) return errorResponse("Failed to deduct credits", 500);
        }
        const { data: pvRec, error: pvErr } = await ac.from("bulk_background_product_views").insert({ user_id: userId, result_id: resultId, status: "queued", selected_views: views, progress: 0, metadata: { aspectRatio: pvAspectRatio || "1:1" } }).select().single();
        if (pvErr || !pvRec) { if (!adm) await ac.rpc("refund_user_credits", { p_user_id: userId, p_amount: cost, p_reason: "bulk_background_product_views_creation_failed" }); return errorResponse("Failed to create product views record", 500); }
        fetch(`${SUPABASE_URL}/functions/v1/bulk-background`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }, body: JSON.stringify({ action: "processProductViews", productViewsId: pvRec.id }) }).catch(e => console.error("PV trigger error:", e));
        return json({ productViewsId: pvRec.id });
      }

      case "processProductViews": {
        if (!isServiceRole) return errorResponse("Forbidden", 403);
        const { productViewsId } = body;
        const { data: pv } = await ac.from("bulk_background_product_views").select("*").eq("id", productViewsId).single();
        if (!pv) return errorResponse("Not found", 404);
        if (pv.status !== "queued") return json({ status: pv.status });
        await (ac.from("bulk_background_product_views") as any).update({ status: "processing", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", productViewsId);
        // Dispatch each view as a separate edge function call
        const selViews = pv.selected_views as string[];
        for (const vt of selViews) {
          fetch(`${SUPABASE_URL}/functions/v1/bulk-background`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ action: "processSingleView", productViewsId: pv.id, viewType: vt }),
          }).catch(e => console.error(`Dispatch ${vt} error:`, e));
        }
        return json({ status: "processing", dispatched: selViews.length });
      }

      case "processSingleView": {
        if (!isServiceRole) return errorResponse("Forbidden", 403);
        const { productViewsId: svPvId, viewType: svViewType } = body;
        if (!svPvId || !svViewType) return errorResponse("Missing productViewsId or viewType");
        const VP: Record<string, string> = {
          macro: `Using this product photo as reference, create a close-up macro shot of the same product in the same setting. Focus on material quality, texture and finish details. Maintain the same background, lighting and color palette. Shallow depth of field, ultra-sharp on product surface.`,
          angle: `Using this product photo as reference, create a 3/4 angled catalog view of the same product. Camera slightly above, 25-35 degree rotation. Keep the exact same background, lighting and environment. Soft studio lighting with realistic contact shadows. No text.`,
          environment: `Using this product photo as reference, create a wide lifestyle shot showing the same product in a premium, realistic environment matching the image style. Soft natural lighting, sophisticated professional photography. Product is the clear focal point. Maintain the same product proportions, textures and branding. No people, no text overlays.`,
        };
        const prompt = VP[svViewType];
        if (!prompt) return errorResponse("Invalid view type");
        const { data: pv } = await ac.from("bulk_background_product_views").select("*").eq("id", svPvId).single();
        if (!pv) return errorResponse("Not found", 404);
        if (pv.status === "canceled") return json({ status: "canceled" });
        const { data: srcR } = await ac.from("bulk_background_results").select("result_url").eq("id", pv.result_id).single();
        if (!srcR?.result_url) {
          await checkAndFinalizeProductViews(ac, svPvId, pv.selected_views as string[], svViewType, null);
          return errorResponse("Source not found");
        }
        const PV_BUCKET = "bulk-background-product-views";
        try {
          const srcB64 = await fetchImageAsBase64(srcR.result_url);
          const pvAR = (pv.metadata as any)?.aspectRatio || "1:1";
          const parts = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: srcB64 } }];
          const res = await fetch(GEMINI_ENDPOINT, { method: "POST", headers: { "x-goog-api-key": GOOGLE_AI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: pvAR } } }) });
          if (!res.ok) { const errText = await res.text(); console.error(`PV ${svViewType} Gemini error:`, errText); throw new Error(`Gemini error: ${res.status}`); }
          const img = extractBase64Image(await res.json());
          if (!img) throw new Error("No image in Gemini response");
          const bytes = b64ToBytes(img);
          const sp = `${pv.user_id}/${svPvId}/${svViewType}.webp`;
          const { error: uErr } = await ac.storage.from(PV_BUCKET).upload(sp, bytes, { contentType: "image/webp", upsert: true });
          if (uErr) throw new Error(`Upload failed: ${uErr.message}`);
          const { data: ud } = ac.storage.from(PV_BUCKET).getPublicUrl(sp);
          // Update this view's URL
          await (ac.from("bulk_background_product_views") as any).update({ [`${svViewType}_url`]: ud.publicUrl, [`${svViewType}_storage_path`]: sp, updated_at: new Date().toISOString() }).eq("id", svPvId);
          await checkAndFinalizeProductViews(ac, svPvId, pv.selected_views as string[], svViewType, null);
          return json({ status: "completed", viewType: svViewType });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          console.error(`processSingleView ${svViewType} failed:`, errMsg);
          // Store error in metadata
          const meta = (pv.metadata as Record<string, unknown>) || {};
          const viewErrors = (meta.viewErrors as Record<string, string>) || {};
          viewErrors[svViewType] = errMsg;
          await (ac.from("bulk_background_product_views") as any).update({ metadata: { ...meta, viewErrors }, updated_at: new Date().toISOString() }).eq("id", svPvId);
          await checkAndFinalizeProductViews(ac, svPvId, pv.selected_views as string[], svViewType, errMsg);
          return json({ status: "failed", viewType: svViewType, error: errMsg });
        }
      }

      case "getProductViews": {
        const { productViewsId } = body;
        if (!productViewsId) return errorResponse("Missing productViewsId");
        const { data: pv } = await ac.from("bulk_background_product_views").select("*").eq("id", productViewsId).single();
        if (!pv) return errorResponse("Not found", 404);
        if (!isServiceRole && pv.user_id !== userId) return errorResponse("Forbidden", 403);
        return json({ productViews: pv });
      }

      case "getProductViewsByResult": {
        const { resultId: pvRid } = body;
        if (!pvRid) return errorResponse("Missing resultId");
        const { data: pvList } = await ac.from("bulk_background_product_views").select("*").eq("result_id", pvRid).order("created_at", { ascending: false }).limit(1);
        return json({ productViews: pvList?.[0] || null });
      }

      default: return errorResponse("Unknown action");
    }
  } catch (e) {
    console.error("Bulk background error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
