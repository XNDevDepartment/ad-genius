import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SettingsPayload {
    outputFormat?: 'png' | 'webp';
    quality?: 'high' | 'medium';
    customPrompt?: string;
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

function getCreditsPerImage(settings: Record<string, unknown> | null): number {
  const size = (settings as any)?.imageSize || '1K';
  switch (size) {
    case '4K': return 4;
    case '2K': return 2;
    default: return 1;
  }
}

// Gemini model configuration
const GEMINI_MODEL = "gemini-3-pro-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simplified base prompt for product placement
const BASE_PROMPT = `Ultra-realistic professional studio product photography using reference scene and product projection.

      Use the reference image ONLY for environment, background, lighting direction and surface contact.
      Use the uploaded product image as the ONLY source of product geometry and proportions.

      CRITICAL PRODUCT RULES:
      Do NOT reconstruct the product in 3D.
      Do NOT reinterpret shape, proportions or perspective.
      Do NOT modify bottle geometry, cap shape, label curvature or symmetry.

      The product must be treated as a projected photographic object:
      - Exact proportions preserved
      - No stretching
      - No warping
      - No perspective correction beyond uniform scaling

      Perspective handling:
      Match the scene perspective ONLY by scale, position and rotation.
      If perspectives conflict, preserve product realism over scene realism.

      Lighting & shadows:
      Analyze light direction from the reference image.
      Apply light and shadow as an overlay interaction, not as a re-render.
      Shadows must be soft, grounded and physically plausible.
      No artificial shadow painting or exaggerated contrast.

      Contact & grounding:
      Product must rest naturally on the surface.
      No floating.
      No incorrect contact shadows.
      Shadow softness and direction must match the scene.

      Camera realism:
      Maintain photographic integrity.
      No CGI look.
      No synthetic depth reconstruction.
      Natural lens behavior only.

      Constraints:
      No added objects.
      No scene alteration.
      No creative interpretation.
      No stylization.

      Final result:
      Product must look indistinguishable from a real studio photograph placed in this exact environment.

      If any distortion appears, prioritize geometric accuracy over scene matching.`;

      // Background preset hints (appended to base prompt)
      const PRESET_HINTS: Record<string, string> = {
        'white-seamless': 'Fundo: estúdio branco seamless com iluminação suave.',
        'black-studio': 'Fundo: estúdio preto matte com rim lighting dramático.',
        'gradient-gray': 'Fundo: gradiente cinza suave, estilo catálogo.',
        'soft-pink': 'Fundo: rosa pastel suave, estética feminina.',
        'living-room': 'Fundo: sala de estar moderna minimalista com luz natural.',
        'kitchen': 'Fundo: bancada de cozinha moderna com mármore.',
        'bedroom': 'Fundo: quarto aconchegante com tons neutros.',
        'home-office': 'Fundo: escritório moderno com plantas.',
        'beach': 'Fundo: praia com ondas e luz dourada.',
        'forest': 'Fundo: floresta serena com luz filtrada.',
        'garden': 'Fundo: jardim com flores coloridas.',
        'mountain': 'Fundo: paisagem montanhosa majestosa.',
        'cafe': 'Fundo: café rústico com ambiente quente.',
        'street': 'Fundo: rua urbana com arquitetura moderna.',
        'rooftop': 'Fundo: terraço com skyline da cidade.',
        'subway': 'Fundo: estação de metro moderna.',
        'editorial': 'Fundo: setup editorial high-fashion.',
        'fashion': 'Fundo: estúdio de fotografia de moda.',
        'minimal': 'Fundo: ultra-minimalista com muito espaço negativo.',
        'vogue': 'Fundo: luxuoso estilo Vogue.',
        'christmas': 'Fundo: cenário festivo de Natal.',
        'summer': 'Fundo: verão tropical vibrante.',
        'autumn': 'Fundo: outono com folhas coloridas.',
        'spring': 'Fundo: primavera com flores a desabrochar.'
      };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Storage bucket name
const STORAGE_BUCKET = "bulk-backgrounds";

async function uploadToStorage(
  adminClient: any,
  imageData: Uint8Array,
  storagePath: string,
  contentType: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const { error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageData, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data } = adminClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return { storagePath, publicUrl: data.publicUrl };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildPrompt(presetId: string | null, hasCustomBackground: boolean, customPrompt?: string): string {
  let prompt = BASE_PROMPT;

  // If user provided a custom prompt, append it
  if (customPrompt) {
    prompt += `\n\nCena pretendida: ${customPrompt}`;
    return prompt;
  }

  if (hasCustomBackground) {
    prompt += "\n\nNOTA: Use a segunda imagem fornecida como fundo.";
  } else if (presetId && PRESET_HINTS[presetId]) {
    prompt += `\n\n${PRESET_HINTS[presetId]}`;
  }
  return prompt;
}

function extractBase64Image(data: unknown): string | null {
  const candidates = (data as { candidates?: unknown[] })?.candidates || [];
  for (const candidate of candidates) {
    const parts = (candidate as { content?: { parts?: unknown[] } })?.content?.parts || [];
    for (const part of parts) {
      const inlineData = (part as { inlineData?: { data?: string } })?.inlineData;
      if (inlineData?.data) {
        return inlineData.data;
      }
    }
  }
  return null;
}

async function generateImageWithRetry(
  productBase64: string,
  backgroundBase64: string | null,
  prompt: string,
  maxRetries = 3,
  settings: SettingsPayload | null
): Promise<Uint8Array | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff for retries
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
        console.log(`[Attempt ${attempt}] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }

      // Build parts array
      const parts: unknown[] = [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: productBase64 } }
      ];

      // Add custom background as second image if provided
      if (backgroundBase64) {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: backgroundBase64 }
        });
      }


      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": GOOGLE_AI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
              "aspectRatio": settings?.aspectRatio,
              "imageSize": settings?.imageSize
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Attempt ${attempt}] Gemini API error (${response.status}):`, errorText);
        
        if (response.status === 429) {
          console.log(`[Attempt ${attempt}] Rate limited, will retry...`);
          continue;
        }
        
        if (attempt === maxRetries) return null;
        continue;
      }

      const data = await response.json();
      const imageBase64 = extractBase64Image(data);

      if (!imageBase64) {
        console.error(`[Attempt ${attempt}] No image in response`);
        if (attempt === maxRetries) return null;
        continue;
      }

      // Convert base64 to Uint8Array
      const binaryStr = atob(imageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      return bytes;
    } catch (error) {
      console.error(`[Attempt ${attempt}] Error:`, error);
      if (attempt === maxRetries) return null;
    }
  }
  return null;
}

async function triggerWorker(jobId: string, retryCount = 0): Promise<void> {
  const maxRetries = 3;
  const delay = Math.pow(2, retryCount) * 1000;

  try {
    await sleep(delay);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/bulk-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ action: "processJob", jobId }),
    });

    if (!response.ok && retryCount < maxRetries) {
      console.log(`Worker trigger failed, retrying (${retryCount + 1}/${maxRetries})...`);
      return triggerWorker(jobId, retryCount + 1);
    }
  } catch (error) {
    console.error("Worker trigger error:", error);
    if (retryCount < maxRetries) {
      return triggerWorker(jobId, retryCount + 1);
    }
  }
}

interface BulkBackgroundJob {
  id: string;
  user_id: string;
  status: string;
  background_type: string;
  background_preset_id: string | null;
  background_image_url: string | null;
  total_images: number;
  completed_images: number;
  failed_images: number;
  settings: Record<string, unknown> | null;
}

interface BulkBackgroundResult {
  id: string;
  job_id: string;
  source_image_url: string;
  status: string;
  image_index: number;
  retry_count: number;
}

async function processSingleResult(
  result: BulkBackgroundResult,
  job: BulkBackgroundJob,
  adminClient: any,
  backgroundBase64: string | null
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();

  try {
    // Update result to processing
    await (adminClient
      .from("bulk_background_results") as any)
      .update({ 
        status: "processing",
        last_attempt_at: new Date().toISOString(),
        retry_count: result.retry_count + 1
      })
      .eq("id", result.id);

    // Fetch source image as base64
    const productBase64 = await fetchImageAsBase64(result.source_image_url);

    // Build prompt
    const customPrompt = (job.settings as Record<string, unknown>)?.customPrompt as string | undefined;

    const prompt = buildPrompt(
      job.background_preset_id,
      !!backgroundBase64,
      customPrompt
    );

    // Generate image with retry logic
    const generatedImage = await generateImageWithRetry(
      productBase64,
      backgroundBase64,
      prompt,
      3,
      job.settings
    );

    if (!generatedImage) {
      throw new Error("Image generation failed after all retries");
    }

    // Upload result
    const storagePath = `${job.user_id}/${job.id}/${result.image_index}-result.webp`;
    const { storagePath: finalPath, publicUrl } = await uploadToStorage(
      adminClient,
      generatedImage,
      storagePath,
      "image/webp"
    );

    const processingTime = Date.now() - startTime;

    // Update result with success
    await (adminClient
      .from("bulk_background_results") as any)
      .update({
        status: "completed",
        result_url: publicUrl,
        storage_path: finalPath,
        processing_time_ms: processingTime,
        updated_at: new Date().toISOString()
      })
      .eq("id", result.id);

    return { success: true };
  } catch (error) {
    console.error(`Failed to process result ${result.id}:`, error);

    await (adminClient
      .from("bulk_background_results") as any)
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
        updated_at: new Date().toISOString()
      })
      .eq("id", result.id);

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Check if this is a service role call (internal worker)
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

    // For user actions, validate JWT
    let userId: string | null = null;
    if (!isServiceRole) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader || "" } },
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return errorResponse("Unauthorized", 401);
      }
      userId = user.id;
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      // ============================================
      // CREATE JOB
      // ============================================
      case "createJob": {
        if (!userId) {
          return errorResponse("Unauthorized", 401);
        }

        const { sourceImageIds, backgroundType, backgroundPresetId, backgroundImageUrl, settings } = body;

        // Validate inputs
        if (!sourceImageIds?.length) {
          return errorResponse("No source images provided");
        }

        if (backgroundType === "preset" && !backgroundPresetId) {
          return errorResponse("No background preset selected");
        }

        if (backgroundType === "custom" && !backgroundImageUrl) {
          return errorResponse("No custom background provided");
        }

        // Get source images
        const { data: sourceImages, error: sourceError } = await adminClient
          .from("source_images")
          .select("id, public_url")
          .in("id", sourceImageIds);

        if (sourceError || !sourceImages?.length) {
          return errorResponse("Failed to fetch source images");
        }

        // Check if admin (skip credit check)
        const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: userId });
        const isAdmin = isAdminResult === true;

        const creditsPerImg = getCreditsPerImage(settings || null);
        const totalCost = sourceImages.length * creditsPerImg;

        // Check credits for non-admin users
        if (!isAdmin) {
          const { data: subscriber } = await adminClient
            .from("subscribers")
            .select("credits_balance")
            .eq("user_id", userId)
            .single();

          if (!subscriber || subscriber.credits_balance < totalCost) {
            return json({
              error: "Insufficient credits",
              required: totalCost,
              available: subscriber?.credits_balance || 0,
            }, 400);
          }

          // Deduct credits upfront
          const { error: deductError } = await adminClient.rpc("deduct_user_credits", {
            p_user_id: userId,
            p_amount: totalCost,
            p_reason: "bulk_background_generation",
          });

          if (deductError) {
            return errorResponse("Failed to deduct credits", 500);
          }
        }

        // Use custom background URL directly (already uploaded by frontend)
        const finalBackgroundUrl: string | null = backgroundType === "custom" ? backgroundImageUrl : null;

        // Create job record
        const { data: job, error: jobError } = await adminClient
          .from("bulk_background_jobs")
          .insert({
            user_id: userId,
            status: "queued",
            background_type: backgroundType,
            background_preset_id: backgroundPresetId || null,
            background_image_url: finalBackgroundUrl,
            total_images: sourceImages.length,
            settings: settings || {},
          })
          .select()
          .single();

        if (jobError || !job) {
          // Refund credits on failure
          if (!isAdmin) {
            await adminClient.rpc("refund_user_credits", {
              p_user_id: userId,
              p_amount: totalCost,
              p_reason: "bulk_background_job_creation_failed",
            });
          }
          return errorResponse("Failed to create job", 500);
        }

        // Create result placeholders
        const resultInserts = sourceImages.map((img, index) => ({
          job_id: job.id,
          user_id: userId,
          source_image_id: img.id,
          source_image_url: img.public_url,
          status: "pending",
          image_index: index,
          retry_count: 0
        }));

        await adminClient.from("bulk_background_results").insert(resultInserts);

        // Trigger worker (fire-and-forget)
        triggerWorker(job.id);

        return json({ jobId: job.id });
      }

      // ============================================
      // PROCESS JOB (Sequential with checkpoints)
      // ============================================
      case "processJob": {
        if (!isServiceRole) {
          return errorResponse("Forbidden", 403);
        }

        const { jobId } = body;

        // Get job with atomic claim
        const { data: job, error: jobError } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (jobError || !job) {
          console.error("Job not found:", jobId);
          return errorResponse("Job not found", 404);
        }

        // Skip if already finished or canceled
        if (["completed", "failed", "canceled"].includes(job.status)) {
          return json({ status: job.status, message: "Job already finished" });
        }

        // Update to processing
        if (job.status === "queued") {
          await adminClient
            .from("bulk_background_jobs")
            .update({ 
              status: "processing", 
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", jobId);
        }

        // Get pending results to process
        const { data: results } = await adminClient
          .from("bulk_background_results")
          .select("*")
          .eq("job_id", jobId)
          .in("status", ["pending", "processing"])
          .order("image_index");

        if (!results?.length) {
          // All images already processed, update job status
          const { data: allResults } = await adminClient
            .from("bulk_background_results")
            .select("status")
            .eq("job_id", jobId);

          const failedCount = allResults?.filter(r => r.status === "failed").length || 0;
          const completedCount = allResults?.filter(r => r.status === "completed").length || 0;
          
          const finalStatus = completedCount === 0 ? "failed" : "completed";
          
          await adminClient
            .from("bulk_background_jobs")
            .update({
              status: finalStatus,
              completed_images: completedCount,
              failed_images: failedCount,
              progress: 100,
              finished_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", jobId);

          return json({ status: finalStatus, completed: completedCount, failed: failedCount });
        }

        // Fetch custom background once if needed
        let backgroundBase64: string | null = null;
        if (job.background_type === "custom" && job.background_image_url) {
          try {
            backgroundBase64 = await fetchImageAsBase64(job.background_image_url);
          } catch (e) {
            console.error("Failed to fetch custom background:", e);
          }
        }

        let completedCount = job.completed_images || 0;
        let failedCount = job.failed_images || 0;

        // SEQUENTIAL PROCESSING - ONE IMAGE AT A TIME
        for (const result of results) {
          // Check if job was canceled
          const { data: currentJob } = await adminClient
            .from("bulk_background_jobs")
            .select("status")
            .eq("id", jobId)
            .single();

          if (currentJob?.status === "canceled") {
            console.log(`Job ${jobId} was canceled, stopping processing`);
            break;
          }

          // Process this image
          const processResult = await processSingleResult(
            result as BulkBackgroundResult,
            job as BulkBackgroundJob,
            adminClient,
            backgroundBase64
          );

          if (processResult.success) {
            completedCount++;
          } else {
            failedCount++;
          }

          // Update job progress after each image
          const totalProcessed = completedCount + failedCount;
          const progress = Math.round((totalProcessed / job.total_images) * 100);

          await adminClient
            .from("bulk_background_jobs")
            .update({
              completed_images: completedCount,
              failed_images: failedCount,
              progress,
              updated_at: new Date().toISOString()
            })
            .eq("id", jobId);
        }

        // Re-check if canceled
        const { data: finalJob } = await adminClient
          .from("bulk_background_jobs")
          .select("status")
          .eq("id", jobId)
          .single();

        if (finalJob?.status === "canceled") {
          return json({ status: "canceled" });
        }

        // Refund credits for failed images (non-admin users)
        if (failedCount > 0) {
          const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: job.user_id });
          if (isAdminResult !== true) {
            const refundAmount = failedCount * getCreditsPerImage(job.settings || null);
            await adminClient.rpc("refund_user_credits", {
              p_user_id: job.user_id,
              p_amount: refundAmount,
              p_reason: "bulk_background_failed_images_refund",
            });
          }
        }

        // Mark job complete
        const finalStatus = completedCount === 0 ? "failed" : "completed";
        await adminClient
          .from("bulk_background_jobs")
          .update({
            status: finalStatus,
            finished_at: new Date().toISOString(),
            error: failedCount > 0 ? `${failedCount} image(s) failed to process` : null,
            updated_at: new Date().toISOString()
          })
          .eq("id", jobId);

        return json({ status: finalStatus, completed: completedCount, failed: failedCount });
      }

      // ============================================
      // RETRY INDIVIDUAL RESULT
      // ============================================
      case "retryResult": {
        if (!userId) {
          return errorResponse("Unauthorized", 401);
        }

        const { resultId } = body;

        // Get result with job info
        const { data: result, error: resultError } = await adminClient
          .from("bulk_background_results")
          .select("*, bulk_background_jobs!inner(user_id, background_type, background_preset_id, background_image_url, total_images, settings)")
          .eq("id", resultId)
          .single();

        if (resultError || !result) {
          return errorResponse("Result not found", 404);
        }

        // Verify ownership
        const jobData = result.bulk_background_jobs as { 
          user_id: string; 
          background_type: string;
          background_preset_id: string | null;
          background_image_url: string | null;
          total_images: number;
          settings: any;
        };

        if (jobData.user_id !== userId) {
          return errorResponse("Forbidden", 403);
        }

        // Only retry failed results
        if (result.status !== "failed") {
          return errorResponse("Only failed results can be retried");
        }

        // Check credits
        const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: userId });
        if (isAdminResult !== true) {
          const { data: sub } = await adminClient
            .from("subscribers")
            .select("credits_balance")
            .eq("user_id", userId)
            .single();

          if (!sub || sub.credits_balance < getCreditsPerImage(jobData.settings || null)) {
            return errorResponse("Insufficient credits", 402);
          }

          await adminClient.rpc("deduct_user_credits", {
            p_user_id: userId,
            p_amount: getCreditsPerImage(jobData.settings || null),
            p_reason: "bulk_background_retry",
          });
        }

        // Reset result status
        await adminClient
          .from("bulk_background_results")
          .update({ 
            status: "pending", 
            error: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", resultId);

        // Fetch custom background if needed
        let backgroundBase64: string | null = null;
        if (jobData.background_type === "custom" && jobData.background_image_url) {
          try {
            backgroundBase64 = await fetchImageAsBase64(jobData.background_image_url);
          } catch (e) {
            console.error("Failed to fetch custom background:", e);
          }
        }

        // Process inline for retry
        const processResult = await processSingleResult(
          {
            id: result.id,
            job_id: result.job_id,
            source_image_url: result.source_image_url,
            status: "pending",
            image_index: result.image_index,
            retry_count: result.retry_count || 0
          },
          {
            id: result.job_id,
            user_id: jobData.user_id,
            status: "processing",
            background_type: jobData.background_type,
            background_preset_id: jobData.background_preset_id,
            background_image_url: jobData.background_image_url,
            total_images: jobData.total_images,
            completed_images: 0,
            failed_images: 0,
            settings: jobData.settings || null
          },
          adminClient,
          backgroundBase64
        );

        if (!processResult.success) {
          // Refund on failure
          if (isAdminResult !== true) {
            await adminClient.rpc("refund_user_credits", {
              p_user_id: userId,
              p_amount: getCreditsPerImage(jobData.settings || null),
              p_reason: "bulk_background_retry_failed_refund",
            });
          }
          return json({ success: false, error: processResult.error });
        }

        return json({ success: true });
      }

      // ============================================
      // RECOVER STUCK JOBS (called by pg_cron)
      // ============================================
      case "recoverJobs": {
        if (!isServiceRole) {
          return errorResponse("Forbidden", 403);
        }

        const queuedCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        // Jobs queued for more than 3 minutes
        const { data: queuedJobs } = await adminClient
          .from("bulk_background_jobs")
          .select("id")
          .eq("status", "queued")
          .lte("created_at", queuedCutoff)
          .limit(10);

        // Re-trigger queued jobs
        for (const job of queuedJobs || []) {
          console.log(`Recovering queued job: ${job.id}`);
          triggerWorker(job.id);
        }

        // Jobs stuck in processing for more than 10 minutes
        const { data: stuckJobs } = await adminClient
          .from("bulk_background_jobs")
          .select("id, user_id, completed_images, total_images, settings")
          .eq("status", "processing")
          .lte("updated_at", stuckCutoff)
          .limit(10);

        // Mark as failed and refund
        for (const job of stuckJobs || []) {
          console.log(`Failing stuck job: ${job.id}`);
          
          await adminClient
            .from("bulk_background_jobs")
            .update({
              status: "failed",
              error: "Job timeout - automatic recovery",
              finished_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);

          // Refund unprocessed images
          const unprocessed = job.total_images - job.completed_images;
          if (unprocessed > 0) {
            const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: job.user_id });
            if (isAdminResult !== true) {
              await adminClient.rpc("refund_user_credits", {
                p_user_id: job.user_id,
                p_amount: unprocessed * getCreditsPerImage((job as any).settings || null),
                p_reason: "bulk_background_timeout_refund"
              });
            }
          }
        }

        return json({
          recovered: queuedJobs?.length || 0,
          failed: stuckJobs?.length || 0
        });
      }

      // ============================================
      // GET JOB
      // ============================================
      case "getJob": {
        const { jobId } = body;

        const { data: job, error } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (error || !job) {
          return errorResponse("Job not found", 404);
        }

        // Verify ownership for non-service role
        if (!isServiceRole && job.user_id !== userId) {
          return errorResponse("Forbidden", 403);
        }

        return json({ job });
      }

      // ============================================
      // GET JOB RESULTS
      // ============================================
      case "getJobResults": {
        const { jobId } = body;

        // First verify job ownership
        const { data: job } = await adminClient
          .from("bulk_background_jobs")
          .select("user_id")
          .eq("id", jobId)
          .single();

        if (!job || (!isServiceRole && job.user_id !== userId)) {
          return errorResponse("Forbidden", 403);
        }

        const { data: results, error } = await adminClient
          .from("bulk_background_results")
          .select("*")
          .eq("job_id", jobId)
          .order("image_index");

        if (error) {
          return errorResponse("Failed to fetch results", 500);
        }

        return json({ results: results || [] });
      }

      // ============================================
      // CANCEL JOB
      // ============================================
      case "cancelJob": {
        const { jobId } = body;

        const { data: job } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (!job || job.user_id !== userId) {
          return errorResponse("Forbidden", 403);
        }

        if (job.status !== "queued" && job.status !== "processing") {
          return errorResponse("Cannot cancel finished job");
        }

        // Get pending/processing results to refund
        const { data: pendingResults } = await adminClient
          .from("bulk_background_results")
          .select("id")
          .eq("job_id", jobId)
          .in("status", ["pending", "processing"]);

        const refundCount = pendingResults?.length || 0;

        // Update job status
        await adminClient
          .from("bulk_background_jobs")
          .update({ 
            status: "canceled", 
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", jobId);

        // Refund credits for unprocessed images
        if (refundCount > 0) {
          const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: userId });
          if (isAdminResult !== true) {
            const jobSettings = job.settings || null;
            const refundAmount = refundCount * getCreditsPerImage(jobSettings as Record<string, unknown> | null);
            await adminClient.rpc("refund_user_credits", {
              p_user_id: userId,
              p_amount: refundAmount,
              p_reason: "bulk_background_job_canceled",
            });
          }
        }

        return json({ success: true, refunded: refundCount * getCreditsPerImage((job as any)?.settings || null) });
      }

      // ============================================
      // DOWNLOAD ALL
      // ============================================
      case "downloadAll": {
        const { jobId } = body;

        // Verify ownership
        const { data: job } = await adminClient
          .from("bulk_background_jobs")
          .select("user_id")
          .eq("id", jobId)
          .single();

        if (!job || (!isServiceRole && job.user_id !== userId)) {
          return errorResponse("Forbidden", 403);
        }

        // Get completed results
        const { data: results } = await adminClient
          .from("bulk_background_results")
          .select("result_url, image_index")
          .eq("job_id", jobId)
          .eq("status", "completed")
          .order("image_index");

        if (!results?.length) {
          return errorResponse("No completed images to download");
        }

        return json({
          images: results.map((r) => ({ url: r.result_url, index: r.image_index })),
        });
      }

      // ============================================
      // GENERATE DETAILED IMAGE
      // ============================================
      case "generateDetailedImage": {
        if (!userId) {
          return errorResponse("Unauthorized", 401);
        }

        const { resultId } = body;
        if (!resultId) return errorResponse("Missing resultId");

        // Get result with job info
        const { data: result, error: resultError } = await adminClient
          .from("bulk_background_results")
          .select("*, bulk_background_jobs!inner(user_id, id, settings)")
          .eq("id", resultId)
          .single();

        if (resultError || !result) {
          return errorResponse("Result not found", 404);
        }

        const resultJob = result.bulk_background_jobs as { user_id: string; id: string; settings: any };
        if (resultJob.user_id !== userId) {
          return errorResponse("Forbidden", 403);
        }

        if (result.status !== "completed" || !result.result_url) {
          return errorResponse("Result must be completed before generating detailed image");
        }

        // If already generated, return existing URL
        if (result.detailed_result_url) {
          return json({ detailedUrl: result.detailed_result_url });
        }

        // Deduct 1 credit (admin-exempt)
        const { data: isAdminCheck } = await adminClient.rpc("is_admin", { check_user_id: userId });
        if (isAdminCheck !== true) {
          const { data: sub } = await adminClient
            .from("subscribers")
            .select("credits_balance")
            .eq("user_id", userId)
            .single();

          if (!sub || sub.credits_balance < 1) {
            return errorResponse("Insufficient credits", 402);
          }

          await adminClient.rpc("deduct_user_credits", {
            p_user_id: userId,
            p_amount: 1,
            p_reason: "bulk_background_detailed_image",
          });
        }

        try {
          // Fetch the result image
          const resultBase64 = await fetchImageAsBase64(result.result_url);

          const detailedPrompt = `Create a close-up or macro-style view of the uploaded product focusing on material quality, texture, and finish. Preserve exact product details and proportions. Use soft, controlled lighting to enhance surface characteristics without distortion. Shallow depth of field, ultra-sharp focus on key materials, clean background. High-end product photography style, ultra-realistic. Without affecting the product shape.`;

          const parts: unknown[] = [
            { text: detailedPrompt },
            { inlineData: { mimeType: "image/jpeg", data: resultBase64 } }
          ];

          const response = await fetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: {
              "x-goog-api-key": GOOGLE_AI_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: "1:1" }
              }
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Detailed image Gemini error:", errorText);
            // Refund on failure
            if (isAdminCheck !== true) {
              await adminClient.rpc("refund_user_credits", {
                p_user_id: userId,
                p_amount: 1,
                p_reason: "bulk_background_detailed_image_failed_refund",
              });
            }
            return errorResponse("AI generation failed", 500);
          }

          const data = await response.json();
          const imageBase64 = extractBase64Image(data);

          if (!imageBase64) {
            if (isAdminCheck !== true) {
              await adminClient.rpc("refund_user_credits", {
                p_user_id: userId,
                p_amount: 1,
                p_reason: "bulk_background_detailed_image_no_result_refund",
              });
            }
            return errorResponse("No image generated", 500);
          }

          // Convert and upload
          const binaryStr = atob(imageBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const storagePath = `${userId}/${resultJob.id}/${result.image_index}-detailed.webp`;
          const { publicUrl } = await uploadToStorage(adminClient, bytes, storagePath, "image/webp");

          // Update result row
          await (adminClient.from("bulk_background_results") as any)
            .update({ detailed_result_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", resultId);

          return json({ detailedUrl: publicUrl });
        } catch (error) {
          console.error("Detailed image error:", error);
          if (isAdminCheck !== true) {
            await adminClient.rpc("refund_user_credits", {
              p_user_id: userId,
              p_amount: 1,
              p_reason: "bulk_background_detailed_image_error_refund",
            });
          }
          return errorResponse(error instanceof Error ? error.message : "Generation failed", 500);
        }
      }

      default:
        return errorResponse("Unknown action");
    }
  } catch (error) {
    console.error("Bulk background error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
