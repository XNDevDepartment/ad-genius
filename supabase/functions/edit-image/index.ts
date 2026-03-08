import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    // Service-role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── Parse body ──
    const { imageUrl, maskBase64, instruction, originalImageId } = await req.json();

    if (!imageUrl || !instruction) {
      return new Response(
        JSON.stringify({ success: false, error: "imageUrl and instruction are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Deduct 1 credit ──
    const { data: deductResult } = await supabaseAdmin.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: 1,
      p_reason: "image_edit",
    });

    if (!deductResult?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: deductResult?.error || "Insufficient credits",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Download original image ──
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      // Refund on failure
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: 1,
        p_reason: "image_edit_refund_download_failed",
      });
      throw new Error("Failed to download original image");
    }
    const originalImageBytes = new Uint8Array(await imgResponse.arrayBuffer());
    const originalImageBase64 = btoa(String.fromCharCode(...originalImageBytes));

    // ──────────────────────────────────────────────────────────────
    // ██  PLACEHOLDER: Call your image editing model here         ██
    // ██                                                          ██
    // ██  Available inputs:                                       ██
    // ██    - originalImageBase64 (string): base64 of the image   ██
    // ██    - maskBase64 (string|null): white-on-black mask PNG   ██
    // ██    - instruction (string): user's edit instruction        ██
    // ██                                                          ██
    // ██  Expected output:                                        ██
    // ██    - editedImageBytes (Uint8Array): the resulting image   ██
    // ██                                                          ██
    // ██  Replace the block below with your API call.             ██
    // ──────────────────────────────────────────────────────────────

    // TODO: Replace with real model endpoint call
    // Example structure for Gemini / Imagen:
    //
    // const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    // const modelResponse = await fetch(`https://...model-endpoint...`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    //   body: JSON.stringify({
    //     image: originalImageBase64,
    //     mask: maskBase64 || undefined,
    //     prompt: instruction,
    //   }),
    // });
    // const modelResult = await modelResponse.json();
    // const editedImageBase64 = modelResult.image; // base64 result
    // const editedImageBytes = Uint8Array.from(atob(editedImageBase64), c => c.charCodeAt(0));

    // Temporary: return error since model is not yet configured
    await supabaseAdmin.rpc("refund_user_credits", {
      p_user_id: userId,
      p_amount: 1,
      p_reason: "image_edit_refund_model_not_configured",
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: "Image editing model not yet configured. Please set up the model endpoint.",
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // ── After model call: upload result ──
    // Uncomment the following once the model endpoint is set up:
    /*
    const fileName = `edit-${userId}-${Date.now()}.png`;
    const storagePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ugc")
      .upload(storagePath, editedImageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: 1,
        p_reason: "image_edit_refund_upload_failed",
      });
      throw new Error("Failed to upload edited image");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("ugc")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Insert record into ugc_images
    await supabaseAdmin.from("ugc_images").insert({
      user_id: userId,
      public_url: publicUrl,
      storage_path: storagePath,
      prompt: instruction,
      source_image_id: originalImageId || null,
      meta: {
        source: "edit",
        original_image_url: imageUrl,
        has_mask: !!maskBase64,
      },
    });

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    */
  } catch (err) {
    console.error("edit-image error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
