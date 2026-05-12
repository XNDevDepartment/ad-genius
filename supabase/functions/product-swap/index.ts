// Product Swap edge function
// Replaces a product in a reference scene image with a new product image,
// preserving scene/lighting/composition. Guided by audience + scenario.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type SizeTier = "small" | "medium" | "large";
const tierToCredits: Record<SizeTier, number> = { small: 1, medium: 2, large: 3 };

async function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${url} (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    for (let j = 0; j < sub.length; j++) binary += String.fromCharCode(sub[j]);
  }
  const ct = res.headers.get("content-type") || "image/png";
  const mimeType = ct.includes("jpeg") || ct.includes("jpg") ? "image/jpeg" : "image/png";
  return { base64: btoa(binary), mimeType };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

  // ── Auth ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { success: false, error: "Unauthorized" });
  }
  if (!googleApiKey) {
    return json(500, { success: false, error: "Google AI API key not configured" });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData?.user) {
    return json(401, { success: false, error: "Unauthorized" });
  }
  const userId = userData.user.id;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // ── Parse + validate body ──
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: "Invalid JSON body" });
  }

  const {
    referenceImageUrl,
    newProductImageUrl,
    referenceImageId = null,
    newProductImageId = null,
    audience,
    scenario,
    settings = {},
  } = body || {};

  if (!referenceImageUrl || typeof referenceImageUrl !== "string") {
    return json(400, { success: false, error: "referenceImageUrl is required" });
  }
  if (!newProductImageUrl || typeof newProductImageUrl !== "string") {
    return json(400, { success: false, error: "newProductImageUrl is required" });
  }
  if (!audience || typeof audience !== "string" || audience.trim().length < 2) {
    return json(400, { success: false, error: "audience is required" });
  }
  if (!scenario || typeof scenario !== "string" || scenario.trim().length < 2) {
    return json(400, { success: false, error: "scenario is required" });
  }

  const tier: SizeTier = (settings.resolution_tier as SizeTier) || "small";
  const cost = tierToCredits[tier] ?? 1;

  // ── Deduct credits up-front ──
  const { data: deductResult } = await supabaseAdmin.rpc("deduct_user_credits", {
    p_user_id: userId,
    p_amount: cost,
    p_reason: "product_swap",
  });
  if (!deductResult?.success) {
    return json(402, {
      success: false,
      error: deductResult?.error || "Insufficient credits",
    });
  }

  const refundCredits = async (reason: string) => {
    try {
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: cost,
        p_reason: reason,
      });
    } catch (e) {
      console.error("Refund failed:", e);
    }
  };

  // ── Create job row ──
  const { data: jobRow, error: jobErr } = await supabaseAdmin
    .from("product_swap_jobs")
    .insert({
      user_id: userId,
      status: "processing",
      progress: 10,
      reference_image_id: referenceImageId,
      reference_image_url: referenceImageUrl,
      new_product_image_id: newProductImageId,
      new_product_image_url: newProductImageUrl,
      audience: audience.trim(),
      scenario: scenario.trim(),
      settings,
      credits_spent: cost,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (jobErr || !jobRow) {
    console.error("Job insert error:", jobErr);
    await refundCredits("product_swap_refund_job_insert_failed");
    return json(500, { success: false, error: "Failed to create job" });
  }

  const jobId = jobRow.id;

  const failJob = async (errMsg: string, refundReason: string) => {
    await refundCredits(refundReason);
    await supabaseAdmin
      .from("product_swap_jobs")
      .update({
        status: "failed",
        error: errMsg,
        finished_at: new Date().toISOString(),
        progress: 100,
      })
      .eq("id", jobId);
  };

  try {
    // ── Auto-save audience + scenario ──
    try {
      const audLabel = audience.trim().length > 60 ? audience.trim().slice(0, 60) + "…" : audience.trim();
      await supabaseAdmin.from("custom_audiences").upsert(
        { user_id: userId, label: audLabel, audience: audience.trim(), used_at: new Date().toISOString() },
        { onConflict: "user_id,audience" } as any
      );
    } catch (e) {
      console.warn("audience save skipped:", e);
    }
    try {
      const scTitle = scenario.trim().split(/[.!?\n]/)[0].slice(0, 60) || "Scenario";
      const { data: existing } = await supabaseAdmin
        .from("custom_scenarios")
        .select("id")
        .eq("user_id", userId)
        .eq("description", scenario.trim())
        .limit(1);
      if (existing && existing.length > 0) {
        await supabaseAdmin
          .from("custom_scenarios")
          .update({ used_at: new Date().toISOString(), title: scTitle })
          .eq("id", (existing[0] as any).id);
      } else {
        await supabaseAdmin
          .from("custom_scenarios")
          .insert({ user_id: userId, title: scTitle, description: scenario.trim() });
      }
    } catch (e) {
      console.warn("scenario save skipped:", e);
    }

    // ── Download both images ──
    const [refImg, newImg] = await Promise.all([
      downloadAsBase64(referenceImageUrl),
      downloadAsBase64(newProductImageUrl),
    ]);

    await supabaseAdmin
      .from("product_swap_jobs")
      .update({ progress: 35 })
      .eq("id", jobId);

    // ── Build Gemini multi-image prompt ──
    const prompt = `MANDATORY RULES — PRODUCT SWAP
You are given TWO images:
- IMAGE 1 = REFERENCE SCENE: a finished photo containing a product, a model/setting, lighting, and composition.
- IMAGE 2 = NEW PRODUCT (isolated reference of the product to insert).

GOAL: Produce ONE photo that is identical to IMAGE 1 in EVERY way — same model, same pose, same hands, same background, same lighting, same camera angle, same framing, same shadows, same color grading — EXCEPT the original product is REPLACED by the product shown in IMAGE 2.

PATTERN FIDELITY (CRITICAL):
- Reproduce the new product's exact shape, proportions, colors, textures, materials, logos, prints, fabric weave, stitching and labels from IMAGE 2.
- Do NOT invent or alter product details. Do NOT add elements not present on the new product.
- Match the lighting and shadows of IMAGE 1 onto the new product so it looks naturally part of the scene.

PRESERVATION RULES:
- Keep the model's face, body, skin tone, hair and pose IDENTICAL to IMAGE 1.
- Keep the background, props, floor, wall and environmental details IDENTICAL to IMAGE 1.
- Keep grip/contact points: if hands are holding/touching the product, the new product must be held in the same way at the same contact points.
- Do not change framing, crop, or aspect ratio of IMAGE 1.

CONTEXT (for subtle styling consistency only — do NOT add text or graphics):
- Audience: ${audience.trim()}
- Scenario: ${scenario.trim()}

OUTPUT: Return ONLY the final image. No text, no watermarks, no borders.`;

    const parts = [
      { inlineData: { mimeType: refImg.mimeType, data: refImg.base64 } },
      { inlineData: { mimeType: newImg.mimeType, data: newImg.base64 } },
      { text: prompt },
    ];

    // ── Call Gemini (Nano Banana 2 image preview) with retries ──
    let resultBase64: string | null = null;
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = 900 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, delay));
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": googleApiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`Gemini error (attempt ${attempt + 1}):`, geminiResponse.status, errorText);
        if (attempt < maxAttempts - 1 && (geminiResponse.status === 429 || geminiResponse.status >= 500)) {
          continue;
        }
        await failJob(`Gemini API error: ${geminiResponse.status}`, "product_swap_refund_api_failed");
        return json(502, { success: false, error: `Gemini API error: ${geminiResponse.status}` });
      }

      const result = await geminiResponse.json();
      const candidates = result.candidates || [];
      for (const c of candidates) {
        const cParts = c.content?.parts || [];
        for (const p of cParts) {
          if (p.inlineData?.data) {
            resultBase64 = p.inlineData.data;
            break;
          }
        }
        if (resultBase64) break;
      }
      if (resultBase64) break;
      console.error(`No image (attempt ${attempt + 1}):`, JSON.stringify(result).slice(0, 500));
    }

    if (!resultBase64) {
      await failJob(
        "AI did not return an image. Try simplifying the scenario or using a clearer product photo.",
        "product_swap_refund_no_image"
      );
      return json(422, {
        success: false,
        error: "Failed to generate swapped image. Please try again.",
      });
    }

    await supabaseAdmin.from("product_swap_jobs").update({ progress: 80 }).eq("id", jobId);

    // ── Upload result ──
    const resultBytes = Uint8Array.from(atob(resultBase64), (c) => c.charCodeAt(0));
    const fileName = `swap-${userId}-${Date.now()}.png`;
    const storagePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("generated-images")
      .upload(storagePath, resultBytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      await failJob("Failed to upload result", "product_swap_refund_upload_failed");
      return json(500, { success: false, error: "Failed to upload result" });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("generated-images")
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    // ── Insert into generated_images ──
    const { data: gen, error: genErr } = await supabaseAdmin
      .from("generated-images" as any)
      .insert({
        user_id: userId,
        prompt: `Product swap — ${scenario.trim().slice(0, 200)}`,
        public_url: publicUrl,
        storage_path: storagePath,
        source_image_id: newProductImageId,
        settings: {
          source: "product_swap",
          product_swap_job_id: jobId,
          reference_image_url: referenceImageUrl,
          new_product_image_url: newProductImageUrl,
          audience: audience.trim(),
          scenario: scenario.trim(),
          resolution_tier: tier,
          ...settings,
        },
      } as any)
      .select("id")
      .maybeSingle();

    // Note: table is generated_images (with underscore)
    let resultImageId: string | null = (gen as any)?.id ?? null;
    if (genErr || !resultImageId) {
      // retry with correct table name (defensive against typo path)
      const { data: gen2 } = await supabaseAdmin
        .from("generated_images")
        .insert({
          user_id: userId,
          prompt: `Product swap — ${scenario.trim().slice(0, 200)}`,
          public_url: publicUrl,
          storage_path: storagePath,
          source_image_id: newProductImageId,
          settings: {
            source: "product_swap",
            product_swap_job_id: jobId,
            reference_image_url: referenceImageUrl,
            new_product_image_url: newProductImageUrl,
            audience: audience.trim(),
            scenario: scenario.trim(),
            resolution_tier: tier,
            ...settings,
          },
        })
        .select("id")
        .single();
      resultImageId = (gen2 as any)?.id ?? null;
    }

    // ── Mark job completed ──
    await supabaseAdmin
      .from("product_swap_jobs")
      .update({
        status: "completed",
        progress: 100,
        result_image_id: resultImageId,
        result_url: publicUrl,
        storage_path: storagePath,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return json(200, {
      success: true,
      jobId,
      imageUrl: publicUrl,
      resultImageId,
    });
  } catch (err) {
    console.error("product-swap error:", err);
    await failJob((err as Error).message || "Internal error", "product_swap_refund_internal_error");
    return json(500, { success: false, error: (err as Error).message || "Internal server error" });
  }
});
