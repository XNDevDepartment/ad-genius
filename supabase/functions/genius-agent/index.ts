// supabase/functions/genius-agent/index.ts
// Edge Function for Genius Agent - Automated content production system
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

// ---------- LOG ----------
const log = (step: string, meta?: unknown): void =>
  console.log(`[GENIUS-AGENT] ${step}${meta ? ` - ${JSON.stringify(meta)}` : ""}`);

// ---------- HELPERS ----------
const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});

const errorJson = (message: string, status = 400, meta?: unknown): Response => {
  log(`ERROR: ${message}`, meta);
  return json({ error: message }, status);
};

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

async function getUserIdFromAuth(authHeader: string): Promise<string> {
  const supa = userClient(authHeader);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error("Invalid authentication token");
  return data.user.id;
}

// ---------- TYPES ----------
interface GeniusConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  audiences: string[];
  schedule_days: number[];
  schedule_hours: number[];
  content_per_run: number;
  preferred_style: string;
  highlight_product: string;
  created_at: string;
  updated_at: string;
}

interface GeniusJob {
  id: string;
  user_id: string;
  config_id: string | null;
  source_image_id: string | null;
  audience: string;
  prompt: string;
  status: string;
  image_job_id: string | null;
  result_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ScheduledUser {
  userId: string;
  configId: string;
  audiences: string[];
  contentPerRun: number;
  preferredStyle: string;
  highlightProduct: string;
}

// ---------- PROMPT BUILDER ----------
function buildPrompt(
  audience: string,
  highlight: string,
  style: string
): string {
  const commonNegative = `--negative "AI artifacts, text overlays, watermark, blurry, low quality, distorted faces, unnatural hands, plastic skin, over-saturated"`;

  if (highlight === 'yes') {
    return `
        TASK: Create authentic UGC photo featuring this product.

        SCENARIO: Natural lifestyle moment that resonates with the target audience.

        AUDIENCE: ${audience}

        MANDATORY RULES:
        1. PRODUCT INTEGRITY: Product is hero of the image - occupies 40-60% of frame, clearly visible
        2. AUTHENTICITY: iPhone-quality casual photography, natural lighting, candid feel
        3. STYLE: ${style} photography aesthetic
        4. HUMAN ELEMENT: If person present, show natural interaction with product
        5. QUALITY: Ultra high resolution, sharp focus on product

        ${commonNegative}

        OUTPUT: Single authentic UGC photo ready for social media advertising.
    `.trim();
  } else {
    return `
        TASK: Create lifestyle photo where environment tells the story.

        SCENARIO: Scene that naturally incorporates the product as a subtle element.

        AUDIENCE: ${audience}

        MANDATORY RULES:
        1. ENVIRONMENT FIRST: Scene is hero, product occupies 20-35% of frame
        2. PRODUCT PLACEMENT: Natural, non-intrusive integration
        3. STYLE: ${style} lifestyle photography
        4. ATMOSPHERE: Mood and setting resonate with target audience
        5. QUALITY: Ultra high resolution, professional composition

        ${commonNegative}

        OUTPUT: Single polished lifestyle photo usable as ad creative.
    `.trim();
  }
}

// ---------- ROUTER ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = body?.action ?? new URL(req.url).searchParams.get("action");
    const svc = serviceClient();

    // Actions that require service role (n8n webhook calls)
    const n8nActions = ["getScheduledUsers", "getRandomSourceImage", "createAgentJob", "getJobStatus", "completeAgentJob"];

    let userId: string | null = null;

    if (n8nActions.includes(action as string)) {
      if (!isServiceCall) {
        return errorJson("Forbidden - Service role required", 403);
      }
    } else {
      // User actions require auth
      if (!authHeader) return errorJson("Missing authorization header", 401);
      userId = await getUserIdFromAuth(authHeader);
    }

    log("Action received", { action, isServiceCall, userId: userId?.slice(0, 8) });

    switch (action) {
      // ========== N8N ACTIONS ==========
      case "getScheduledUsers":
        return await getScheduledUsers(body, svc);

      case "getRandomSourceImage":
        return await getRandomSourceImage(body, svc);

      case "createAgentJob":
        return await createAgentJob(body, svc);

      case "getJobStatus":
        return await getJobStatusAction(body, svc);

      case "completeAgentJob":
        return await completeAgentJob(body, svc);

      // ========== FRONTEND ACTIONS ==========
      case "getConfig":
        if (!userId) return errorJson("Auth required", 401);
        return await getConfig(userId, svc);

      case "saveConfig":
        if (!userId) return errorJson("Auth required", 401);
        return await saveConfig(userId, body, svc);

      case "getAgentHistory":
        if (!userId) return errorJson("Auth required", 401);
        return await getAgentHistory(userId, body, svc);

      case "getAllConfigs":
        if (!userId) return errorJson("Auth required", 401);
        return await getAllConfigs(userId, svc);

      case "getAllJobs":
        if (!userId) return errorJson("Auth required", 401);
        return await getAllJobs(userId, body, svc);

      default:
        return errorJson(`Unknown action: ${action ?? "none"}`, 400);
    }
  } catch (e: unknown) {
    const err = e as Error;
    return errorJson(err?.message ?? String(e), 500);
  }
});

// ========== N8N ACTIONS ==========

/**
 * Get users with active scheduling for current day/hour
 * Called by n8n every hour
 */
async function getScheduledUsers(
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const day = body.day as number; // 0-6 (Sunday = 0)
  const hour = body.hour as number; // 0-23

  if (day === undefined || hour === undefined) {
    return errorJson("Missing day or hour parameter", 400);
  }

  log("Getting scheduled users", { day, hour });

  // Get all active configs that have this day and hour in their schedule
  const { data: configs, error } = await supabase
    .from("genius_agent_configs")
    .select("*")
    .eq("is_active", true)
    .contains("schedule_days", [day])
    .contains("schedule_hours", [hour]);

  if (error) {
    return errorJson(`Failed to fetch configs: ${error.message}`, 500);
  }

  const users: ScheduledUser[] = (configs || []).map((config: GeniusConfig) => ({
    userId: config.user_id,
    configId: config.id,
    audiences: config.audiences || [],
    contentPerRun: config.content_per_run || 1,
    preferredStyle: config.preferred_style || 'lifestyle',
    highlightProduct: config.highlight_product || 'yes'
  }));

  log("Found scheduled users", { count: users.length, day, hour });

  return json({ users });
}

/**
 * Get a random source image for a user
 */
async function getRandomSourceImage(
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const userId = body.userId as string;

  if (!userId) {
    return errorJson("Missing userId parameter", 400);
  }

  log("Getting random source image", { userId: userId.slice(0, 8) });

  // Get random source image for the user
  const { data: images, error } = await supabase
    .from("source_images")
    .select("id, public_url, file_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return errorJson(`Failed to fetch source images: ${error.message}`, 500);
  }

  if (!images || images.length === 0) {
    return errorJson("No source images found for user", 404);
  }

  // Pick a random image
  const randomIndex = Math.floor(Math.random() * images.length);
  const selectedImage = images[randomIndex];

  log("Selected source image", { sourceImageId: selectedImage.id, fileName: selectedImage.file_name });

  return json({
    sourceImageId: selectedImage.id,
    publicUrl: selectedImage.public_url,
    fileName: selectedImage.file_name
  });
}

/**
 * Create an agent job and trigger UGC generation
 */
async function createAgentJob(
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const userId = body.userId as string;
  const sourceImageId = body.sourceImageId as string;
  const audience = body.audience as string;
  const style = (body.style as string) || 'lifestyle';
  const highlight = (body.highlight as string) || 'yes';
  const configId = body.configId as string | undefined;

  if (!userId || !sourceImageId || !audience) {
    return errorJson("Missing required parameters: userId, sourceImageId, audience", 400);
  }

  log("Creating agent job", { userId: userId.slice(0, 8), sourceImageId, audience: audience.slice(0, 50) });

  // Build the prompt
  const prompt = buildPrompt(audience, highlight, style);

  // Create the agent job record
  const { data: agentJob, error: jobError } = await supabase
    .from("genius_agent_jobs")
    .insert({
      user_id: userId,
      config_id: configId || null,
      source_image_id: sourceImageId,
      audience,
      prompt,
      status: "pending"
    })
    .select()
    .single();

  if (jobError) {
    return errorJson(`Failed to create agent job: ${jobError.message}`, 500);
  }

  // Trigger UGC generation via the ugc-gemini-v3 function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ugc-gemini-v3`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "createImageJob",
        prompt,
        source_image_id: sourceImageId,
        settings: {
          number: 1,
          quality: "high",
          aspectRatio: "1:1",
          output_format: "webp"
        },
        desiredAudience: audience,
        userId // Pass userId for the edge function to use
      })
    });

    const result = await response.json();

    if (result.error) {
      // Update agent job as failed
      await supabase
        .from("genius_agent_jobs")
        .update({
          status: "failed",
          error: result.error,
          completed_at: new Date().toISOString()
        })
        .eq("id", agentJob.id);

      return errorJson(`UGC generation failed: ${result.error}`, 500);
    }

    // Update agent job with the image job ID
    await supabase
      .from("genius_agent_jobs")
      .update({
        image_job_id: result.jobId,
        status: "processing"
      })
      .eq("id", agentJob.id);

    log("Agent job created and UGC triggered", { agentJobId: agentJob.id, imageJobId: result.jobId });

    return json({
      agentJobId: agentJob.id,
      imageJobId: result.jobId,
      status: "processing"
    });
  } catch (e: unknown) {
    const err = e as Error;
    await supabase
      .from("genius_agent_jobs")
      .update({
        status: "failed",
        error: err.message,
        completed_at: new Date().toISOString()
      })
      .eq("id", agentJob.id);

    return errorJson(`Failed to trigger UGC generation: ${err.message}`, 500);
  }
}

/**
 * Get job status (for polling)
 */
async function getJobStatusAction(
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const agentJobId = body.agentJobId as string;
  const imageJobId = body.imageJobId as string;

  if (!agentJobId && !imageJobId) {
    return errorJson("Missing agentJobId or imageJobId parameter", 400);
  }

  if (agentJobId) {
    const { data: job, error } = await supabase
      .from("genius_agent_jobs")
      .select("*")
      .eq("id", agentJobId)
      .single();

    if (error || !job) {
      return errorJson("Agent job not found", 404);
    }

    return json({
      agentJobId: job.id,
      status: job.status,
      resultUrl: job.result_url,
      error: job.error
    });
  }

  // Check via image job
  const { data: imageJob, error } = await supabase
    .from("image_jobs")
    .select("id, status, progress, error")
    .eq("id", imageJobId)
    .single();

  if (error || !imageJob) {
    return errorJson("Image job not found", 404);
  }

  // If completed, get the result image
  let resultUrl: string | null = null;
  if (imageJob.status === "completed") {
    const { data: images } = await supabase
      .from("ugc_images")
      .select("public_url")
      .eq("job_id", imageJobId)
      .limit(1);

    if (images && images.length > 0) {
      resultUrl = images[0].public_url;
    }
  }

  return json({
    imageJobId: imageJob.id,
    status: imageJob.status,
    progress: imageJob.progress,
    resultUrl,
    error: imageJob.error
  });
}

/**
 * Mark an agent job as completed (called by n8n after polling shows complete)
 */
async function completeAgentJob(
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const agentJobId = body.agentJobId as string;
  const resultUrl = body.resultUrl as string;
  const status = (body.status as string) || "completed";
  const errorMsg = body.error as string | undefined;

  if (!agentJobId) {
    return errorJson("Missing agentJobId parameter", 400);
  }

  const update: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString()
  };

  if (resultUrl) update.result_url = resultUrl;
  if (errorMsg) update.error = errorMsg;

  const { error } = await supabase
    .from("genius_agent_jobs")
    .update(update)
    .eq("id", agentJobId);

  if (error) {
    return errorJson(`Failed to update agent job: ${error.message}`, 500);
  }

  log("Agent job completed", { agentJobId, status });

  return json({ success: true });
}

// ========== FRONTEND ACTIONS ==========

/**
 * Get user's agent config
 */
async function getConfig(
  userId: string,
  supabase: SupabaseClient
): Promise<Response> {
  const { data, error } = await supabase
    .from("genius_agent_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return errorJson(`Failed to fetch config: ${error.message}`, 500);
  }

  return json({ config: data });
}

/**
 * Save/update user's agent config
 */
async function saveConfig(
  userId: string,
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const config = body.config as Partial<GeniusConfig>;

  if (!config) {
    return errorJson("Missing config parameter", 400);
  }

  const { data: existing } = await supabase
    .from("genius_agent_configs")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const configData = {
    user_id: userId,
    is_active: config.is_active ?? false,
    audiences: config.audiences ?? [],
    schedule_days: config.schedule_days ?? [],
    schedule_hours: config.schedule_hours ?? [],
    content_per_run: config.content_per_run ?? 1,
    preferred_style: config.preferred_style ?? 'lifestyle',
    highlight_product: config.highlight_product ?? 'yes',
    updated_at: new Date().toISOString()
  };

  let result;
  if (existing) {
    result = await supabase
      .from("genius_agent_configs")
      .update(configData)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("genius_agent_configs")
      .insert(configData)
      .select()
      .single();
  }

  if (result.error) {
    return errorJson(`Failed to save config: ${result.error.message}`, 500);
  }

  log("Config saved", { userId: userId.slice(0, 8), isActive: configData.is_active });

  return json({ config: result.data, success: true });
}

/**
 * Get user's agent job history
 */
async function getAgentHistory(
  userId: string,
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  const limit = (body.limit as number) || 50;

  const { data: jobs, error } = await supabase
    .from("genius_agent_jobs")
    .select("*, source_images(file_name, public_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return errorJson(`Failed to fetch history: ${error.message}`, 500);
  }

  return json({ jobs: jobs || [] });
}

/**
 * Get all configs (admin only)
 */
async function getAllConfigs(
  userId: string,
  supabase: SupabaseClient
): Promise<Response> {
  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  if (!isAdmin) {
    return errorJson("Admin access required", 403);
  }

  // Fetch configs without automatic join
  const { data: configs, error } = await supabase
    .from("genius_agent_configs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return errorJson(`Failed to fetch configs: ${error.message}`, 500);
  }

  // Fetch profiles for all users
  const userIds = [...new Set((configs || []).map(c => c.user_id))];
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    // Map profiles to configs
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enrichedConfigs = (configs || []).map(config => ({
      ...config,
      profiles: profileMap.get(config.user_id) || null
    }));

    return json({ configs: enrichedConfigs });
  }

  return json({ configs: configs || [] });
}

/**
 * Get all jobs (admin only)
 */
async function getAllJobs(
  userId: string,
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  if (!isAdmin) {
    return errorJson("Admin access required", 403);
  }

  const limit = (body.limit as number) || 100;

  // Fetch jobs with source_images only (no profiles join)
  const { data: jobs, error } = await supabase
    .from("genius_agent_jobs")
    .select("*, source_images(file_name, public_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return errorJson(`Failed to fetch jobs: ${error.message}`, 500);
  }

  // Fetch profiles for all users
  const userIds = [...new Set((jobs || []).map(j => j.user_id))];
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    // Map profiles to jobs
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enrichedJobs = (jobs || []).map(job => ({
      ...job,
      profiles: profileMap.get(job.user_id) || null
    }));

    return json({ jobs: enrichedJobs });
  }

  return json({ jobs: jobs || [] });
}
