import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Helper function to check if user is admin
async function isUserAdmin(supabaseClient: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabaseClient.rpc('is_user_admin', {
    check_user_id: userId
  });
  if (error) {
    console.error('[ADMIN-CHECK] Error checking admin status:', error);
    return false;
  }
  return data === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    
    if (!googleApiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, ...params } = await req.json();

    if (action === "uploadAndProcessModel") {
      return await uploadAndProcessModel(supabaseClient, user.id, params, googleApiKey);
    } else if (action === "generateModelWithAI") {
      return await generateModelWithAI(supabaseClient, user.id, params, googleApiKey);
    } else if (action === "saveModel") {
      return await saveModel(supabaseClient, user.id, params);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("Error in create-base-model:", error);
    return new Response(JSON.stringify({
      error: error?.message || "Unknown error"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

async function uploadAndProcessModel(supabaseClient: SupabaseClient, userId: string, params: any, googleApiKey: string) {
  const { imageDataUrl, metadata, previewMode = false } = params;
  const creditCost = 5;

  // Validate image format before proceeding
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    throw new Error("Invalid image data");
  }

  // Extract MIME type from data URL
  const mimeMatch = imageDataUrl.match(/^data:image\/([\w+]+);base64,/);
  if (!mimeMatch) {
    throw new Error("Invalid image format. Please upload a valid image file.");
  }

  const detectedMimeType = mimeMatch[1].toLowerCase();
  const supportedFormats = ['png', 'jpg', 'jpeg'];
  
  if (!supportedFormats.includes(detectedMimeType)) {
    console.error(`Unsupported format detected: ${detectedMimeType}`);
    throw new Error(`Unsupported image format: ${detectedMimeType.toUpperCase()}. Please use PNG, JPG, or JPEG images only.`);
  }

  console.log(`Image format validated: ${detectedMimeType.toUpperCase()}`);

  // ONLY deduct credits if NOT in preview mode
  if (!previewMode) {
    const { data: creditCheck, error: creditError } = await supabaseClient.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: "upload_base_model"
    });
    if (creditError || !creditCheck?.success) {
      throw new Error(creditCheck?.error || "Insufficient credits");
    }
  }

  try {
    // Child-safe detection: swap wardrobe for minors (same logic as generateModelWithAI)
    const childAgeRanges = ['0-12 months', '1-3 years', '4-7 years', '8-12 years', '13-17 years'];
    const isChild = childAgeRanges.includes(metadata?.ageRange);
    
    const wardrobeText = isChild
      ? 'Simple, modest, loose-fitting plain neutral-tone cotton t-shirt (gray or white), plain standard-fit blue jeans, plain white sneakers. No logos, patterns, or graphics.'
      : 'seamless neutral-tone fitted bodysuit (no logos/patterns), barefoot';

    // Process image with Gemini - remove background and replace with studio
    const prompt = `Remove the background from this image and replace it with Background: seamless light gray studio. Camera 50mm f/4 ISO200 1/125. Lighting: softbox 45° key + reflector fill, even exposure. ###IMPORTANT: New wardrobe baseline: ${wardrobeText}. Neutral expression, hands relaxed, fingers natural, head to toe visible, clean silhouette. One subject only. Lips Smiling slightly. Insert "GeniusAI" watermark on bottom right, almost non existent. Output 2048x3072, sRGB, 300dpi. Negative: only produce model and no more elements in the picture, lowres, blurry, jpeg artifacts, extra limbs, extra fingers, fused fingers, disfigured, distorted proportions, wet/oily skin, cleavage emphasis, lingerie, underwear straps, see-through fabric, strong face shadows, color cast, watermark, logo, text, border. ### RULE: NEVER PRODUCE SEXUALISE CONTENT`;
    
    // Extract base64 data from data URL
    const base64Match = imageDataUrl.match(/^data:image\/(.*?);base64,(.*)$/);
    if (!base64Match) {
      throw new Error("Invalid image data URL format");
    }
    const mimeType = `image/${base64Match[1]}`;
    const base64Image = base64Match[2];

    const controller = new AbortController();
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": googleApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      }),
      signal: controller.signal
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        body: errorText,
      });
      
      if (geminiResponse.status === 429) {
        throw new Error("AI service is currently at capacity. Please wait a moment and try again.");
      } else if (geminiResponse.status === 402) {
        throw new Error("AI service quota exceeded. Please contact support.");
      } else if (geminiResponse.status === 400) {
        throw new Error("Unsupported image format. Please use PNG, JPG, or JPEG images only. Other formats like WEBP, GIF, or HEIC are not supported.");
      }
      
      throw new Error(`Background removal failed (${geminiResponse.status}). Please try a different image or contact support.`);
    }

    const geminiData = await geminiResponse.json();
    const processedImageData = geminiData.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;
    
    if (!processedImageData) {
      console.error("No image in Gemini response:", JSON.stringify(geminiData));
      throw new Error("No image generated by Gemini");
    }

    // IF PREVIEW MODE: Return image data without saving
    if (previewMode) {
      const imageDataUrlResult = `data:image/png;base64,${processedImageData}`;
      return new Response(JSON.stringify({
        success: true,
        imageDataUrl: imageDataUrlResult,
        metadata: metadata,
        creditsDeducted: 0
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // IF NOT PREVIEW: Save to storage and DB
    // Convert base64 to blob
    const imageBlob = Uint8Array.from(atob(processedImageData), (c) => c.charCodeAt(0));
    
    // Upload to storage
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}-${metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from("outfit-user-models")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: false
      });
    
    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from("outfit-user-models")
      .getPublicUrl(storagePath);

    // Create base model entry
    const { data: baseModel, error: dbError } = await supabaseClient
      .from("outfit_swap_base_models")
      .insert({
        user_id: userId,
        name: metadata.name,
        gender: metadata.gender,
        age_range: metadata.ageRange,
        body_type: metadata.bodyType,
        pose_type: metadata.poseType,
        skin_tone: metadata.skinTone,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        is_system: false,
        is_active: true
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      baseModel
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    // ONLY refund if credits were deducted (not in preview mode)
    const userIsAdmin = await isUserAdmin(supabaseClient, userId);
    if (!previewMode && !userIsAdmin) {
      await supabaseClient.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "upload_base_model_failed"
      });
    }
    throw error;
  }
}

async function generateModelWithAI(supabaseClient: SupabaseClient, userId: string, params: any, googleApiKey: string) {
  const { name, gender, nationality, ageRange, bodyType, height, skinTone, hair, eyes, pose, gentleSmile, previewMode = false } = params;
  const creditCost = 6;

  // ONLY deduct credits if NOT in preview mode
  if (!previewMode) {
    const { data: creditCheck, error: creditError } = await supabaseClient.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: "generate_ai_base_model"
    });
    if (creditError || !creditCheck?.success) {
      throw new Error(creditCheck?.error || "Insufficient credits");
    }
  }

  try {
    // Build the structured generation prompt
    const nationalityText = nationality && nationality !== 'not-specified' ? nationality : 'diverse';
    const expressionText = gentleSmile ? 'gentle, warm smile' : 'neutral, confident expression';
    
    // Child-safe detection: swap wardrobe and body type for minors
    const childAgeRanges = ['0-12 months', '1-3 years', '4-7 years', '8-12 years', '13-17 years'];
    const isChild = childAgeRanges.includes(ageRange);
    
    const wardrobeText = isChild
      ? `- Simple, modest, loose-fitting plain neutral-tone cotton t-shirt (gray or white)
      - Plain standard-fit blue jeans
      - Plain white sneakers
      - No logos, patterns, or graphics`
      : `- Form-fitting seamless neutral-tone bodysuit (beige, gray, or nude tone)
      - No logos, patterns, or visible seams
      - Barefoot`;
    
    const bodyTypeText = isChild ? 'healthy, standard proportions' : bodyType;
    
    const prompt = `TASK: Generate a photorealistic full-body fashion model photo for clothing try-on.

      SUBJECT:
      - Gender: ${gender}
      - Ethnicity: ${nationalityText}
      - Age: ${ageRange}
      - Height: ${height}cm
      - Body type: ${bodyTypeText}
      - Skin tone: ${skinTone}
      - Hair: ${hair.length}, ${hair.texture}, ${hair.color}
      - Eyes: ${eyes}

      POSE & EXPRESSION:
      - Body pose: ${pose} (natural, relaxed stance)
      - Expression: ${expressionText}
      - Hands: relaxed and natural at sides, fingers clearly defined and separated
      - Arms: slightly away from body for clean silhouette

      WARDROBE:
      ${wardrobeText}

      ENVIRONMENT:
      - Background: clean seamless solid light gray studio backdrop (#E8E8E8)
      - Empty studio with no visible equipment, lights, tripods, cameras, or reflectors
      - No shadows on background, no floor lines

      CAMERA & LIGHTING:
      - Full-body framing, entire figure from head to toe visible with margin
      - Camera: 85mm portrait lens, f/4, ISO 200
      - Soft diffused key light at 45 degrees
      - Fill reflector for even skin tones, no harsh shadows on face or body
      - Catch light in eyes

      OUTPUT REQUIREMENTS:
      - Single model only, centered in frame
      - Professional fashion photography quality
      - Clean silhouette suitable for virtual try-on
      - High detail on hands and face
      - 2048x3072 portrait orientation

      STRICTLY AVOID: multiple people, studio equipment in frame, props, accessories, jewelry, makeup emphasis, blurry areas, distorted anatomy, extra limbs, merged fingers, watermarks, text, logos, sexualized poses, lingerie, see-through fabric, wet/oily skin appearance, inappropriate or unnatural poses.`;
    
    console.log("Generating AI model with prompt:", prompt);

    const controller = new AbortController();
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": googleApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      }),
      signal: controller.signal
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedImageData = geminiData.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;
    
    if (!generatedImageData) {
      console.error("No image in Gemini response:", JSON.stringify(geminiData));
      throw new Error("No image generated by Gemini");
    }

    // IF PREVIEW MODE: Return image data without saving
    if (previewMode) {
      const imageDataUrl = `data:image/png;base64,${generatedImageData}`;
      return new Response(JSON.stringify({
        success: true,
        imageDataUrl: imageDataUrl,
        metadata: {
          name,
          gender: gender === "non-binary" ? "unisex" : gender,
          ageRange,
          bodyType,
          poseType: pose,
          skinTone
        },
        creditsDeducted: 0
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // IF NOT PREVIEW: Save to storage and DB
    // Convert base64 to blob
    const imageBlob = Uint8Array.from(atob(generatedImageData), (c) => c.charCodeAt(0));
    
    // Upload to storage
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from("outfit-user-models")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: false
      });
    
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from("outfit-user-models")
      .getPublicUrl(storagePath);

    // Create base model entry
    const { data: baseModel, error: dbError } = await supabaseClient
      .from("outfit_swap_base_models")
      .insert({
        user_id: userId,
        name,
        gender: gender === "non-binary" ? "unisex" : gender,
        age_range: ageRange,
        body_type: bodyType,
        pose_type: pose,
        skin_tone: skinTone,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        is_system: false,
        is_active: true,
        metadata: {
          height,
          hair,
          eyes,
          nationality,
          gentleSmile,
          generatedWithAI: true
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      throw dbError;
    }

    console.log("AI model generated successfully:", baseModel.id);

    return new Response(JSON.stringify({
      success: true,
      baseModel
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error in generateModelWithAI:", error);
    // ONLY refund if credits were deducted (not in preview mode)
    const userIsAdmin = await isUserAdmin(supabaseClient, userId);
    if (!previewMode && !userIsAdmin) {
      await supabaseClient.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "generate_ai_base_model_failed"
      });
    }
    throw error;
  }
}

async function saveModel(supabaseClient: SupabaseClient, userId: string, params: any) {
  const { imageDataUrl, metadata, isAIGenerated = false } = params;
  const creditCost = isAIGenerated ? 6 : 5;

  // Deduct credits NOW (when user confirms save)
  const { data: creditCheck, error: creditError } = await supabaseClient.rpc("deduct_user_credits", {
    p_user_id: userId,
    p_amount: creditCost,
    p_reason: isAIGenerated ? "save_ai_base_model" : "save_uploaded_base_model"
  });
  
  if (creditError || !creditCheck?.success) {
    throw new Error(creditCheck?.error || "Insufficient credits");
  }

  try {
    // Extract base64 from data URL
    const base64Match = imageDataUrl.match(/^data:image\/(.*?);base64,(.*)$/);
    if (!base64Match) {
      throw new Error("Invalid image data URL format");
    }
    
    const base64Image = base64Match[2];
    const imageBlob = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
    
    // Upload to storage (outfit-user-models)
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}-${metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from("outfit-user-models")
      .upload(storagePath, imageBlob, {
        contentType: "image/png",
        upsert: false
      });
    
    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from("outfit-user-models")
      .getPublicUrl(storagePath);

    // Save to database
    const { data: baseModel, error: dbError } = await supabaseClient
      .from("outfit_swap_base_models")
      .insert({
        user_id: userId,
        name: metadata.name,
        gender: metadata.gender,
        age_range: metadata.ageRange || metadata.age_range,
        body_type: metadata.bodyType || metadata.body_type,
        pose_type: metadata.poseType || metadata.pose_type,
        skin_tone: metadata.skinTone || metadata.skin_tone,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        is_system: false,
        is_active: true,
        metadata: isAIGenerated ? { generatedWithAI: true } : {}
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      baseModel
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    // ONLY refund credits if they were deducted
    const userIsAdmin = await isUserAdmin(supabaseClient, userId);
    if (!userIsAdmin) {
      await supabaseClient.rpc("refund_user_credits", {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: "save_base_model_failed"
      });
    }
    throw error;
  }
}
