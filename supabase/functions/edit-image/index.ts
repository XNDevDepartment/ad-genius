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
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Google AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;

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
    console.log("Downloading original image:", imageUrl);
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: 1,
        p_reason: "image_edit_refund_download_failed",
      });
      throw new Error("Failed to download original image");
    }
    const originalImageBytes = new Uint8Array(await imgResponse.arrayBuffer());
    const originalImageBase64 = btoa(String.fromCharCode(...originalImageBytes));

    // Determine mime type from response
    const contentType = imgResponse.headers.get("content-type") || "image/png";
    const mimeType = contentType.includes("jpeg") || contentType.includes("jpg") 
      ? "image/jpeg" 
      : "image/png";

    // ── Build prompt with mask context ──
    let editPrompt = instruction;
    if (maskBase64) {
      editPrompt = `Edit only the areas marked in white in the mask image. ${instruction}. Keep all other areas exactly the same.`;
    }

    // ── Call Gemini API for image editing ──
    console.log("Calling Gemini API for image editing...");
    
    const parts: any[] = [
      {
        inline_data: {
          mime_type: mimeType,
          data: originalImageBase64,
        },
      },
    ];

    // Add mask if provided
    if (maskBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: maskBase64,
        },
      });
      parts.push({
        text: `This is the mask where white areas indicate regions to edit. ${editPrompt}`,
      });
    } else {
      parts.push({
        text: `Edit this image: ${editPrompt}. Generate the edited version of the image.`,
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["image", "text"],
            responseMimeType: "image/png",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: 1,
        p_reason: "image_edit_refund_api_failed",
      });
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    console.log("Gemini response received");

    // Extract generated image from response
    let editedImageBase64: string | null = null;
    const candidates = geminiResult.candidates || [];
    for (const candidate of candidates) {
      const candidateParts = candidate.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inline_data?.data) {
          editedImageBase64 = part.inline_data.data;
          break;
        }
      }
      if (editedImageBase64) break;
    }

    if (!editedImageBase64) {
      console.error("No image in Gemini response:", JSON.stringify(geminiResult).slice(0, 500));
      await supabaseAdmin.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: 1,
        p_reason: "image_edit_refund_no_image",
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate edited image. The AI could not process your request.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to bytes
    const editedImageBytes = Uint8Array.from(atob(editedImageBase64), c => c.charCodeAt(0));

    // ── Upload result to storage ──
    const fileName = `edit-${userId}-${Date.now()}.png`;
    const storagePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ugc")
      .upload(storagePath, editedImageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
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

    console.log("Edit complete, returning URL:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("edit-image error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
