// outfit-swap/index.ts - Gemini API v1.0.1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
const serviceClient = ()=>createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Fallback prompts (used if database is unavailable)
const FALLBACK_GARMENT_ANALYSIS_PROMPT = `Analyze this garment image in detail. Describe:
1. Type of clothing (e.g., t-shirt, dress, pants, jacket, full outfit)
2. Style and fit (e.g., casual, formal, athletic, oversized, fitted)
3. Color and patterns
4. Material appearance (e.g., cotton, denim, leather, knit)
5. Key distinctive features (e.g., collar type, sleeve length, buttons, zippers)
6. What body parts it covers (e.g., torso only, full legs, arms, etc.)

Be specific and concise. This description will be used for AI outfit swapping.`;
const FALLBACK_OUTFIT_SWAP_PROMPT = `You are an expert e-commerce outfit swap AI. Your task is to replace the person's current outfit with a NEW garment while maintaining photographic realism.

GARMENT TO SWAP IN:
{garment_description}

CRITICAL REQUIREMENTS:
1. COMPLETE REPLACEMENT: Remove the person's ENTIRE current outfit and replace it with the new garment described above
2. IDENTITY PRESERVATION: Keep the person's face, hair, skin tone, hands, and body pose 100% IDENTICAL
3. VISIBLE CHANGE: The final image MUST show CLEARLY DIFFERENT clothing than the original - this is CRITICAL
4. BODY COVERAGE: Replace all clothing that covers the same body parts as the new garment:
  - If the new garment is a top: Replace the current top completely
  - If it's pants/bottoms: Replace the current bottoms completely
  - If it's a dress/full outfit: Replace ALL current clothing
  - If it's a jacket/outerwear: Layer it appropriately over a compatible base
  — If the new garment is not full body piece, create the rest of the outfit

COMPOSITION & QUALITY:
- Center the model in the frame for professional product photography
- Clean, minimal background - remove/blur distracting elements (plants, furniture, clutter)
- Professional e-commerce lighting and presentation
- Natural shadows and highlights matching the garment
- Seamless blending at all garment edges (neckline, sleeves, hem, waist)

SMART STYLING:
- Match footwear to outfit style (heels for formal, sneakers for casual/athletic, boots for edgy/outdoor)
- Adjust accessories if they clash with the new outfit
- If the new garment requires different proportions, adjust body naturally (e.g., fitted dress vs oversized hoodie)
- Ensure overall look is cohesive and realistic.
- Don't leave on underwear. Imagine a complement piece of cloth in case of being only a partial garment.

QUALITY STANDARDS:
- High-resolution, professional e-commerce product photo quality
- No visible AI artifacts, seams, or blending errors
- The result should look like a real fashion shoot

VALIDATION: Before generating, confirm that:
✓ The new garment is VISIBLY DIFFERENT from the original outfit
✓ All relevant clothing items are being replaced
✓ The person's identity remains identical
✓ The composition is professional and centered

Generate a high-quality outfit swap that clearly shows the NEW garment on the person. ###NO SEXUALISE CONTENT ###RULES - Image must not infringe any System Safety margins and rules.`;
// Helper: Get prompt from database with fallback
async function getPrompt(promptKey, variables = {}, fallback) {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.from('ai_prompts').select('prompt_template').eq('prompt_key', promptKey).eq('is_active', true).single();
    if (error) throw error;
    let prompt = data.prompt_template;
    // Replace variables
    for (const [key, value] of Object.entries(variables)){
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    console.log(`[getPrompt] Successfully loaded prompt: ${promptKey}`);
    return prompt;
  } catch (error) {
    console.warn(`[getPrompt] Failed to load prompt ${promptKey}, using fallback:`, error);
    // Apply variables to fallback
    let prompt = fallback;
    for (const [key, value] of Object.entries(variables)){
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return prompt;
  }
}
// Helper: Check if user is admin
async function checkIsAdmin(userId) {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc('is_user_admin', {
    check_user_id: userId
  });
  if (error) {
    console.error('[checkIsAdmin] Error:', error);
    return false;
  }
  return data || false;
}
// Helper: Deduct credits from user
async function deductCredits(userId, amount) {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: 'ecommerce_photo_generation'
  });
  if (error) {
    console.error('[deductCredits] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
  if (!data?.success) {
    return {
      success: false,
      error: 'Insufficient credits'
    };
  }
  return {
    success: true
  };
}
// Helper: Refund credits to user
async function refundCredits(userId, amount, reason = 'ecommerce_photo_failed_or_cancelled') {
  const supabase = serviceClient();
  const { error } = await supabase.rpc('refund_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason
  });
  if (error) {
    console.error('[refundCredits] Error:', error);
  }
}
// Helper: Extract base64 image from Gemini response
function extractBase64Image(jsonResp) {
  console.log('[extractBase64Image] Parsing response structure...');
  if (!jsonResp?.candidates) {
    console.error('[extractBase64Image] No candidates in response');
    return null;
  }
  const parts = jsonResp.candidates?.[0]?.content?.parts ?? [];
  console.log(`[extractBase64Image] Found ${parts.length} parts in response`);
  const imgPart = parts.find((p)=>p?.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart) {
    console.error('[extractBase64Image] No image part found. Parts structure:', JSON.stringify(parts.map((p)=>Object.keys(p))));
    return null;
  }
  const imageData = imgPart.inlineData?.data;
  if (!imageData) {
    console.error('[extractBase64Image] Image part found but no data');
    return null;
  }
  console.log(`[extractBase64Image] ✅ Extracted image data (${imageData.length} chars)`);
  return imageData;
}
// Helper: Generate image with retry logic and exponential backoff
async function generateImageWithRetry(prompt, base64Image, mimeType, additionalImages = [], maxRetries = 3) {
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      console.log(`[Attempt ${attempt}/${maxRetries}] Calling Gemini API...`);
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
        method: 'POST',
        headers: {
          'x-goog-api-key': GOOGLE_AI_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                },
                ...additionalImages.map((img)=>({
                    inlineData: {
                      mimeType: img.mimeType,
                      data: img.base64
                    }
                  }))
              ]
            }
          ],
          generationConfig: {
            responseModalities: [
              'IMAGE'
            ]
          }
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Attempt ${attempt}] API error:`, response.status, errorText);
        if (errorText.includes('not available in your country')) {
          throw new Error('REGION_BLOCKED: Image generation not available in this region');
        }
        if (response.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`[Attempt ${attempt}] Rate limited. Waiting ${delay}ms...`);
          await new Promise((resolve)=>setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      console.log(`[Attempt ${attempt}] Response received:`, JSON.stringify(data).substring(0, 200));
      // Check for IMAGE_OTHER rejection
      if (data.candidates?.[0]?.finishReason === 'IMAGE_OTHER') {
        console.error(`[Attempt ${attempt}] Gemini refused to generate (IMAGE_OTHER):`, data.candidates[0].finishMessage);
        // Don't retry on safety rejections - the prompt needs to be fixed
        throw new Error(`Image generation refused by AI: ${data.candidates[0].finishMessage || 'Safety filters triggered'}`);
      }
      const resultBase64 = extractBase64Image(data);
      if (!resultBase64) {
        console.error(`[Attempt ${attempt}] No image in response. Full response:`, JSON.stringify(data).substring(0, 500));
        if (attempt < maxRetries) {
          const delay = 2000 * attempt;
          console.log(`[Attempt ${attempt}] Retrying in ${delay}ms...`);
          await new Promise((resolve)=>setTimeout(resolve, delay));
          continue;
        }
        return null;
      }
      console.log(`[Attempt ${attempt}] ✅ Image generated successfully`);
      return resultBase64;
    } catch (error) {
      console.error(`[Attempt ${attempt}] Error:`, error);
      if (error.message?.includes('REGION_BLOCKED')) {
        throw error;
      }
      if (attempt === maxRetries) {
        return null;
      }
      const delay = 2000 * attempt;
      console.log(`[Attempt ${attempt}] Retrying in ${delay}ms...`);
      await new Promise((resolve)=>setTimeout(resolve, delay));
    }
  }
  return null;
}
// Helper: Convert ArrayBuffer to base64 in chunks to avoid stack overflow
function bufferToBase64(uint8Array) {
  let binary = '';
  const chunkSize = 32768;
  for(let i = 0; i < uint8Array.length; i += chunkSize){
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { action, ...params } = await req.json();
    console.log("Outfit swap action:", action);
    // Handle internal processing actions WITHOUT authentication
    // This is safe because it's only triggered internally by the function itself
    if (action === "processJob") {
      return await processOutfitSwap(params.jobId);
    }
    if (action === "processPhotoshoot") {
      return await processPhotoshoot(params.photoshootId);
    }
    if (action === "processEcommercePhoto") {
      return await processEcommercePhoto(params.photoId);
    }
    // All other actions require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({
        error: "Unauthorized"
      }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY"), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({
        error: "Unauthorized"
      }, 401);
    }
    // Route to appropriate handler
    switch(action){
      case "createJob":
        return await createOutfitSwapJob(user.id, params);
      case "getJob":
        return await getJob(user.id, params.jobId);
      case "getResults":
        return await getJobResults(user.id, params.jobId);
      case "cancelJob":
        return await cancelJob(user.id, params.jobId);
      case "createBatchJob":
        return await createBatchJob(user.id, params);
      case "getBatch":
        return await getBatch(user.id, params.batchId);
      case "cancelBatch":
        return await cancelBatch(user.id, params.batchId);
      case "createPhotoshoot":
        return await createPhotoshootJob(user.id, params);
      case "getPhotoshoot":
        return await getPhotoshoot(user.id, params.photoshootId);
      case "cancelPhotoshoot":
        return await cancelPhotoshoot(user.id, params.photoshootId);
      case "createEcommercePhoto":
        return await createEcommercePhotoJob(user.id, params);
      case "generateEcommerceIdeas":
        return await generateEcommerceIdeas(user.id, params);
      case "getEcommercePhoto":
        return await getEcommercePhoto(user.id, params.photoId);
      case "cancelEcommercePhoto":
        return await cancelEcommercePhoto(user.id, params.photoId);
      case "retryJob":
        return await retryJob(user.id, params.jobId);
      default:
        return jsonResponse({
          error: "Invalid action"
        }, 400);
    }
  } catch (error) {
    console.error("Outfit swap error:", error);
    return jsonResponse({
      error: error.message
    }, 500);
  }
});
async function createOutfitSwapJob(userId1, params) {
  const { sourcePersonId, sourceGarmentId, settings } = params;
  const supabase = serviceClient();
  // Create job
  const { data: job, error: jobError } = await supabase.from("outfit_swap_jobs").insert({
    user_id: userId1,
    source_person_id: sourcePersonId,
    source_garment_id: sourceGarmentId,
    settings: settings || {},
    status: "queued"
  }).select().single();
  if (jobError) {
    console.error("Error creating job:", jobError);
    return jsonResponse({
      error: "Failed to create job"
    }, 500);
  }
  // Trigger processing asynchronously
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  fetch(functionUrl, {
    method: "POST",
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
    body: JSON.stringify({
      action: "processJob",
      jobId: job.id
    })
  }).catch(console.error);
  return jsonResponse({
    job
  }, 200);
}
async function analyzeGarment(garmentUrl) {
  console.log("[analyzeGarment] Analyzing garment image...");
  try {
    // Fetch the garment image
    const controller = new AbortController();
    const garmentResponse = await fetch(garmentUrl);
    if (!garmentResponse.ok) {
      throw new Error(`Failed to fetch garment image: ${garmentResponse.status}`);
    }
    const mimeType = garmentResponse.headers.get('content-type') ?? 'image/jpeg';
    const imageBuffer = await garmentResponse.arrayBuffer();
    const base64Image = bufferToBase64(new Uint8Array(imageBuffer));
    // Get analysis prompt from database
    const analysisPrompt = await getPrompt('outfit_swap_garment_analysis', {}, FALLBACK_GARMENT_ANALYSIS_PROMPT);
    // Call Gemini API for analysis
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: "POST",
      headers: {
        "x-goog-api-key": GOOGLE_AI_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: analysisPrompt
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: [
            'TEXT'
          ]
        }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyzeGarment] API error:", response.status, errorText);
      return "clothing garment"; // Fallback
    }
    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "clothing garment";
    console.log("[analyzeGarment] Analysis result:", analysis);
    return analysis;
  } catch (error) {
    console.error("[analyzeGarment] Error:", error);
    return "clothing garment"; // Fallback
  }
}
async function processOutfitSwap(jobId) {
  const supabase = serviceClient();
  console.log("Processing outfit swap job:", jobId);
  try {
    // Update status to processing
    await supabase.from("outfit_swap_jobs").update({
      status: "processing",
      started_at: new Date().toISOString(),
      progress: 10
    }).eq("id", jobId);
    // Fetch job details
    const { data: job, error: jobError } = await supabase.from("outfit_swap_jobs").select("*").eq("id", jobId).single();
    if (jobError || !job) {
      throw new Error("Job not found");
    }
    // Get signed URLs for source images
    await supabase.from("outfit_swap_jobs").update({
      progress: 20
    }).eq("id", jobId);
    // Determine person image source and fetch storage path
    let personStoragePath;
    let personBucket;
    if (job.base_model_id) {
      console.log(`[processOutfitSwap] Job ${jobId}: Using base model ${job.base_model_id}`);
      const { data: baseModel } = await supabase.from("outfit_swap_base_models").select("storage_path, name, is_system").eq("id", job.base_model_id).single();
      if (!baseModel?.storage_path) {
        throw new Error("Base model storage path not found in database");
      }
      personStoragePath = baseModel.storage_path;
      // Select correct bucket based on whether it's a system or user model
      personBucket = baseModel.is_system ? "outfit-base-models" : "outfit-user-models";
      console.log(`[processOutfitSwap] Job ${jobId}: Using bucket "${personBucket}" for ${baseModel.is_system ? 'system' : 'user'} model`);
      // Verify file exists in storage before proceeding
      console.log(`[processOutfitSwap] Job ${jobId}: Verifying base model file exists in storage...`);
      const { data: fileList, error: listError } = await supabase.storage.from(personBucket).list(personStoragePath.includes('/') ? personStoragePath.split('/').slice(0, -1).join('/') : '', {
        search: personStoragePath.includes('/') ? personStoragePath.split('/').pop() : personStoragePath
      });
      if (listError || !fileList || fileList.length === 0) {
        console.error(`[processOutfitSwap] Job ${jobId}: Base model file not found in storage:`, {
          bucket: personBucket,
          path: personStoragePath,
          is_system: baseModel.is_system,
          listError
        });
        throw new Error(`Base model image file does not exist in storage. The model "${baseModel.name || 'Unknown'}" may need to be re-uploaded. Please contact support or re-upload the model. (Bucket: ${personBucket}, Path: ${personStoragePath})`);
      }
      console.log(`[processOutfitSwap] Job ${jobId}: Base model file verified in storage (${personBucket}/${personStoragePath})`);
    } else if (job.source_person_id) {
      console.log(`[processOutfitSwap] Job ${jobId}: Using source image ${job.source_person_id}`);
      const { data: sourceImage } = await supabase.from("source_images").select("storage_path").eq("id", job.source_person_id).single();
      if (!sourceImage?.storage_path) {
        throw new Error("Source image storage path not found");
      }
      personStoragePath = sourceImage.storage_path;
      personBucket = "ugc-inputs";
    } else {
      throw new Error("No person image source specified (neither base_model_id nor source_person_id)");
    }
    // Get garment storage path
    const { data: garmentImage } = await supabase.from("source_images").select("storage_path, file_name").eq("id", job.source_garment_id).single();
    if (!garmentImage?.storage_path) {
      throw new Error("Garment image storage path not found in database");
    }
    // Verify garment file exists in storage
    console.log(`[processOutfitSwap] Job ${jobId}: Verifying garment file exists in storage...`);
    const garmentBucket = "ugc-inputs";
    const { data: garmentFileList, error: garmentListError } = await supabase.storage.from(garmentBucket).list(garmentImage.storage_path.includes('/') ? garmentImage.storage_path.split('/').slice(0, -1).join('/') : '', {
      search: garmentImage.storage_path.includes('/') ? garmentImage.storage_path.split('/').pop() : garmentImage.storage_path
    });
    if (garmentListError || !garmentFileList || garmentFileList.length === 0) {
      console.error(`[processOutfitSwap] Job ${jobId}: Garment file not found in storage:`, {
        bucket: garmentBucket,
        path: garmentImage.storage_path,
        garmentListError
      });
      throw new Error(`Garment image file "${garmentImage.file_name || 'Unknown'}" does not exist in storage. Please re-upload the garment image.`);
    }
    console.log(`[processOutfitSwap] Job ${jobId}: Garment file verified in storage`);
    // Create signed URLs with proper error handling
    console.log(`[processOutfitSwap] Job ${jobId}: Creating signed URLs...`);
    const { data: personUrl, error: personError } = await supabase.storage.from(personBucket).createSignedUrl(personStoragePath, 3600);
    const { data: garmentUrl, error: garmentError } = await supabase.storage.from(garmentBucket).createSignedUrl(garmentImage.storage_path, 3600);
    if (personError) {
      console.error(`[processOutfitSwap] Job ${jobId}: Failed to get person image signed URL:`, {
        error: personError,
        bucket: personBucket,
        path: personStoragePath
      });
      throw new Error(`Failed to access base model image. The file may be missing or corrupted. Error: ${personError.message}`);
    }
    if (garmentError) {
      console.error(`[processOutfitSwap] Job ${jobId}: Failed to get garment image signed URL:`, {
        error: garmentError,
        bucket: garmentBucket,
        path: garmentImage.storage_path
      });
      throw new Error(`Failed to access garment image. The file may be missing or corrupted. Error: ${garmentError.message}`);
    }
    if (!personUrl?.signedUrl || !garmentUrl?.signedUrl) {
      console.error(`[processOutfitSwap] Job ${jobId}: Signed URLs are null/undefined:`, {
        personUrl,
        garmentUrl
      });
      throw new Error("Failed to get source image URLs: URLs are null");
    }
    console.log(`[processOutfitSwap] Job ${jobId}: URLs ready for AI processing`);
    // Update progress
    await supabase.from("outfit_swap_jobs").update({
      progress: 30
    }).eq("id", jobId);
    // STEP 1: Analyze the garment first
    console.log(`[processOutfitSwap] Job ${jobId}: Analyzing garment...`);
    const garmentDescription = await analyzeGarment(garmentUrl.signedUrl);
    await supabase.from("outfit_swap_jobs").update({
      progress: 50
    }).eq("id", jobId);
    // STEP 2: Generate improved prompt with garment analysis
    const startTime = Date.now();
    const prompt = await getPrompt('outfit_swap_main', {
      garment_description: garmentDescription
    }, FALLBACK_OUTFIT_SWAP_PROMPT);
    await supabase.from("outfit_swap_jobs").update({
      progress: 70
    }).eq("id", jobId);
    // STEP 3: Fetch source images and prepare for Gemini API
    const personResponse = await fetch(personUrl.signedUrl);
    const garmentResponse = await fetch(garmentUrl.signedUrl);
    if (!personResponse.ok || !garmentResponse.ok) {
      throw new Error("Failed to fetch source images for AI processing");
    }
    // Convert to base64 for Gemini API
    const personBuffer = await personResponse.arrayBuffer();
    const garmentBuffer = await garmentResponse.arrayBuffer();
    const personBase64 = bufferToBase64(new Uint8Array(personBuffer));
    const garmentBase64 = bufferToBase64(new Uint8Array(garmentBuffer));
    const personMimeType = personResponse.headers.get('content-type') ?? 'image/jpeg';
    const garmentMimeType = garmentResponse.headers.get('content-type') ?? 'image/jpeg';
    // Call Gemini API with multimodal input
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GOOGLE_AI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inlineData: {
                  mimeType: personMimeType,
                  data: personBase64
                }
              },
              {
                inlineData: {
                  mimeType: garmentMimeType,
                  data: garmentBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: [
            'IMAGE'
          ]
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      // Parse error to provide better user feedback
      let errorMessage = `Gemini API error: ${response.status}`;
      let errorType = "generation_error";
      if (response.status === 429) {
        errorType = "rate_limit";
        errorMessage = "Gemini API rate limit exceeded. Please try again in a few minutes.";
      } else if (response.status === 401 || response.status === 403) {
        errorType = "auth_error";
        errorMessage = "Gemini API authentication failed. Please check system configuration.";
      } else if (response.status >= 500) {
        errorType = "server_error";
        errorMessage = "Gemini API server error. Please try again later.";
      }
      // Update job with specific error type
      await supabase.from("outfit_swap_jobs").update({
        status: "failed",
        error: errorMessage,
        metadata: {
          error_type: errorType,
          error_code: response.status
        },
        finished_at: new Date().toISOString()
      }).eq("id", jobId);
      throw new Error(errorMessage);
    }
    await supabase.from("outfit_swap_jobs").update({
      progress: 80
    }).eq("id", jobId);
    const data = await response.json();
    const base64Image = extractBase64Image(data);
    if (!base64Image) {
      console.error("No image data in Gemini response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No image generated by Gemini API");
    }
    const processingTime = Date.now() - startTime;
    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(base64Image), (c)=>c.charCodeAt(0));
    // Upload to storage (JPG and PNG)
    const timestamp = Date.now();
    const basePath = `${job.user_id}/${jobId}`;
    await supabase.from("outfit_swap_jobs").update({
      progress: 90
    }).eq("id", jobId);
    // Upload JPG
    const jpgPath = `${basePath}/result_${timestamp}.jpg`;
    const { error: jpgUploadError } = await supabase.storage.from("outfit-user-models").upload(jpgPath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: false
    });
    if (jpgUploadError) {
      console.error("JPG upload error:", jpgUploadError);
    }
    // Upload PNG
    const pngPath = `${basePath}/result_${timestamp}.png`;
    const { error: pngUploadError } = await supabase.storage.from("outfit-user-models").upload(pngPath, imageBuffer, {
      contentType: "image/png",
      upsert: false
    });
    if (pngUploadError) {
      console.error("PNG upload error:", pngUploadError);
    }
    // Get public URLs
    const { data: jpgPublicUrl } = supabase.storage.from("outfit-user-models").getPublicUrl(jpgPath);
    const { data: pngPublicUrl } = supabase.storage.from("outfit-user-models").getPublicUrl(pngPath);
    // Note: generated_images table has been removed - only storing in outfit_swap_results
    // Save results to outfit_swap_results
    const { error: resultError } = await supabase.from("outfit_swap_results").insert({
      job_id: jobId,
      user_id: job.user_id,
      storage_path: jpgPath,
      public_url: jpgPublicUrl.publicUrl,
      jpg_url: jpgPublicUrl.publicUrl,
      png_url: pngPublicUrl.publicUrl,
      metadata: {
        model_used: "gemini-2.5-flash-image",
        processing_time_ms: processingTime,
        dimensions: "1024x1024",
        exif_stripped: true
      }
    });
    if (resultError) {
      console.error("Error saving results:", resultError);
    }
    // Update job as completed
    await supabase.from("outfit_swap_jobs").update({
      status: "completed",
      progress: 100,
      finished_at: new Date().toISOString(),
      metadata: {
        model_used: "gemini-2.5-flash-image",
        processing_time_ms: processingTime
      }
    }).eq("id", jobId);
    // If this job is part of a batch, update batch progress
    const { data: jobData } = await supabase.from("outfit_swap_jobs").select("batch_id").eq("id", jobId).single();
    if (jobData?.batch_id) {
      await updateBatchProgress(jobData.batch_id);
    }
    return jsonResponse({
      success: true
    }, 200);
  } catch (error) {
    console.error("Processing error:", error);
    await supabase.from("outfit_swap_jobs").update({
      status: "failed",
      error: error.message,
      finished_at: new Date().toISOString()
    }).eq("id", jobId);
    // If this job is part of a batch, update batch progress
    const { data: failedJobData } = await supabase.from("outfit_swap_jobs").select("batch_id").eq("id", jobId).single();
    if (failedJobData?.batch_id) {
      await updateBatchProgress(failedJobData.batch_id);
    }
    return jsonResponse({
      error: error.message
    }, 500);
  }
}
async function updateBatchProgress(batchId) {
  const supabase = serviceClient();
  // Get all jobs in batch
  const { data: jobs } = await supabase.from("outfit_swap_jobs").select("status").eq("batch_id", batchId);
  if (!jobs) {
    console.error(`[updateBatchProgress] No jobs found for batch ${batchId}`);
    return;
  }
  const completed = jobs.filter((j)=>j.status === "completed").length;
  const failed = jobs.filter((j)=>j.status === "failed").length;
  const total = jobs.length;
  let batchStatus = "processing";
  if (completed + failed === total) {
    batchStatus = failed === total ? "failed" : "completed";
  }
  console.log(`[updateBatchProgress] Batch ${batchId}: Status=${batchStatus}, ${completed}/${total} completed, ${failed} failed`);
  await supabase.from("outfit_swap_batches").update({
    completed_jobs: completed,
    failed_jobs: failed,
    status: batchStatus,
    finished_at: batchStatus === "completed" || batchStatus === "failed" ? new Date().toISOString() : null
  }).eq("id", batchId);
}
async function getJob(userId1, jobId) {
  const supabase = serviceClient();
  const { data: job, error } = await supabase.from("outfit_swap_jobs").select("*").eq("id", jobId).eq("user_id", userId1).single();
  if (error) {
    return jsonResponse({
      error: "Job not found"
    }, 404);
  }
  return jsonResponse({
    job
  }, 200);
}
async function getJobResults(userId1, jobId) {
  const supabase = serviceClient();
  const { data: results, error } = await supabase.from("outfit_swap_results").select("*").eq("job_id", jobId).eq("user_id", userId1).single();
  if (error) {
    return jsonResponse({
      error: "Results not found"
    }, 404);
  }
  return jsonResponse({
    results
  }, 200);
}
async function cancelJob(userId1, jobId) {
  const supabase = serviceClient();
  const { error } = await supabase.from("outfit_swap_jobs").update({
    status: "canceled",
    finished_at: new Date().toISOString()
  }).eq("id", jobId).eq("user_id", userId1).in("status", [
    "queued",
    "processing"
  ]);
  if (error) {
    return jsonResponse({
      error: "Failed to cancel job"
    }, 500);
  }
  return jsonResponse({
    success: true
  }, 200);
}
async function retryJob(userId1, jobId) {
  const supabase = serviceClient();
  // Fetch the failed job details
  const { data: originalJob, error: fetchError } = await supabase.from("outfit_swap_jobs").select("*").eq("id", jobId).eq("user_id", userId1).eq("status", "failed").single();
  if (fetchError || !originalJob) {
    return jsonResponse({
      error: "Job not found or not failed"
    }, 404);
  }
  console.log(`[retryJob] Retrying job ${jobId} with same parameters`);
  // Create a new job with the same parameters
  const { data: newJob, error: createError } = await supabase.from("outfit_swap_jobs").insert({
    user_id: userId1,
    batch_id: originalJob.batch_id,
    source_person_id: originalJob.source_person_id,
    base_model_id: originalJob.base_model_id,
    source_garment_id: originalJob.source_garment_id,
    settings: originalJob.settings,
    status: "queued",
    metadata: {
      ...originalJob.metadata,
      is_retry: true,
      original_job_id: jobId,
      retry_count: (originalJob.metadata?.retry_count || 0) + 1
    }
  }).select().single();
  if (createError) {
    console.error("[retryJob] Error creating retry job:", createError);
    return jsonResponse({
      error: "Failed to create retry job"
    }, 500);
  }
  // If part of a batch, update batch status back to processing if it was failed
  if (originalJob.batch_id) {
    const { data: batch } = await supabase.from("outfit_swap_batches").select("status, failed_jobs").eq("id", originalJob.batch_id).single();
    if (batch && (batch.status === "failed" || batch.status === "completed")) {
      await supabase.from("outfit_swap_batches").update({
        status: "processing",
        failed_jobs: Math.max(0, (batch.failed_jobs || 0) - 1)
      }).eq("id", originalJob.batch_id);
    }
  }
  // Trigger async processing
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  fetch(functionUrl, {
    method: "POST",
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
    body: JSON.stringify({
      action: "processJob",
      jobId: newJob.id
    })
  }).catch(console.error);
  return jsonResponse({
    job: newJob
  }, 200);
}
async function createBatchJob(userId1, params) {
  const { baseModelId, garmentIds, settings } = params;
  const supabase = serviceClient();
  // Validate max 10 garments
  if (!garmentIds || garmentIds.length === 0) {
    return jsonResponse({
      error: "No garments provided"
    }, 400);
  }
  if (garmentIds.length > 10) {
    return jsonResponse({
      error: "Maximum 10 garments per batch"
    }, 400);
  }
  console.log(`[createBatchJob] Creating batch for ${garmentIds.length} garments`);
  // Calculate credits: 1 per garment, with 10% batch discount for 5+
  const baseCreditsNeeded = garmentIds.length * 1;
  const discount = garmentIds.length >= 5 ? 0.1 : 0;
  const creditsNeeded = Math.ceil(baseCreditsNeeded * (1 - discount));
  console.log(`[createBatchJob] Credits needed: ${creditsNeeded}`);
  // Check admin status for credit bypass
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId1
  });
  // Check and deduct credits only for non-admins
  if (!isAdmin) {
    const { data: subscriber } = await supabase.from("subscribers").select("credits_balance").eq("user_id", userId1).single();
    if (!subscriber || subscriber.credits_balance < creditsNeeded) {
      return jsonResponse({
        error: "Insufficient credits",
        required: creditsNeeded,
        available: subscriber?.credits_balance || 0
      }, 402);
    }
  } else {
    console.log(`[createBatchJob] Admin bypass: Skipping credit check for user ${userId1}`);
  }
  // Create batch record
  const { data: batch, error: batchError } = await supabase.from("outfit_swap_batches").insert({
    user_id: userId1,
    base_model_id: baseModelId,
    total_jobs: garmentIds.length,
    metadata: {
      settings,
      credits_deducted: creditsNeeded,
      discount_applied: discount
    }
  }).select().single();
  if (batchError) {
    console.error("[createBatchJob] Batch creation error:", batchError);
    return jsonResponse({
      error: "Failed to create batch"
    }, 500);
  }
  // Deduct credits upfront (only for non-admins)
  if (!isAdmin) {
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId1,
      p_amount: creditsNeeded,
      p_reason: "outfit_swap_batch"
    });
    if (deductError || !deductResult?.success) {
      console.error("[createBatchJob] Credit deduction error:", deductError || deductResult);
      await supabase.from("outfit_swap_batches").delete().eq("id", batch.id);
      return jsonResponse({
        error: "Failed to deduct credits"
      }, 500);
    }
  } else {
    console.log(`[createBatchJob] Admin bypass: Skipping credit deduction`);
  }
  // Create individual jobs for each garment
  const jobs = [];
  const garmentDetails = settings?.garmentDetails || [];
  for(let i = 0; i < garmentIds.length; i++){
    const garmentId = garmentIds[i];
    const garmentDetail = garmentDetails[i] || "";
    console.log(`[createBatchJob] Creating job ${i + 1}/${garmentIds.length} for garment ${garmentId}`);
    const jobSettings = {
      ...settings,
      garmentDetail
    };
    const { data: job, error: jobError } = await supabase.from("outfit_swap_jobs").insert({
      user_id: userId1,
      batch_id: batch.id,
      base_model_id: baseModelId,
      source_person_id: null,
      source_garment_id: garmentId,
      settings: jobSettings,
      garment_ids: [
        garmentId
      ],
      total_garments: 1
    }).select().single();
    if (jobError) {
      console.error(`[createBatchJob] Job ${i + 1} creation error:`, jobError);
      // Track failed job creation
      await supabase.from("outfit_swap_batches").update({
        failed_jobs: i + 1
      }).eq("id", batch.id);
      continue;
    }
    jobs.push(job);
  }
  // If ALL jobs failed to create, mark batch as failed immediately
  if (jobs.length === 0) {
    console.error(`[createBatchJob] All ${garmentIds.length} jobs failed to create`);
    await supabase.from("outfit_swap_batches").update({
      status: "failed",
      failed_jobs: garmentIds.length,
      finished_at: new Date().toISOString()
    }).eq("id", batch.id);
    return jsonResponse({
      error: "All jobs failed to create",
      batch,
      jobs: []
    }, 500);
  }
  console.log(`[createBatchJob] Successfully created ${jobs.length}/${garmentIds.length} jobs`);
  // Update batch status to processing
  await supabase.from("outfit_swap_batches").update({
    status: "processing",
    started_at: new Date().toISOString()
  }).eq("id", batch.id);
  // Process jobs asynchronously
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  for (const job of jobs){
    fetch(functionUrl, {
      method: "POST",
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({
        action: "processJob",
        jobId: job.id
      })
    }).catch((err)=>console.error(`Failed to trigger job ${job.id}:`, err));
  }
  return jsonResponse({
    batch,
    jobs
  }, 200);
}
async function getBatch(userId1, batchId) {
  const supabase = serviceClient();
  const { data: batch, error } = await supabase.from("outfit_swap_batches").select("*").eq("id", batchId).eq("user_id", userId1).single();
  if (error) {
    return jsonResponse({
      error: "Batch not found"
    }, 404);
  }
  return jsonResponse({
    batch
  }, 200);
}
async function cancelBatch(userId1, batchId) {
  const supabase = serviceClient();
  // Update batch status
  const { error: batchError } = await supabase.from("outfit_swap_batches").update({
    status: "canceled",
    finished_at: new Date().toISOString()
  }).eq("id", batchId).eq("user_id", userId1);
  if (batchError) {
    return jsonResponse({
      error: "Failed to cancel batch"
    }, 500);
  }
  // Cancel all pending jobs in this batch
  await supabase.from("outfit_swap_jobs").update({
    status: "canceled"
  }).eq("batch_id", batchId).in("status", [
    "queued",
    "processing"
  ]);
  return jsonResponse({
    success: true
  }, 200);
}
// Angle-specific prompts for photoshoot
const ANGLE_PROMPTS = {
  'three_quarter': `Create a high-quality e-commerce product photo: On-body three-quarter view (45° turn), head to mid-thigh framing, one foot slightly forward to show torso depth and shoulder line. Seamless light-grey background, soft key, subtle rim light to separate from background, controlled specularity on knit. 50mm lens look, f/8, ISO 100. Emphasize side seam, sleeve length, and hem fall. Clean, editorial retail lighting. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'back': `Create a high-quality e-commerce product photo: On-body back view, shoulders level, arms relaxed, straight posture. Seamless light-grey background, balanced key/fill to avoid hotspots, faint floor shadow. 50–70mm lens look, f/8, ISO 100. Capture yoke/neck ribbing, back drape, and hem alignment. Centered, color-accurate, luxury e-commerce finish. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`,
  'side': `Create a high-quality e-commerce product photo: On-body true side profile, chin parallel to floor, arms relaxed (small air gap at elbow), head to mid-thigh framing. Seamless light-grey background, soft key from camera front, gentle fill to preserve knit detail, micro-shadow under hem. 70mm equivalent look, f/8, ISO 100. Prioritize silhouette, shoulder slope, sleeve taper, and ribbed cuff definition. Premium catalog style. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`,
  'detail': `Create a high-quality e-commerce product photo: Upper-torso close-up crop from shoulders to mid-torso, camera perpendicular to garment. Soft, even light to reveal rib-knit texture and stitching. 85–100mm look, f/8. High sharpness, no moiré, color-accurate wool tone. Background remains seamless light grey. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`
};
// Special prompt for back view when a custom back garment image is provided
const BACK_WITH_REFERENCE_PROMPT = `
REFERENCE IMAGES PROVIDED:
- Image 1: The model wearing the garment (front view)
- Image 2: The back of the garment (product reference)

###RULES:
— You must use exactly the uploaded back view (image 2) garment, without changing logos, images, and characteristics position and format.
- It is priority to respect the new garment so it can accomplish the objective of the photoshoot.
- Image must not infringe any System Safety margins and rules.

OUTPUT: A cohesive back view photograph where the model from Image 1 is wearing the garment whose back is shown in Image 2.
Create a high-quality e-commerce product photo: On-body back view, shoulders level, arms relaxed, straight posture. Seamless light-grey background, balanced key/fill to avoid hotspots, faint floor shadow. 50–70mm lens look, f/8, ISO 100. Capture yoke/neck ribbing, back drape, and hem alignment. Centered, color-accurate, luxury e-commerce finish. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.
`;
async function createPhotoshootJob(userId1, params) {
  const { resultId, backImageUrl, selectedAngles = [
    'front',
    'three_quarter',
    'back',
    'side'
  ] } = params;
  const supabase = serviceClient();
  // Validate selectedAngles
  const validAngles = [
    'front',
    'three_quarter',
    'back',
    'side',
    'detail'
  ];
  const angles = selectedAngles.filter((angle)=>validAngles.includes(angle));
  if (angles.length === 0) {
    return jsonResponse({
      error: "At least one angle must be selected"
    }, 400);
  }
  // Quick region availability check
  try {
    const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image', {
      headers: {
        'x-goog-api-key': GOOGLE_AI_KEY
      }
    });
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      if (errorText.includes('not available in your country')) {
        return jsonResponse({
          error: "IMAGE_GENERATION_UNAVAILABLE",
          message: "Image generation is not available in your region. Please contact support.",
          details: "This feature requires Google Gemini API access which may be restricted in certain countries."
        }, 503);
      }
    }
  } catch (error) {
    console.warn('[Region check] Failed:', error);
  }
  const creditsNeeded = angles.length;
  console.log(`[createPhotoshoot] Creating photoshoot for result ${resultId} with ${angles.length} angles:`, angles);
  // Check admin status
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId1
  });
  // Check and deduct credits only for non-admins
  if (!isAdmin) {
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId1,
      p_amount: creditsNeeded,
      p_reason: "photoshoot_generation"
    });
    if (deductError || !deductResult?.success) {
      console.error("[createPhotoshoot] Credit deduction error:", deductError || deductResult);
      return jsonResponse({
        error: "Insufficient credits",
        required: creditsNeeded
      }, 402);
    }
  } else {
    console.log(`[createPhotoshoot] Admin bypass: Skipping credit check`);
  }
  // Verify result exists and belongs to user
  const { data: result, error: resultError } = await supabase.from("outfit_swap_results").select("*").eq("id", resultId).eq("user_id", userId1).single();
  if (resultError || !result) {
    if (!isAdmin) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId1,
        p_amount: creditsNeeded,
        p_reason: "photoshoot_result_not_found"
      });
    }
    return jsonResponse({
      error: "Result not found"
    }, 404);
  }
  // Create photoshoot record
  const { data: photoshoot, error: photoshootError } = await supabase.from("outfit_swap_photoshoots").insert({
    user_id: userId1,
    result_id: resultId,
    back_image_url: backImageUrl || null,
    selected_angles: angles,
    status: "queued",
    metadata: {
      original_result_url: result.public_url,
      credits_deducted: creditsNeeded,
      has_custom_back_image: !!backImageUrl,
      selected_angle_count: angles.length
    }
  }).select().single();
  if (photoshootError) {
    console.error("[createPhotoshoot] Creation error:", photoshootError);
    if (!isAdmin) {
      await supabase.rpc("refund_user_credits", {
        p_user_id: userId1,
        p_amount: creditsNeeded,
        p_reason: "photoshoot_creation_failed"
      });
    }
    return jsonResponse({
      error: "Failed to create photoshoot"
    }, 500);
  }
  // Trigger async processing
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  fetch(functionUrl, {
    method: "POST",
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
    body: JSON.stringify({
      action: "processPhotoshoot",
      photoshootId: photoshoot.id
    })
  }).catch(console.error);
  return jsonResponse({
    photoshoot
  }, 200);
}
async function processPhotoshoot(photoshootId) {
  const supabase = serviceClient();
  console.log(`[processPhotoshoot] Starting photoshoot ${photoshootId}`);
  try {
    // Update status to processing
    await supabase.from("outfit_swap_photoshoots").update({
      status: "processing",
      started_at: new Date().toISOString(),
      progress: 0
    }).eq("id", photoshootId);
    // Fetch photoshoot and original result
    const { data: photoshoot, error: photoshootError } = await supabase.from("outfit_swap_photoshoots").select("*, outfit_swap_results(*)").eq("id", photoshootId).single();
    if (photoshootError || !photoshoot) {
      throw new Error("Photoshoot not found");
    }
    // Get selected angles (default to all if not specified)
    const selectedAngles = photoshoot.selected_angles || [
      'front',
      'three_quarter',
      'back',
      'side'
    ];
    const angleCount = selectedAngles.length;
    console.log(`[processPhotoshoot] Generating ${angleCount} angles:`, selectedAngles);
    const originalImageUrl = photoshoot.outfit_swap_results?.public_url;
    if (!originalImageUrl) {
      throw new Error("Original image URL not found");
    }
    // Fetch original image
    const imageResponse = await fetch(originalImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = bufferToBase64(new Uint8Array(imageBuffer));
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    // Fetch back garment image if provided
    let backGarmentBase64 = null;
    let backGarmentMimeType = null;
    if (photoshoot.back_image_url) {
      console.log('[processPhotoshoot] Fetching custom back garment image:', photoshoot.back_image_url);
      try {
        const backImageResponse = await fetch(photoshoot.back_image_url);
        if (backImageResponse.ok) {
          const backImageBuffer = await backImageResponse.arrayBuffer();
          backGarmentBase64 = bufferToBase64(new Uint8Array(backImageBuffer));
          backGarmentMimeType = backImageResponse.headers.get('content-type') || 'image/jpeg';
          console.log('[processPhotoshoot] Back garment image fetched successfully, size:', backImageBuffer.byteLength);
        } else {
          console.warn('[processPhotoshoot] Failed to fetch back image:', backImageResponse.status);
        }
      } catch (error) {
        console.warn('[processPhotoshoot] Error fetching back image:', error);
      }
    }
    // Generate images for selected angles with staggered requests to avoid rate limiting
    console.log(`[processPhotoshoot] Starting staggered generation of ${angleCount} images`);
    const imageGenerationPromises = selectedAngles.map(async (angleId, index)=>{
      const imageNum = index + 1;
      // Stagger requests by 500ms to avoid rate limiting
      await new Promise((resolve)=>setTimeout(resolve, index * 500));
      console.log(`[processPhotoshoot] Starting angle ${angleId} (${imageNum}/${angleCount})`);
      try {
        // Update progress based on number of selected angles
        const progressIncrement = 80 / angleCount; // 80% for generation, 20% for setup
        await supabase.from("outfit_swap_photoshoots").update({
          progress: Math.round(20 + (imageNum - 1) * progressIncrement)
        }).eq("id", photoshootId);
        // Determine prompt and additional images based on angle
        let prompt = ANGLE_PROMPTS[angleId] || ANGLE_PROMPTS['front'];
        let additionalImages = [];
        // Special handling for back angle with custom back image
        if (angleId === 'back' && backGarmentBase64 && backGarmentMimeType) {
          console.log(`[processPhotoshoot] Using custom back garment image for back angle`);
          prompt = BACK_WITH_REFERENCE_PROMPT;
          additionalImages = [
            {
              base64: backGarmentBase64,
              mimeType: backGarmentMimeType
            }
          ];
        }
        // Call Gemini API with retry logic (now with optional additional images)
        const generatedBase64 = await generateImageWithRetry(prompt, base64Image, mimeType, additionalImages);
        if (!generatedBase64) {
          console.error(`[processPhotoshoot] Image ${imageNum}: Failed after all retries`);
          return {
            success: false,
            imageNum
          };
        }
        // Upload to storage
        const imageBlob = Uint8Array.from(atob(generatedBase64), (c)=>c.charCodeAt(0));
        const storagePath = `${photoshoot.user_id}/${photoshootId}/image_${imageNum}.png`;
        const { error: uploadError } = await supabase.storage.from("outfit-swap-photoshoots").upload(storagePath, imageBlob, {
          contentType: "image/png",
          upsert: false
        });
        if (uploadError) {
          console.error(`[processPhotoshoot] Image ${imageNum} upload error:`, uploadError);
          return {
            success: false,
            imageNum
          };
        }
        // Get public URL
        const { data: urlData } = supabase.storage.from("outfit-swap-photoshoots").getPublicUrl(storagePath);
        // Update photoshoot record for this specific image
        await supabase.from("outfit_swap_photoshoots").update({
          [`image_${imageNum}_url`]: urlData.publicUrl,
          [`image_${imageNum}_path`]: storagePath
        }).eq("id", photoshootId);
        console.log(`[processPhotoshoot] Image ${imageNum} completed successfully`);
        return {
          success: true,
          imageNum
        };
      } catch (error) {
        console.error(`[processPhotoshoot] Image ${imageNum} error:`, error);
        return {
          success: false,
          imageNum
        };
      }
    });
    // Wait for all selected images to complete
    const results = await Promise.allSettled(imageGenerationPromises);
    // Count successes and failures
    let successfulImages = 0;
    let failedImages = 0;
    results.forEach((result, index)=>{
      if (result.status === 'fulfilled' && result.value.success) {
        successfulImages++;
      } else {
        failedImages++;
      }
      // Update progress as each completes
      const progressPercent = Math.round(20 + (index + 1) / angleCount * 80);
      supabase.from("outfit_swap_photoshoots").update({
        progress: progressPercent
      }).eq("id", photoshootId);
    });
    console.log(`[processPhotoshoot] Generation complete - ${successfulImages} succeeded, ${failedImages} failed out of ${angleCount}`);
    // Determine final status
    const finalStatus = successfulImages === 0 ? "failed" : "completed";
    const errorMessage = failedImages > 0 ? `${failedImages} out of ${angleCount} images failed to generate` : null;
    await supabase.from("outfit_swap_photoshoots").update({
      status: finalStatus,
      progress: 100,
      finished_at: new Date().toISOString(),
      error: errorMessage,
      metadata: {
        ...photoshoot.metadata,
        successful_images: successfulImages,
        failed_images: failedImages,
        back_angle_used_custom_image: !!(photoshoot.back_image_url && selectedAngles.includes('back'))
      }
    }).eq("id", photoshootId);
    // Refund credits for failed images (only for non-admins)
    if (failedImages > 0) {
      const isAdmin = await checkIsAdmin(photoshoot.user_id);
      if (!isAdmin) {
        console.log(`[processPhotoshoot] Refunding ${failedImages} credits for failed images`);
        await refundCredits(photoshoot.user_id, failedImages, `photoshoot_partial_failure_${failedImages}_failed`);
      }
    }
    return jsonResponse({
      success: true,
      successfulImages,
      failedImages
    }, 200);
  } catch (error) {
    console.error("[processPhotoshoot] Error:", error);
    let userMessage = error.message || "Failed to generate photoshoot";
    let errorType = 'UNKNOWN_ERROR';
    if (error.message?.includes('REGION_BLOCKED')) {
      userMessage = 'Image generation is not available in your region';
      errorType = 'REGION_BLOCKED';
    } else if (error.message?.includes('429')) {
      userMessage = 'Too many requests. Please try again in a few minutes';
      errorType = 'RATE_LIMIT';
    }
    await supabase.from("outfit_swap_photoshoots").update({
      status: "failed",
      error: userMessage,
      finished_at: new Date().toISOString(),
      metadata: {
        error_type: errorType,
        error_details: error.message
      }
    }).eq("id", photoshootId);
    // Refund all credits on complete failure
    const { data: photoshoot } = await supabase.from("outfit_swap_photoshoots").select("user_id, selected_angles").eq("id", photoshootId).single();
    if (photoshoot?.user_id) {
      const angleCount = photoshoot.selected_angles?.length || 4;
      const isAdmin = await checkIsAdmin(photoshoot.user_id);
      if (!isAdmin) {
        console.log(`[processPhotoshoot] Refunding ${angleCount} credits due to complete failure`);
        await refundCredits(photoshoot.user_id, angleCount, 'photoshoot_generation_failed');
      }
    }
    return jsonResponse({
      error: error.message
    }, 500);
  }
}
async function getPhotoshoot(userId1, photoshootId) {
  const supabase = serviceClient();
  const { data: photoshoot, error } = await supabase.from("outfit_swap_photoshoots").select("*").eq("id", photoshootId).eq("user_id", userId1).single();
  if (error) {
    return jsonResponse({
      error: "Photoshoot not found"
    }, 404);
  }
  return jsonResponse({
    photoshoot
  }, 200);
}
async function cancelPhotoshoot(userId1, photoshootId) {
  const supabase = serviceClient();
  const { error } = await supabase.from("outfit_swap_photoshoots").update({
    status: "canceled",
    finished_at: new Date().toISOString()
  }).eq("id", photoshootId).eq("user_id", userId1).in("status", [
    "queued",
    "processing"
  ]);
  if (error) {
    return jsonResponse({
      error: "Failed to cancel photoshoot"
    }, 500);
  }
  return jsonResponse({
    success: true
  }, 200);
}
// E-commerce Photo Generation
async function generateEcommerceIdeas(userId1, params) {
  const { imageUrl, language } = params;
  const supabase = serviceClient();
  if (!imageUrl) {
    return jsonResponse({
      error: "Image URL is required"
    }, 400);
  }
  try {
    console.log(`[generateEcommerceIdeas] Fetching image from ${imageUrl}`);
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      throw new Error(`Failed to fetch image: ${imageResp.status}`);
    }
    const imageBuffer = new Uint8Array(await imageResp.arrayBuffer());
    const base64Image = bufferToBase64(imageBuffer);
    const prompt = `Analyze this fashion/product image and suggest 4 creative e-commerce presentation styles.

                    For each style, provide:
                    1. A short catchy title (3-5 words)
                    2. A brief description (1-2 sentences) of the visual style and mood

                    Focus on diverse approaches:
                    - Minimal/Clean e-commerce
                    - Lifestyle/Contextual
                    - Magazine/Editorial
                    - Street/Urban

                    Format as JSON array: [{"title": "...", "description": "..."}, ...]

                    ###IMPORTANT: You must return the text on this language: ` + language;
    console.log(`[generateEcommerceIdeas] Calling Gemini API...`);
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GOOGLE_AI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: [
            'TEXT'
          ]
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateEcommerceIdeas] Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("No response from Gemini");
    }
    // Parse JSON response
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    const ideas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    console.log(`[generateEcommerceIdeas] Generated ${ideas.length} ideas`);
    return jsonResponse({
      ideas
    }, 200);
  } catch (error) {
    console.error('[generateEcommerceIdeas] Error:', error);
    return jsonResponse({
      error: "Failed to generate ideas",
      message: error.message
    }, 500);
  }
}
async function createEcommercePhotoJob(userId1, params) {
  const { resultId, stylePrompt } = params;
  const supabase = serviceClient();
  // Quick region availability check
  try {
    const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image', {
      headers: {
        'x-goog-api-key': GOOGLE_AI_KEY
      }
    });
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      if (errorText.includes('not available in your country')) {
        return jsonResponse({
          error: "IMAGE_GENERATION_UNAVAILABLE",
          message: "Image generation is not available in your region. Please contact support.",
          details: "This feature requires Google Gemini API access which may be restricted in certain countries."
        }, 503);
      }
    }
  } catch (error) {
    console.warn('[Region check] Failed:', error);
  }
  const creditsNeeded = 1;
  // Check admin status
  const { data: isAdmin } = await supabase.rpc("is_user_admin", {
    check_user_id: userId1
  });
  if (!isAdmin) {
    const deductResult = await deductCredits(userId1, creditsNeeded);
    if (!deductResult.success) {
      return jsonResponse({
        error: deductResult.error
      }, 400);
    }
  }
  const { data: result } = await supabase.from("outfit_swap_results").select("*").eq("id", resultId).eq("user_id", userId1).single();
  if (!result) {
    if (!isAdmin) await refundCredits(userId1, creditsNeeded);
    return jsonResponse({
      error: "Result not found"
    }, 404);
  }
  const { data: ecommercePhoto, error } = await supabase.from("outfit_swap_ecommerce_photos").insert({
    user_id: userId1,
    result_id: resultId,
    status: "queued",
    metadata: {
      original_result_url: result.public_url,
      credits_deducted: creditsNeeded,
      style_prompt: stylePrompt || null
    }
  }).select().single();
  if (error) {
    if (!isAdmin) await refundCredits(userId1, creditsNeeded);
    return jsonResponse({
      error: "Failed to create e-commerce photo job"
    }, 500);
  }
  // Trigger async processing
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  fetch(functionUrl, {
    method: "POST",
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
    body: JSON.stringify({
      action: "processEcommercePhoto",
      photoId: ecommercePhoto.id
    })
  }).catch(console.error);
  return jsonResponse({
    ecommercePhoto
  }, 200);
}
async function processEcommercePhoto(photoId) {
  const supabase = serviceClient();
  console.log(`[processEcommercePhoto] Starting photo ${photoId}`);
  const { data: photo } = await supabase.from("outfit_swap_ecommerce_photos").select("*, outfit_swap_results(*)").eq("id", photoId).single();
  if (!photo) {
    console.error(`[processEcommercePhoto] Photo ${photoId} not found`);
    return jsonResponse({
      error: "Photo not found"
    }, 404);
  }
  await supabase.from("outfit_swap_ecommerce_photos").update({
    status: "processing",
    started_at: new Date().toISOString(),
    progress: 10
  }).eq("id", photoId);
  try {
    const originalUrl = photo.outfit_swap_results.public_url;
    console.log(`[processEcommercePhoto] Fetching original image from ${originalUrl}`);
    const imageResp = await fetch(originalUrl);
    if (!imageResp.ok) {
      throw new Error(`Failed to fetch original image: ${imageResp.status}`);
    }
    const imageBuffer = new Uint8Array(await imageResp.arrayBuffer());
    const base64Image = bufferToBase64(imageBuffer);
    // Check for custom style prompt from metadata
    const stylePrompt = photo.metadata?.style_prompt;
    let prompt = `Generate a professional fashion magazine photograph featuring the model and outfit shown in the reference image.`;
    if (stylePrompt) {
      prompt += `\n\nSTYLE DIRECTION: ${stylePrompt}`;
    }
    prompt += `\n\nCreate a complete fashion scene where:

            GARMENT ANALYSIS - Match environment to style:
            - Casual wear → Urban street, coffee shop, park setting
            - Formal wear → Modern office, elegant venue, city backdrop
            - Athletic wear → Gym, outdoor track, yoga studio
            - Evening wear → Upscale restaurant, gala venue
            - Outerwear → City street, outdoor scene

            PHOTOGRAPHY REQUIREMENTS:
            - Magazine-quality professional photography
            - Natural lighting that complements the environment
            - Proper depth of field with soft background blur
            - Environment enhances but doesn't distract from outfit
            - Model positioned naturally within the scene
            - Cohesive color palette between outfit and setting

            OUTPUT: A polished, magazine-ready fashion photograph where model, outfit, and environment create a unified, professional presentation.`;
    await supabase.from("outfit_swap_ecommerce_photos").update({
      progress: 40
    }).eq("id", photoId);
    console.log(`[processEcommercePhoto] Calling Gemini API with retry logic...`);
    const resultBase64 = await generateImageWithRetry(prompt, base64Image, "image/jpeg");
    if (!resultBase64) {
      throw new Error("Failed to generate image after 3 attempts");
    }
    console.log(`[processEcommercePhoto] Image generated successfully`);
    await supabase.from("outfit_swap_ecommerce_photos").update({
      progress: 80
    }).eq("id", photoId);
    const resultBuffer = Uint8Array.from(atob(resultBase64), (c)=>c.charCodeAt(0));
    const storagePath = `ecommerce/${photoId}.jpg`;
    console.log(`[processEcommercePhoto] Uploading to storage: ${storagePath}`);
    await supabase.storage.from("outfit-swap-photoshoots").upload(storagePath, resultBuffer, {
      contentType: "image/jpeg",
      upsert: true
    });
    const { data: { publicUrl } } = supabase.storage.from("outfit-swap-photoshoots").getPublicUrl(storagePath);
    console.log(`[processEcommercePhoto] Complete! Public URL: ${publicUrl}`);
    await supabase.from("outfit_swap_ecommerce_photos").update({
      status: "completed",
      progress: 100,
      public_url: publicUrl,
      storage_path: storagePath,
      finished_at: new Date().toISOString()
    }).eq("id", photoId);
    return jsonResponse({
      success: true
    }, 200);
  } catch (error) {
    console.error(`[processEcommercePhoto] Error:`, error);
    let userMessage = error.message;
    let errorType = 'UNKNOWN_ERROR';
    if (error.message?.includes('REGION_BLOCKED')) {
      userMessage = 'Image generation is not available in your region';
      errorType = 'REGION_BLOCKED';
    } else if (error.message?.includes('Image generation refused')) {
      userMessage = 'Unable to generate this style. Please try a different approach or contact support.';
      errorType = 'AI_REFUSED';
    } else if (error.message?.includes('429')) {
      userMessage = 'Too many requests. Please try again in a few minutes';
      errorType = 'RATE_LIMIT';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'Request timed out. Please try again';
      errorType = 'TIMEOUT';
    } else if (error.message?.includes('Failed to generate image after')) {
      userMessage = 'Image generation timed out. Please try again.';
      errorType = 'GENERATION_FAILED';
    }
    await supabase.from("outfit_swap_ecommerce_photos").update({
      status: "failed",
      error: userMessage,
      finished_at: new Date().toISOString(),
      metadata: {
        ...photo.metadata,
        error_type: errorType,
        error_details: error.message
      }
    }).eq("id", photoId);
    // Check admin status
    const { data: isAdmin } = await supabase.rpc("is_user_admin", {
      check_user_id: photo.user_id
    });
    if (!isAdmin) {
      console.log(`[processEcommercePhoto] Refunding 1 credit to user`);
      await refundCredits(photo.user_id, 1, 'ecommerce_photo_failed');
    }
    return jsonResponse({
      error: error.message
    }, 500);
  }
}
async function getEcommercePhoto(userId1, photoId) {
  const supabase = serviceClient();
  const { data, error } = await supabase.from("outfit_swap_ecommerce_photos").select("*").eq("id", photoId).eq("user_id", userId1).single();
  if (error) return jsonResponse({
    error: "Photo not found"
  }, 404);
  return jsonResponse({
    ecommercePhoto: data
  }, 200);
}
async function cancelEcommercePhoto(userId1, photoId) {
  const supabase = serviceClient();
  const { error } = await supabase.from("outfit_swap_ecommerce_photos").update({
    status: "canceled",
    finished_at: new Date().toISOString()
  }).eq("id", photoId).eq("user_id", userId1).in("status", [
    "queued",
    "processing"
  ]);
  if (error) return jsonResponse({
    error: "Failed to cancel"
  }, 500);
  return jsonResponse({
    success: true
  }, 200);
}
function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
