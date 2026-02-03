import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.864.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY")!;

const CREDITS_PER_IMAGE = 2;

// Background preset prompts
const PRESET_PROMPTS: Record<string, string> = {
  'white-seamless': 'Place the product on a clean white seamless paper studio background with soft even lighting, professional product photography style',
  'black-studio': 'Place the product on a matte black studio background with dramatic rim lighting, high-end product photography',
  'gradient-gray': 'Place the product on a smooth gray gradient backdrop fading from light to dark, professional catalog photography',
  'soft-pink': 'Place the product on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style',
  'living-room': 'Place the product in a modern minimalist living room setting with natural light from large windows, lifestyle product photography',
  'kitchen': 'Place the product on a bright kitchen countertop with marble surface and natural daylight, home lifestyle photography',
  'bedroom': 'Place the product in a cozy bedroom setting with soft neutral bedding and warm ambient lighting',
  'home-office': 'Place the product on a modern home office desk with plants and minimal decor, professional yet homey setting',
  'beach': 'Place the product on a sandy beach with ocean waves in the background, golden hour sunlight, vacation lifestyle',
  'forest': 'Place the product in a serene forest setting with dappled sunlight filtering through trees, natural and organic feel',
  'garden': 'Place the product in a lush garden with colorful flowers and greenery, fresh spring atmosphere',
  'mountain': 'Place the product with majestic mountain landscape in the background, adventure and outdoor lifestyle',
  'cafe': 'Place the product on a rustic coffee shop table with warm ambient lighting and bokeh background, urban lifestyle',
  'street': 'Place the product in an urban street setting with city architecture and natural daylight, streetwear aesthetic',
  'rooftop': 'Place the product on a rooftop terrace with city skyline in the background, sophisticated urban setting',
  'subway': 'Place the product in a modern metro station with clean lines and urban commuter atmosphere',
  'editorial': 'Place the product in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality',
  'fashion': 'Place the product in a fashion photography studio with seamless background and professional studio lighting',
  'minimal': 'Place the product in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic',
  'vogue': 'Place the product in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting',
  'christmas': 'Place the product in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere',
  'summer': 'Place the product in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere',
  'autumn': 'Place the product surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel',
  'spring': 'Place the product in a fresh spring garden with blooming flowers, soft pastel colors, and new growth'
};

function getS3Client() {
  return new S3Client({
    region: "fsn1",
    endpoint: "https://fsn1.your-objectstorage.com",
    credentials: {
      accessKeyId: Deno.env.get("HETZNER_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("HETZNER_SECRET_ACCESS_KEY")!,
    },
    forcePathStyle: true,
  });
}

async function uploadToStorage(
  imageData: Uint8Array,
  fileName: string,
  contentType: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const s3 = getS3Client();
  const bucket = Deno.env.get("HETZNER_BUCKET_NAME")!;
  const storagePath = `bulk-background/${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      Body: imageData,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const publicUrl = `https://${bucket}.fsn1.your-objectstorage.com/${storagePath}`;
  return { storagePath, publicUrl };
}

async function generateImage(
  sourceImageBase64: string,
  prompt: string
): Promise<Uint8Array | null> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateContent?key=${GOOGLE_AI_API_KEY}`;

  const fullPrompt = `${prompt}. Center the product in the frame. Keep the product exactly as it appears, only change the background. Maintain product proportions and quality. Professional e-commerce product photography.`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: sourceImageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["image", "text"],
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error:", error);
    return null;
  }

  const data = await response.json();
  const candidates = data.candidates || [];
  
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const binaryStr = atob(part.inlineData.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
      }
    }
  }

  return null;
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

async function triggerWorker(jobId: string, retryCount = 0): Promise<void> {
  const maxRetries = 3;
  const delay = Math.pow(2, retryCount) * 1000;

  try {
    await new Promise((resolve) => setTimeout(resolve, delay));
    
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case "createJob": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { sourceImageIds, backgroundType, backgroundPresetId, backgroundImageBase64, settings } = body;

        // Validate inputs
        if (!sourceImageIds?.length) {
          return new Response(JSON.stringify({ error: "No source images provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (backgroundType === "preset" && !backgroundPresetId) {
          return new Response(JSON.stringify({ error: "No background preset selected" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (backgroundType === "custom" && !backgroundImageBase64) {
          return new Response(JSON.stringify({ error: "No custom background provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get source images
        const { data: sourceImages, error: sourceError } = await adminClient
          .from("source_images")
          .select("id, public_url")
          .in("id", sourceImageIds);

        if (sourceError || !sourceImages?.length) {
          return new Response(JSON.stringify({ error: "Failed to fetch source images" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if admin (skip credit check)
        const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: userId });
        const isAdmin = isAdminResult === true;

        const totalCost = sourceImages.length * CREDITS_PER_IMAGE;

        // Check credits for non-admin users
        if (!isAdmin) {
          const { data: subscriber } = await adminClient
            .from("subscribers")
            .select("credits_balance")
            .eq("user_id", userId)
            .single();

          if (!subscriber || subscriber.credits_balance < totalCost) {
            return new Response(
              JSON.stringify({
                error: "Insufficient credits",
                required: totalCost,
                available: subscriber?.credits_balance || 0,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Deduct credits upfront
          const { error: deductError } = await adminClient.rpc("deduct_user_credits", {
            p_user_id: userId,
            p_amount: totalCost,
            p_reason: "bulk_background_generation",
          });

          if (deductError) {
            return new Response(JSON.stringify({ error: "Failed to deduct credits" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Upload custom background if provided
        let backgroundImageUrl: string | null = null;
        if (backgroundType === "custom" && backgroundImageBase64) {
          const binaryStr = atob(backgroundImageBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const fileName = `${userId}/${Date.now()}-custom-bg.jpg`;
          const { publicUrl } = await uploadToStorage(bytes, fileName, "image/jpeg");
          backgroundImageUrl = publicUrl;
        }

        // Create job record
        const { data: job, error: jobError } = await adminClient
          .from("bulk_background_jobs")
          .insert({
            user_id: userId,
            status: "queued",
            background_type: backgroundType,
            background_preset_id: backgroundPresetId || null,
            background_image_url: backgroundImageUrl,
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
          return new Response(JSON.stringify({ error: "Failed to create job" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create result placeholders
        const resultInserts = sourceImages.map((img, index) => ({
          job_id: job.id,
          user_id: userId,
          source_image_id: img.id,
          source_image_url: img.public_url,
          status: "pending",
          image_index: index,
        }));

        await adminClient.from("bulk_background_results").insert(resultInserts);

        // Trigger worker (fire-and-forget)
        triggerWorker(job.id);

        return new Response(JSON.stringify({ jobId: job.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "processJob": {
        if (!isServiceRole) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { jobId } = body;

        // Get job
        const { data: job, error: jobError } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (jobError || !job) {
          console.error("Job not found:", jobId);
          return new Response(JSON.stringify({ error: "Job not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Skip if already processing or finished
        if (job.status !== "queued") {
          return new Response(JSON.stringify({ status: job.status }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update to processing
        await adminClient
          .from("bulk_background_jobs")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("id", jobId);

        // Get results to process
        const { data: results } = await adminClient
          .from("bulk_background_results")
          .select("*")
          .eq("job_id", jobId)
          .order("image_index");

        if (!results?.length) {
          await adminClient
            .from("bulk_background_jobs")
            .update({ status: "failed", error: "No images to process" })
            .eq("id", jobId);
          return new Response(JSON.stringify({ error: "No images" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Determine the prompt
        let prompt: string;
        if (job.background_type === "preset" && job.background_preset_id) {
          prompt = PRESET_PROMPTS[job.background_preset_id] || "Place the product on a clean white background";
        } else {
          prompt = "Use the provided background image to replace the background of this product. Keep the product centered.";
        }

        let completedCount = 0;
        let failedCount = 0;

        // Process each image
        for (const result of results) {
          const startTime = Date.now();

          try {
            // Update result to processing
            await adminClient
              .from("bulk_background_results")
              .update({ status: "processing" })
              .eq("id", result.id);

            // Fetch source image as base64
            const sourceBase64 = await fetchImageAsBase64(result.source_image_url);

            // Generate new image
            const generatedImage = await generateImage(sourceBase64, prompt);

            if (!generatedImage) {
              throw new Error("Image generation failed");
            }

            // Upload result
            const fileName = `${job.user_id}/${jobId}/${result.image_index}-result.webp`;
            const { storagePath, publicUrl } = await uploadToStorage(
              generatedImage,
              fileName,
              "image/webp"
            );

            const processingTime = Date.now() - startTime;

            // Update result with success
            await adminClient
              .from("bulk_background_results")
              .update({
                status: "completed",
                result_url: publicUrl,
                storage_path: storagePath,
                processing_time_ms: processingTime,
              })
              .eq("id", result.id);

            completedCount++;
          } catch (error) {
            console.error(`Failed to process image ${result.id}:`, error);
            failedCount++;

            await adminClient
              .from("bulk_background_results")
              .update({
                status: "failed",
                error: error instanceof Error ? error.message : "Processing failed",
              })
              .eq("id", result.id);
          }

          // Update job progress
          const progress = Math.round(((completedCount + failedCount) / results.length) * 100);
          await adminClient
            .from("bulk_background_jobs")
            .update({
              completed_images: completedCount,
              failed_images: failedCount,
              progress,
            })
            .eq("id", jobId);
        }

        // Refund credits for failed images (non-admin users)
        if (failedCount > 0) {
          const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: job.user_id });
          if (isAdminResult !== true) {
            const refundAmount = failedCount * CREDITS_PER_IMAGE;
            await adminClient.rpc("refund_user_credits", {
              p_user_id: job.user_id,
              p_amount: refundAmount,
              p_reason: "bulk_background_failed_images_refund",
            });
          }
        }

        // Mark job complete
        const finalStatus = failedCount === results.length ? "failed" : "completed";
        await adminClient
          .from("bulk_background_jobs")
          .update({
            status: finalStatus,
            finished_at: new Date().toISOString(),
            error: failedCount > 0 ? `${failedCount} image(s) failed to process` : null,
          })
          .eq("id", jobId);

        return new Response(
          JSON.stringify({ status: finalStatus, completed: completedCount, failed: failedCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getJob": {
        const { jobId } = body;

        const { data: job, error } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (error || !job) {
          return new Response(JSON.stringify({ error: "Job not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify ownership for non-service role
        if (!isServiceRole && job.user_id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ job }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getJobResults": {
        const { jobId } = body;

        // First verify job ownership
        const { data: job } = await adminClient
          .from("bulk_background_jobs")
          .select("user_id")
          .eq("id", jobId)
          .single();

        if (!job || (!isServiceRole && job.user_id !== userId)) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: results, error } = await adminClient
          .from("bulk_background_results")
          .select("*")
          .eq("job_id", jobId)
          .order("image_index");

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to fetch results" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ results: results || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancelJob": {
        const { jobId } = body;

        const { data: job } = await adminClient
          .from("bulk_background_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (!job || job.user_id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (job.status !== "queued" && job.status !== "processing") {
          return new Response(JSON.stringify({ error: "Cannot cancel finished job" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
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
          .update({ status: "canceled", finished_at: new Date().toISOString() })
          .eq("id", jobId);

        // Refund credits for unprocessed images
        if (refundCount > 0) {
          const { data: isAdminResult } = await adminClient.rpc("is_admin", { check_user_id: userId });
          if (isAdminResult !== true) {
            const refundAmount = refundCount * CREDITS_PER_IMAGE;
            await adminClient.rpc("refund_user_credits", {
              p_user_id: userId,
              p_amount: refundAmount,
              p_reason: "bulk_background_job_canceled",
            });
          }
        }

        return new Response(JSON.stringify({ success: true, refunded: refundCount * CREDITS_PER_IMAGE }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "downloadAll": {
        const { jobId } = body;

        // Get completed results
        const { data: results } = await adminClient
          .from("bulk_background_results")
          .select("result_url, image_index")
          .eq("job_id", jobId)
          .eq("status", "completed")
          .order("image_index");

        if (!results?.length) {
          return new Response(JSON.stringify({ error: "No completed images to download" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Return list of URLs (client-side will handle ZIP creation)
        return new Response(
          JSON.stringify({
            images: results.map((r) => ({ url: r.result_url, index: r.image_index })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Bulk background error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
