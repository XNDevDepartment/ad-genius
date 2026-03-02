// outfit-swap/index.ts - Gemini API v1.0.1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || "";
const serviceClient = ()=>createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Garment category types
type GarmentCategory = 'TOP' | 'BOTTOM' | 'FOOTWEAR' | 'FULL_OUTFIT' | 'ACCESSORY';
type SuggestedFraming = 'upper_body' | 'lower_body' | 'feet' | 'full_body' | 'detail';

interface GarmentAnalysisResult {
  category: GarmentCategory;
  description: string;
  suggestedFraming: SuggestedFraming;
  rawAnalysis: string;
}

// Fallback prompts (used if database is unavailable)
const FALLBACK_GARMENT_ANALYSIS_PROMPT = `ANALYZE THIS GARMENT AND RESPOND IN THIS EXACT FORMAT:

CATEGORY: (TOP / BOTTOM / FOOTWEAR / FULL_OUTFIT / ACCESSORY)
- TOP = t-shirts, shirts, blouses, hoodies, jackets, sweaters, coats (anything worn on upper body only)
- BOTTOM = pants, jeans, shorts, skirts, trousers (anything worn on lower body only)
- FOOTWEAR = shoes, sneakers, boots, sandals, heels
- FULL_OUTFIT = dresses, jumpsuits, rompers, full suits (covers both upper and lower body)
- ACCESSORY = bags, hats, scarves, jewelry, belts

FRAMING: (upper_body / lower_body / feet / full_body / detail)
- upper_body = for tops, jackets, shirts
- lower_body = for pants, skirts, shorts
- feet = for footwear
- full_body = for dresses, full outfits
- detail = for accessories

TYPE: (specific type like t-shirt, jeans, sneakers, etc.)
STYLE: (casual/formal/athletic/streetwear/elegant)
COLOR: Primary and secondary colors
FIT: (fitted/regular/oversized/slim)
MATERIAL: (cotton/denim/leather/knit/synthetic/canvas/suede)
DETAILS: Key features (hood, zipper, buttons, collar type, pockets, sole type, heel height)

Be concise. One line per category.`;

// Category-specific outfit swap prompts
const CATEGORY_SWAP_PROMPTS: Record<GarmentCategory, string> = {
  TOP: `TWO IMAGES PROVIDED:
- IMAGE 1: The model/person to dress (use this person's identity)
- IMAGE 2: THE PRODUCT - This is the TOP that MUST appear on the model

=== THE PRODUCT TO SHOWCASE ===
{garment_description}

THIS IS THE ITEM THE CUSTOMER IS SELLING - THE TOP MUST BE THE VISUAL FOCUS

CRITICAL REQUIREMENTS:

1. MODEL PRESERVATION - ABSOLUTE PRIORITY:
   - You MUST use the EXACT person from IMAGE 1
   - DO NOT create a new person or modify their appearance
   - Keep the EXACT same face, hair, skin tone, body shape

2. PRODUCT FOCUS - THE TOP IS THE HERO:
   - The TOP from IMAGE 2 MUST appear on the model
   - The TOP should be the visual focus of the image
   - Lower body clothing should be NEUTRAL/COMPLEMENTARY (simple jeans, basic pants) - not distracting
   - Footwear should be simple and not draw attention

3. COMPLETE OUTFIT REQUIRED:
   - UPPER BODY: Wear THE PRODUCT (the top from IMAGE 2)
   - LOWER BODY: Simple, neutral pants/jeans/skirt
   - FEET: Simple appropriate shoes

4. FRAMING: Full body (head to toe) - showcase the TOP

5. PATTERN FIDELITY - CRITICAL:
   - You MUST reproduce the EXACT fabric pattern, print, and texture from IMAGE 2
   - Do NOT interpret or reimagine the pattern - copy it PRECISELY
   - Small dots must remain small dots, stripes must remain stripes
   - The pattern scale, spacing, and colors must match IMAGE 2 exactly

FORBIDDEN: Creating new model, changing identity, underwear visible, bare legs, barefoot, focusing on other clothing instead of the TOP

OUTPUT: The SAME model wearing THE PRODUCT (top) as the clear visual focus.`,

  BOTTOM: `TWO IMAGES PROVIDED:
- IMAGE 1: The model/person to dress (use this person's identity)
- IMAGE 2: THE PRODUCT - This is the BOTTOM (pants/skirt/shorts) that MUST appear on the model

=== THE PRODUCT TO SHOWCASE ===
{garment_description}

THIS IS THE ITEM THE CUSTOMER IS SELLING - THE BOTTOM MUST BE THE VISUAL FOCUS

CRITICAL REQUIREMENTS:

1. MODEL PRESERVATION - ABSOLUTE PRIORITY:
   - You MUST use the EXACT person from IMAGE 1
   - DO NOT create a new person or modify their appearance
   - Keep the EXACT same face, hair, skin tone, body shape

2. PRODUCT FOCUS - THE BOTTOM IS THE HERO:
   - The BOTTOM from IMAGE 2 MUST appear on the model
   - The BOTTOM should be the visual focus of the image
   - Upper body clothing should be NEUTRAL/COMPLEMENTARY (simple white/black top) - not distracting
   - Footwear should complement but not distract

3. COMPLETE OUTFIT REQUIRED:
   - UPPER BODY: Simple, neutral top/shirt
   - LOWER BODY: Wear THE PRODUCT (the bottom from IMAGE 2)
   - FEET: Appropriate shoes that complement

4. FRAMING: Full body (head to toe) - showcase the BOTTOM

5. PATTERN FIDELITY - CRITICAL:
   - You MUST reproduce the EXACT fabric pattern, print, and texture from IMAGE 2
   - Do NOT interpret or reimagine the pattern - copy it PRECISELY
   - Small dots must remain small dots, stripes must remain stripes
   - The pattern scale, spacing, and colors must match IMAGE 2 exactly

FORBIDDEN: Creating new model, changing identity, underwear visible, bare torso, focusing on the top instead of the BOTTOM

OUTPUT: The SAME model wearing THE PRODUCT (bottom) as the clear visual focus.`,

  FOOTWEAR: `TWO IMAGES PROVIDED:
- IMAGE 1: The model/person to dress (use this person's identity)
- IMAGE 2: THE PRODUCT - These are the SHOES/FOOTWEAR that MUST appear on the model's feet

=== THE PRODUCT TO SHOWCASE ===
{garment_description}

THIS IS THE ITEM THE CUSTOMER IS SELLING - THE FOOTWEAR MUST BE THE VISUAL FOCUS

CRITICAL REQUIREMENTS:

1. MODEL PRESERVATION - ABSOLUTE PRIORITY:
   - You MUST use the EXACT person from IMAGE 1
   - DO NOT create a new person or modify their appearance
   - Keep the EXACT same face, hair, skin tone, body shape

2. PRODUCT FOCUS - THE FOOTWEAR IS THE HERO:
   - The SHOES from IMAGE 2 MUST appear on the model's feet
   - The FOOTWEAR should be the PRIMARY visual focus
   - Upper body clothing should be PLAIN/NEUTRAL (simple shirt) - DO NOT focus on upper body
   - Lower body clothing should be simple (basic jeans/pants) to not distract from shoes
   - DO NOT make the shirt/top the focus - THE SHOES ARE THE PRODUCT

3. COMPLETE OUTFIT REQUIRED:
   - UPPER BODY: Plain, neutral top (not the focus)
   - LOWER BODY: Simple pants/jeans (not the focus)
   - FEET: Wear THE PRODUCT (the footwear from IMAGE 2) - THIS IS THE FOCUS

4. FRAMING: Full body or knee-to-feet, ensuring SHOES are clearly visible and prominent

5. PATTERN FIDELITY - CRITICAL:
   - You MUST reproduce the EXACT design, pattern, and texture of the footwear from IMAGE 2
   - Do NOT interpret or reimagine the design - copy it PRECISELY
   - The colors, materials, sole design, and details must match IMAGE 2 exactly

FORBIDDEN: Creating new model, changing identity, barefoot, focusing on shirt/top, making upper body the focus, underwear visible

OUTPUT: The SAME model with THE PRODUCT (footwear) clearly visible as the main focus of the image.`,

  FULL_OUTFIT: `TWO IMAGES PROVIDED:
- IMAGE 1: The model/person to dress (use this person's identity)
- IMAGE 2: THE PRODUCT - This is the FULL OUTFIT/DRESS that MUST appear on the model

=== THE PRODUCT TO SHOWCASE ===
{garment_description}

THIS IS THE ITEM THE CUSTOMER IS SELLING - THE OUTFIT MUST BE THE VISUAL FOCUS

CRITICAL REQUIREMENTS:

1. MODEL PRESERVATION - ABSOLUTE PRIORITY:
   - You MUST use the EXACT person from IMAGE 1
   - DO NOT create a new person or modify their appearance
   - Keep the EXACT same face, hair, skin tone, body shape

2. PRODUCT FOCUS - THE OUTFIT IS THE HERO:
   - The OUTFIT from IMAGE 2 MUST appear on the model
   - If it's a dress/jumpsuit: Wear it as the complete outfit
   - If it's a bodysuit/shapewear: LAYER with blazer/jacket over it, add pants/skirt
   - The model must NEVER appear to be in underwear

3. COMPLETE LOOK REQUIRED:
   - Wear THE PRODUCT as the main garment
   - Add appropriate footwear (heels for elegant, sneakers for casual)
   - Model must look fashion-ready

4. FRAMING: Full body (head to toe) - showcase the complete outfit

5. PATTERN FIDELITY - CRITICAL:
   - You MUST reproduce the EXACT fabric pattern, print, and texture from IMAGE 2
   - Do NOT interpret or reimagine the pattern - copy it PRECISELY
   - Small dots must remain small dots, stripes must remain stripes, plaids must remain plaids
   - The pattern scale, spacing, and colors must match IMAGE 2 exactly

FORBIDDEN: Creating new model, changing identity, appearing in underwear, shapewear worn alone, bikini-like appearance

OUTPUT: The SAME model wearing THE PRODUCT (outfit) as a complete, styled look.`,

  ACCESSORY: `TWO IMAGES PROVIDED:
- IMAGE 1: The model/person to dress (use this person's identity)
- IMAGE 2: THE PRODUCT - This is the ACCESSORY that MUST appear on the model

=== THE PRODUCT TO SHOWCASE ===
{garment_description}

THIS IS THE ITEM THE CUSTOMER IS SELLING - THE ACCESSORY MUST BE THE VISUAL FOCUS

CRITICAL REQUIREMENTS:

1. MODEL PRESERVATION - ABSOLUTE PRIORITY:
   - You MUST use the EXACT person from IMAGE 1
   - DO NOT create a new person or modify their appearance
   - Keep the EXACT same face, hair, skin tone, body shape

2. PRODUCT FOCUS - THE ACCESSORY IS THE HERO:
   - The ACCESSORY from IMAGE 2 MUST appear on the model
   - Position it naturally (bag on shoulder, scarf around neck, hat on head, etc.)
   - The accessory should be clearly visible and the focus
   - Clothing should be neutral/complementary to not distract from the accessory

3. COMPLETE OUTFIT REQUIRED:
   - Model must be wearing full clothing (top, bottom, shoes)
   - Clothing should be simple/neutral to highlight the accessory
   - NEVER add accessory to someone in underwear

4. FRAMING: Frame appropriately to showcase the accessory clearly

5. PATTERN FIDELITY - CRITICAL:
   - You MUST reproduce the EXACT design, pattern, texture, and details of the accessory from IMAGE 2
   - Do NOT interpret or reimagine any design elements - copy them PRECISELY
   - The colors, materials, hardware, and details must match IMAGE 2 exactly

FORBIDDEN: Creating new model, changing identity, model in underwear, accessory not visible, clothing overshadowing the accessory

OUTPUT: The SAME model with THE PRODUCT (accessory) clearly visible as the main focus.`,
};

const FALLBACK_OUTFIT_SWAP_PROMPT = CATEGORY_SWAP_PROMPTS.FULL_OUTFIT;
// Helper: Get prompt from database with fallback
async function getPrompt(promptKey: string, variables: Record<string, string> = {}, fallback: string): Promise<string> {
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
async function checkIsAdmin(userId: string): Promise<boolean> {
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
async function deductCredits(userId: string, amount: number) {
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
async function refundCredits(userId: string, amount: number, reason = 'ecommerce_photo_failed_or_cancelled') {
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
function extractBase64Image(jsonResp: any): string | null {
  console.log('[extractBase64Image] Parsing response structure...');
  if (!jsonResp?.candidates) {
    console.error('[extractBase64Image] No candidates in response');
    return null;
  }
  const parts = jsonResp.candidates?.[0]?.content?.parts ?? [];
  console.log(`[extractBase64Image] Found ${parts.length} parts in response`);
  const imgPart = parts.find((p: any)=>p?.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart) {
    console.error('[extractBase64Image] No image part found. Parts structure:', JSON.stringify(parts.map((p: any)=>Object.keys(p))));
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
async function generateImageWithRetry(prompt: string, base64Image: string, mimeType: string, additionalImages: Array<{mimeType: string, base64: string}> = [], maxRetries = 3): Promise<string | null> {
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      console.log(`[Attempt ${attempt}/${maxRetries}] Calling Gemini API...`);
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent', {
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
              'TEXT',
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
    } catch (error: unknown) {
      console.error(`[Attempt ${attempt}] Error:`, error);
      if (error instanceof Error && error.message?.includes('REGION_BLOCKED')) {
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
function bufferToBase64(uint8Array: Uint8Array): string {
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
    // Internal processing actions require service role authentication
    if (["processJob", "processPhotoshoot", "processEcommercePhoto"].includes(action)) {
      const authHeader = req.headers.get("authorization") || "";
      const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
      if (!isServiceRole) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      if (action === "processJob") {
        return await processOutfitSwap(params.jobId);
      }
      if (action === "processPhotoshoot") {
        return await processPhotoshoot(params.photoshootId);
      }
      if (action === "processEcommercePhoto") {
        return await processEcommercePhoto(params.photoId);
      }
    }
    // All other actions require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({
        error: "Unauthorized"
      }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
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
      case "enhanceScenarioPrompt":
        return await enhanceScenarioPrompt(user.id, params);
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
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
async function createOutfitSwapJob(userId1: string, params: any) {
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
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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
// Parse garment analysis to extract category
function parseGarmentCategory(analysis: string): { category: GarmentCategory; framing: SuggestedFraming } {
  const upperAnalysis = analysis.toUpperCase();
  
  // Try to extract CATEGORY line
  const categoryMatch = upperAnalysis.match(/CATEGORY:\s*(TOP|BOTTOM|FOOTWEAR|FULL_OUTFIT|ACCESSORY)/);
  const framingMatch = upperAnalysis.match(/FRAMING:\s*(UPPER_BODY|LOWER_BODY|FEET|FULL_BODY|DETAIL)/);
  
  let category: GarmentCategory = 'FULL_OUTFIT';
  let framing: SuggestedFraming = 'full_body';
  
  if (categoryMatch) {
    category = categoryMatch[1] as GarmentCategory;
  } else {
    // Fallback: infer from keywords
    if (/\b(SHOES?|SNEAKERS?|BOOTS?|SANDALS?|HEELS?|LOAFERS?|FOOTWEAR)\b/.test(upperAnalysis)) {
      category = 'FOOTWEAR';
    } else if (/\b(PANTS?|JEANS?|SHORTS?|SKIRTS?|TROUSERS?|LEGGINGS?)\b/.test(upperAnalysis)) {
      category = 'BOTTOM';
    } else if (/\b(T-?SHIRTS?|SHIRTS?|BLOUSES?|HOODIES?|JACKETS?|SWEATERS?|COATS?|TOPS?)\b/.test(upperAnalysis)) {
      category = 'TOP';
    } else if (/\b(DRESS|JUMPSUIT|ROMPER|SUIT)\b/.test(upperAnalysis)) {
      category = 'FULL_OUTFIT';
    } else if (/\b(BAGS?|HATS?|SCARVES?|JEWELRY|BELTS?|WATCH|SUNGLASSES)\b/.test(upperAnalysis)) {
      category = 'ACCESSORY';
    }
  }
  
  if (framingMatch) {
    framing = framingMatch[1].toLowerCase().replace('_', '_') as SuggestedFraming;
  } else {
    // Infer framing from category
    switch (category) {
      case 'TOP': framing = 'upper_body'; break;
      case 'BOTTOM': framing = 'lower_body'; break;
      case 'FOOTWEAR': framing = 'feet'; break;
      case 'ACCESSORY': framing = 'detail'; break;
      default: framing = 'full_body';
    }
  }
  
  return { category, framing };
}

async function analyzeGarment(garmentUrl: string): Promise<GarmentAnalysisResult> {
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
      return {
        category: 'FULL_OUTFIT',
        description: "clothing garment",
        suggestedFraming: 'full_body',
        rawAnalysis: "clothing garment"
      };
    }
    const data = await response.json();
    const rawAnalysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "clothing garment";
    console.log("[analyzeGarment] Raw analysis:", rawAnalysis);
    
    // Parse category and framing
    const { category, framing } = parseGarmentCategory(rawAnalysis);
    console.log("[analyzeGarment] Detected category:", category, "framing:", framing);
    
    return {
      category,
      description: rawAnalysis,
      suggestedFraming: framing,
      rawAnalysis
    };
  } catch (error) {
    console.error("[analyzeGarment] Error:", error);
    return {
      category: 'FULL_OUTFIT',
      description: "clothing garment",
      suggestedFraming: 'full_body',
      rawAnalysis: "clothing garment"
    };
  }
}
async function processOutfitSwap(jobId: string) {
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
      const { data: sourceImage } = await supabase.from("source_images").select("storage_path, public_url").eq("id", job.source_person_id).single();
      if (!sourceImage?.storage_path) {
        throw new Error("Source image storage path not found");
      }
      personStoragePath = sourceImage.storage_path;
      personBucket = sourceImage.public_url?.includes("/ugc-inputs/") ? "ugc-inputs" : "source-images";
    } else {
      throw new Error("No person image source specified (neither base_model_id nor source_person_id)");
    }
    // Get garment storage path
    const { data: garmentImage } = await supabase.from("source_images").select("storage_path, file_name").eq("id", job.source_garment_id).single();
    if (!garmentImage?.storage_path) {
      throw new Error("Garment image storage path not found in database");
    }
    // Verify garment file exists in storage by attempting to download metadata
    console.log(`[processOutfitSwap] Job ${jobId}: Verifying garment file exists in storage...`);
    const garmentBucket = "source-images";
    
    // Use download to verify file exists - more reliable than list+search
    const { data: garmentFileData, error: garmentDownloadError } = await supabase.storage
      .from(garmentBucket)
      .download(garmentImage.storage_path);
    
    if (garmentDownloadError || !garmentFileData) {
      console.error(`[processOutfitSwap] Job ${jobId}: Garment file not found in storage:`, {
        bucket: garmentBucket,
        path: garmentImage.storage_path,
        error: garmentDownloadError?.message
      });
      
      // Check if file might be in a different location or the record is stale
      const { data: publicUrlData } = supabase.storage
        .from(garmentBucket)
        .getPublicUrl(garmentImage.storage_path);
      
      console.error(`[processOutfitSwap] Job ${jobId}: Expected public URL would be:`, publicUrlData?.publicUrl);
      
      throw new Error(`Garment image file "${garmentImage.file_name || 'Unknown'}" does not exist in storage. Please re-upload the garment image.`);
    }
    
    // Store the downloaded data for later use to avoid re-downloading
    const garmentFileBuffer = await garmentFileData.arrayBuffer();
    console.log(`[processOutfitSwap] Job ${jobId}: Garment file verified in storage (${garmentFileBuffer.byteLength} bytes)`);
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
    const garmentAnalysis = await analyzeGarment(garmentUrl.signedUrl);
    console.log(`[processOutfitSwap] Job ${jobId}: Garment category: ${garmentAnalysis.category}, framing: ${garmentAnalysis.suggestedFraming}`);
    
    // Store garment analysis in job metadata for later use (e.g., by photoshoot)
    await supabase.from("outfit_swap_jobs").update({
      progress: 50,
      metadata: {
        ...job.metadata,
        garment_category: garmentAnalysis.category,
        garment_framing: garmentAnalysis.suggestedFraming,
        garment_description: garmentAnalysis.description
      }
    }).eq("id", jobId);
    
    // STEP 2: Generate category-specific prompt with garment analysis
    const startTime = Date.now();
    // Use category-specific prompt
    const categoryPrompt = CATEGORY_SWAP_PROMPTS.FULL_OUTFIT;
    let prompt = categoryPrompt.replace('{garment_description}', garmentAnalysis.description);
    
    // Append background requirement if provided
    const bgPrompt = (job.settings as any)?.backgroundPrompt;
    if (bgPrompt) {
      prompt += `\n\nBACKGROUND REQUIREMENT:\n${bgPrompt}`;
      console.log(`[processOutfitSwap] Job ${jobId}: Appending background prompt`);
    }
    console.log(`[processOutfitSwap] Job ${jobId}: Using ${garmentAnalysis.category} prompt template`);
    
    await supabase.from("outfit_swap_jobs").update({
      progress: 70
    }).eq("id", jobId);
    // STEP 3: Fetch source images and prepare for Gemini API
    const personResponse = await fetch(personUrl.signedUrl);
    if (!personResponse.ok) {
      throw new Error("Failed to fetch person image for AI processing");
    }
    // Convert to base64 for Gemini API
    // Use pre-downloaded garment buffer from earlier verification
    const personBuffer = await personResponse.arrayBuffer();
    const personBase64 = bufferToBase64(new Uint8Array(personBuffer));
    const garmentBase64 = bufferToBase64(new Uint8Array(garmentFileBuffer));
    const personMimeType = personResponse.headers.get('content-type') ?? 'image/jpeg';
    // Determine garment MIME type from file extension or default to jpeg
    const garmentExt = garmentImage.storage_path.split('.').pop()?.toLowerCase() || 'jpg';
    const garmentMimeType = garmentExt === 'png' ? 'image/png' : garmentExt === 'webp' ? 'image/webp' : 'image/jpeg';
    // Call Gemini API with multimodal input
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent', {
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
              },
              // Add custom background image if provided
              ...await (async () => {
                const bgImageUrl = (job.settings as any)?.backgroundImageUrl;
                if (!bgImageUrl) return [];
                try {
                  console.log(`[processOutfitSwap] Job ${jobId}: Fetching custom background image`);
                  const bgResponse = await fetch(bgImageUrl);
                  if (!bgResponse.ok) return [];
                  const bgBuffer = await bgResponse.arrayBuffer();
                  const bgBase64 = bufferToBase64(new Uint8Array(bgBuffer));
                  const bgMime = bgResponse.headers.get('content-type') ?? 'image/jpeg';
                  return [{
                    text: "Use this image as the background environment for the final result. Place the model in this scene:"
                  }, {
                    inlineData: {
                      mimeType: bgMime,
                      data: bgBase64
                    }
                  }];
                } catch (e) {
                  console.error(`[processOutfitSwap] Job ${jobId}: Failed to fetch background image:`, e);
                  return [];
                }
              })()
            ]
          }
        ],
        generationConfig: {
          responseModalities: [
            'TEXT',
            'IMAGE'
          ],
          imageConfig: {
            aspectRatio: (job.settings as any)?.aspectRatio || undefined,
            imageSize: (job.settings as any)?.imageSize || undefined,
          }
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
    // Save results to outfit_swap_results (include garment category for photoshoot)
    const { error: resultError } = await supabase.from("outfit_swap_results").insert({
      job_id: jobId,
      user_id: job.user_id,
      storage_path: jpgPath,
      public_url: jpgPublicUrl.publicUrl,
      jpg_url: jpgPublicUrl.publicUrl,
      png_url: pngPublicUrl.publicUrl,
      metadata: {
        model_used: "gemini-3-pro-imagem-preview",
        processing_time_ms: processingTime,
        dimensions: "1024x1024",
        exif_stripped: true,
        garment_category: garmentAnalysis.category,
        garment_framing: garmentAnalysis.suggestedFraming
      }
    });
    if (resultError) {
      console.error("[OUTFIT-SWAP] Critical: Failed to save result", {
        jobId,
        userId: job.user_id,
        error: resultError,
        storagePath: jpgPath
      });
      // CRITICAL: Fail the job if result cannot be saved - prevents ghost completed jobs
      throw new Error(`Database insert failed: ${resultError.message}${resultError.code ? ` (code: ${resultError.code})` : ''}`);
    }
    // Update job as completed (preserve garment metadata)
    await supabase.from("outfit_swap_jobs").update({
      status: "completed",
      progress: 100,
      finished_at: new Date().toISOString(),
      metadata: {
        ...job.metadata,
        model_used: "gemini-3-pro-imagem-preview",
        processing_time_ms: processingTime,
        garment_category: garmentAnalysis.category,
        garment_framing: garmentAnalysis.suggestedFraming
      }
    }).eq("id", jobId);

    // Trigger webhook if job was created via API
    if (job.metadata?.source === 'api' && job.metadata?.api_key_id) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/api-webhook-dispatcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKeyId: job.metadata.api_key_id,
            jobId: jobId,
            jobType: 'fashion',
            eventType: 'job.completed',
            userId: job.user_id,
            data: { 
              result_url: jpgPublicUrl.publicUrl,
              png_url: pngPublicUrl.publicUrl 
            }
          })
        });
        console.log("[OUTFIT-SWAP] Webhook triggered for job:", jobId);
      } catch (webhookErr) {
        console.warn("[OUTFIT-SWAP] Webhook trigger failed (non-blocking):", webhookErr);
      }
    }

    // If this job is part of a batch, update batch progress
    const { data: jobData } = await supabase.from("outfit_swap_jobs").select("batch_id").eq("id", jobId).single();
    if (jobData?.batch_id) {
      await updateBatchProgress(jobData.batch_id);
    }
    return jsonResponse({
      success: true
    }, 200);
  } catch (error: unknown) {
    console.error("Processing error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from("outfit_swap_jobs").update({
      status: "failed",
      error: errorMessage,
      finished_at: new Date().toISOString()
    }).eq("id", jobId);
    // If this job is part of a batch, update batch progress
    const { data: failedJobData } = await supabase.from("outfit_swap_jobs").select("batch_id").eq("id", jobId).single();
    if (failedJobData?.batch_id) {
      await updateBatchProgress(failedJobData.batch_id);
    }
    return jsonResponse({
      error: errorMessage
    }, 500);
  }
}
async function updateBatchProgress(batchId: string) {
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
async function getJob(userId1: string, jobId: string) {
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
async function getJobResults(userId1: string, jobId: string) {
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
async function cancelJob(userId1: string, jobId: string) {
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
async function retryJob(userId1: string, jobId: string) {
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
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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
async function createBatchJob(userId1: string, params: any) {
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
  // Calculate credits based on image size: 1K=1, 2K=2, 4K=4 per garment
  const sizeMultiplier = settings?.imageSize === '4K' ? 4 : settings?.imageSize === '2K' ? 2 : 1;
  const baseCreditsNeeded = garmentIds.length * sizeMultiplier;
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
  // Process jobs asynchronously using service role key for internal calls (fire-and-forget)
  const functionUrl = `${SUPABASE_URL}/functions/v1/outfit-swap`;
  for (const job of jobs){
    fetch(functionUrl, {
      method: "POST",
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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
async function getBatch(userId1: string, batchId: string) {
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
async function cancelBatch(userId1: string, batchId: string) {
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
// Category-specific angle definitions
const CATEGORY_ANGLES: Record<string, string[]> = {
  TOP: ['three_quarter', 'back', 'side', 'arms_crossed', 'hand_on_hip', 'detail'],
  BOTTOM: ['lower_body_front', 'back', 'side', 'walking_pose', 'seated', 'lower_body_detail'],
  FOOTWEAR: ['shoe_front', 'shoe_side', 'shoe_back', 'walking_pose', 'cross_legged'],
  FULL_BODY: ['three_quarter', 'back', 'side', 'walking_pose', 'hand_on_hip', 'over_shoulder', 'detail'],
  // Legacy mappings
  FULL_OUTFIT: ['three_quarter', 'back', 'side', 'walking_pose', 'hand_on_hip', 'over_shoulder', 'detail'],
  ACCESSORY: ['detail', 'three_quarter', 'side', 'back']
};

// Angle-specific prompts for photoshoot
const ANGLE_PROMPTS: Record<string, string> = {
  // Upper body / general angles
  'three_quarter': `Create a high-quality e-commerce product photo: On-body three-quarter view (45° turn), head to mid-thigh framing, one foot slightly forward to show torso depth and shoulder line. SAME background as the source image, soft key, subtle rim light to separate from background, controlled specularity on knit. 50mm lens look, f/8, ISO 100. Emphasize side seam, sleeve length, and hem fall. Clean, editorial retail lighting. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'back': `Create a high-quality e-commerce product photo: On-body back view, shoulders level, arms relaxed, straight posture. SAME background as the source image, balanced key/fill to avoid hotspots, faint floor shadow. 50–70mm lens look, f/8, ISO 100. Capture yoke/neck ribbing, back drape, and hem alignment. Centered, color-accurate, luxury e-commerce finish. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`,
  'side': `Create a high-quality e-commerce product photo: On-body true side profile, chin parallel to floor, arms relaxed (small air gap at elbow), head to mid-thigh framing. SAME background as the source image, soft key from camera front, gentle fill to preserve knit detail, micro-shadow under hem. 70mm equivalent look, f/8, ISO 100. Prioritize silhouette, shoulder slope, sleeve taper, and ribbed cuff definition. Premium catalog style. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`,
  'detail': `Create a high-quality e-commerce product photo: Upper-torso close-up crop from shoulders to mid-torso, camera perpendicular to garment. Soft, even light to reveal rib-knit texture and stitching. 85–100mm look, f/8. High sharpness, no moiré, color-accurate wool tone. SAME background as the source image. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is. ###RULES - Image must not infringe any System Safety margins and rules.`,
  
  // New poses
  'arms_crossed': `Create a high-quality e-commerce product photo: Full body (head to toe), model standing with arms crossed confidently on chest. SAME background as the source image, editorial fashion lighting with soft key and fill. 50mm lens look, f/8, ISO 100. Show how the garment sits on the torso with arms crossed — emphasize shoulder line, chest fit, and sleeve structure. Confident, editorial pose. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'hand_on_hip': `Create a high-quality e-commerce product photo: Full body (head to toe), model standing with one hand on hip, weight shifted to one side. SAME background as the source image, editorial fashion lighting. 50mm lens look, f/8, ISO 100. Show waist fit, sleeve drape, and garment silhouette in this classic editorial stance. Dynamic yet controlled pose. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'over_shoulder': `Create a high-quality e-commerce product photo: Full body (head to toe), model looking back over shoulder with a three-quarter back view. SAME background as the source image, editorial lighting with rim light on shoulder. 50-70mm lens look, f/8, ISO 100. Show back of garment while face is visible in profile. Classic fashion editorial pose. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'walking_pose': `Create a high-quality e-commerce product photo: FULL BODY in natural walking pose. Model mid-stride showing movement and fabric drape. One leg forward, one back. SAME background as the source image. 50mm lens look, f/8. Capture how garment moves with the body, fabric swing, and natural creasing. Dynamic but controlled pose. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'seated': `Create a high-quality e-commerce product photo: Model seated on a minimal stool or cube, legs crossed or angled naturally. SAME background as the source image, soft editorial lighting. 50-70mm lens look, f/8, ISO 100. Show how the garment drapes when seated — knee break, fabric flow, and waist fit. Natural, relaxed editorial pose. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'cross_legged': `Create a high-quality e-commerce product photo: KNEE TO FEET framing. Model standing with one foot crossed in front of the other, showing both the top and sole detail of the footwear. SAME background as the source image, soft even lighting. 85mm lens look, f/8. Emphasize shoe design from a dynamic angle. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  
  // Bottom-specific angles
  'lower_body_front': `Create a high-quality e-commerce product photo: WAIST TO FEET FRAMING. Front view of model from waist down to feet, showing full pant/skirt length. Natural stance with weight balanced. SAME background as the source image, soft even lighting to show fabric drape and texture. 50mm lens look, f/8. Emphasize leg line, hem fall, and fit through hips and thighs. Show how the garment fits the body. Natural floor shadow. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'lower_body_detail': `Create a high-quality e-commerce product photo: WAIST TO MID-THIGH close-up crop. Front view showing waistband construction, fabric texture, pocket details, and hip fit. SAME background as the source image, soft even lighting. 85-100mm lens look, f/8. High sharpness, color-accurate fabric tones. Show construction quality and material. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  
  // Legacy bottom angles (keep for backwards compatibility)
  'lower_body_back': `Create a high-quality e-commerce product photo: WAIST TO FEET FRAMING from behind. Back view of model from waist down to feet. Standing straight, shoulders level. SAME background as the source image, balanced lighting. 50-70mm lens look, f/8. Capture back pocket details, seat fit, back seam, and hem alignment. Show how fabric drapes from behind. Natural floor shadow. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'lower_body_side': `Create a high-quality e-commerce product photo: WAIST TO FEET side profile. True side view from waist to feet showing silhouette. Natural pose with one leg slightly forward. SAME background as the source image, soft lighting. 70mm lens look, f/8. Emphasize thigh fit, knee break, and leg taper. Show fabric flow and movement. Natural shadow. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  
  // Footwear angles
  'shoe_front': `Create a high-quality e-commerce product photo: KNEE TO FEET framing. Front view of model's feet and lower legs showing both shoes clearly. Natural standing pose, feet shoulder-width apart. SAME background as the source image, soft even lighting. 85mm lens look, f/8. Show full shoe design, toe box, upper construction. Natural floor shadow under shoes. Shoe details must be crisp and clear. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'shoe_side': `Create a high-quality e-commerce product photo: KNEE TO FEET framing from side. Side profile showing one shoe clearly with full silhouette. Model in natural stance. SAME background as the source image. 85-100mm lens look, f/8. Emphasize sole, heel height, arch, and shoe profile. Show materials and construction details. Natural shadow on floor. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`,
  'shoe_back': `Create a high-quality e-commerce product photo: KNEE TO FEET framing from behind. Back view showing both shoe heels and back construction. Natural stance. SAME background as the source image. 70mm lens look, f/8. Capture heel design, back tab, Achilles notch, and sole edge. Show how shoes look from behind when walking away. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.###RULES - Image must not infringe any System Safety margins and rules.`
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
Create a high-quality e-commerce product photo: On-body back view, shoulders level, arms relaxed, straight posture. SAME background as the source image, balanced key/fill to avoid hotspots, faint floor shadow. 50–70mm lens look, f/8, ISO 100. Capture yoke/neck ribbing, back drape, and hem alignment. Centered, color-accurate, luxury e-commerce finish. ###IMPORTANT: Don't change the clothes of the model. Keep the model exactly as it is.
`;
async function createPhotoshootJob(userId1: string, params: any) {
  const { resultId, backImageUrl, selectedAngles, selectedCategory } = params;
  const supabase = serviceClient();
  
  // Use selectedCategory from params (user-chosen) instead of auto-detection
  const garmentCategory = selectedCategory || 'FULL_BODY';
  const categoryAngles = CATEGORY_ANGLES[garmentCategory] || CATEGORY_ANGLES.FULL_BODY;
  
  // Use provided angles or default to category-specific angles
  const defaultAngles = selectedAngles || categoryAngles;
  
  // Validate selectedAngles - allow all valid angle types
  const validAngles = [
    'front', 'three_quarter', 'back', 'side', 'detail',
    'arms_crossed', 'hand_on_hip', 'over_shoulder', 'walking_pose', 'seated', 'cross_legged',
    'lower_body_front', 'lower_body_back', 'lower_body_side', 'lower_body_detail',
    'shoe_front', 'shoe_side', 'shoe_back'
  ];
  const angles = defaultAngles.filter((angle: string) => validAngles.includes(angle));
  if (angles.length === 0) {
    return jsonResponse({
      error: "At least one angle must be selected"
    }, 400);
  }
  // Quick region availability check
  try {
    const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-imagem-preview', {
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
  console.log(`[createPhotoshoot] Creating photoshoot for result ${resultId} with ${angles.length} angles (category: ${garmentCategory}):`, angles);
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
  // Create photoshoot record with garment category
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
      selected_angle_count: angles.length,
      garment_category: garmentCategory,
      category_angles: categoryAngles
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
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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
async function processPhotoshoot(photoshootId: string) {
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
    const imageGenerationPromises = selectedAngles.map(async (angleId: string, index: number) => {
      const imageNum = index + 1;
      // Stagger requests by 500ms to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 500));
      console.log(`[processPhotoshoot] Starting angle ${angleId} (${imageNum}/${angleCount})`);
      try {
        // Update progress based on number of selected angles
        const progressIncrement = 80 / angleCount; // 80% for generation, 20% for setup
        await supabase.from("outfit_swap_photoshoots").update({
          progress: Math.round(20 + (imageNum - 1) * progressIncrement)
        }).eq("id", photoshootId);
        // Determine prompt and additional images based on angle
        const angleKey = angleId as keyof typeof ANGLE_PROMPTS;
        let prompt = ANGLE_PROMPTS[angleKey] || ANGLE_PROMPTS['three_quarter'];
        prompt += "\n\nBACKGROUND RULE: You MUST keep the EXACT SAME background, lighting, and environment as the source image. Do NOT change the background color, texture, or setting. If the source has a black background, the output MUST have a black background. NEVER default to grey or white.";
        let additionalImages: Array<{ base64: string; mimeType: string }> = [];
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
        // Update photoshoot record for this specific image (only for first 4 — backward compat)
        if (imageNum <= 4) {
          await supabase.from("outfit_swap_photoshoots").update({
            [`image_${imageNum}_url`]: urlData.publicUrl,
            [`image_${imageNum}_path`]: storagePath
          }).eq("id", photoshootId);
        }
        console.log(`[processPhotoshoot] Image ${imageNum} completed successfully`);
        return {
          success: true,
          imageNum,
          angleId,
          url: urlData.publicUrl,
          path: storagePath
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
    // Count successes and failures, and collect generated images for metadata
    let successfulImages = 0;
    let failedImages = 0;
    const generatedImages: Array<{ angleId: string; imageNum: number; url: string; path: string }> = [];
    results.forEach((result, index)=>{
      if (result.status === 'fulfilled' && result.value.success) {
        successfulImages++;
        generatedImages.push({
          angleId: result.value.angleId,
          imageNum: result.value.imageNum,
          url: result.value.url,
          path: result.value.path
        });
      } else {
        failedImages++;
      }
      // Update progress as each completes
      const progressPercent = Math.round(20 + (index + 1) / angleCount * 80);
      supabase.from("outfit_swap_photoshoots").update({
        progress: progressPercent
      }).eq("id", photoshootId);
    });
    // Sort by imageNum so they appear in order
    generatedImages.sort((a, b) => a.imageNum - b.imageNum);
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
        generated_images: generatedImages,
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
  } catch (error: unknown) {
    console.error("[processPhotoshoot] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = errorMessage || "Failed to generate photoshoot";
    let errorType = 'UNKNOWN_ERROR';
    if (errorMessage?.includes('REGION_BLOCKED')) {
      userMessage = 'Image generation is not available in your region';
      errorType = 'REGION_BLOCKED';
    } else if (errorMessage?.includes('429')) {
      userMessage = 'Too many requests. Please try again in a few minutes';
      errorType = 'RATE_LIMIT';
    }
    await supabase.from("outfit_swap_photoshoots").update({
      status: "failed",
      error: userMessage,
      finished_at: new Date().toISOString(),
      metadata: {
        error_type: errorType,
        error_details: errorMessage
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
      error: errorMessage
    }, 500);
  }
}
async function getPhotoshoot(userId1: string, photoshootId: string) {
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
async function cancelPhotoshoot(userId1: string, photoshootId: string) {
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
async function generateEcommerceIdeas(userId1: string, params: any) {
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
  } catch (error: unknown) {
    console.error('[generateEcommerceIdeas] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({
      error: "Failed to generate ideas",
      message: errorMessage
    }, 500);
  }
}

// Enhance user's scenario prompt with AI
async function enhanceScenarioPrompt(userId1: string, params: any) {
  const { userPrompt, imageUrl, language } = params;
  
  if (!userPrompt || !userPrompt.trim()) {
    return jsonResponse({
      error: "User prompt is required"
    }, 400);
  }
  
  try {
    console.log(`[enhanceScenarioPrompt] Enhancing prompt for user ${userId1}`);
    
    // Build the enhancement prompt
    let prompt = `You are an e-commerce photography expert. 
        The user wants to create a professional UGC (User Generated Content) product photo with this vision: "${userPrompt}"

        Enhance and expand this description into a detailed, professional e-commerce photography brief (2 sentences max). 1 Photo, 1 Angle always. Include:
        - Lighting style and mood
        - Background/setting details
        - Composition and atmosphere
        - Camera angle or perspective suggestions

        Keep the user's core idea but make it more specific, visual, and actionable for image generation.
        Return ONLY the enhanced description text, no explanations or formatting.
        Language: ${language || 'en'}`;

    const requestBody: any = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 300
      }
    };

    // If image URL is provided, include it for better context (with timeout)
    if (imageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const imageResp = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (imageResp.ok) {
          const imageBuffer = new Uint8Array(await imageResp.arrayBuffer());
          const base64Image = bufferToBase64(imageBuffer);
          requestBody.contents[0].parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          });
          console.log('[enhanceScenarioPrompt] Image included for context');
        }
      } catch (imgError) {
        console.warn('[enhanceScenarioPrompt] Could not fetch image (timeout or error), proceeding without it');
      }
    }

    console.log(`[enhanceScenarioPrompt] Calling Gemini API...`);
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GOOGLE_AI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[enhanceScenarioPrompt] Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("No response from Gemini");
    }

    // Clean up the response - remove quotes if wrapped
    let enhancedPrompt = textResponse.trim();
    if ((enhancedPrompt.startsWith('"') && enhancedPrompt.endsWith('"')) ||
        (enhancedPrompt.startsWith("'") && enhancedPrompt.endsWith("'"))) {
      enhancedPrompt = enhancedPrompt.slice(1, -1);
    }

    console.log(`[enhanceScenarioPrompt] Successfully enhanced prompt`);
    return jsonResponse({
      enhancedPrompt,
      original: userPrompt
    }, 200);

  } catch (error: unknown) {
    console.error('[enhanceScenarioPrompt] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({
      error: "Failed to enhance prompt",
      message: errorMessage
    }, 500);
  }
}

async function createEcommercePhotoJob(userId1: string, params: any) {
  const { resultId, stylePrompt } = params;
  const supabase = serviceClient();
  // Quick region availability check
  try {
    const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-imagem-preview', {
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
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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
async function processEcommercePhoto(photoId: string) {
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
    let prompt = `TASK: Create authentic UGC photo featuring this product.

SCENARIO: ${stylePrompt || 'Natural lifestyle moment'}
AUDIENCE: General consumer who appreciates good quality garments and likes fashion. Final image for e-commerce store. Preferable magazine photography but with UGC context

MANDATORY RULES:
1. PRODUCT INTEGRITY:
   - Use EXACT product from reference image
   - Keep all labels, colors, shapes, branding unchanged
   - Model is hero - 60-75% of frame

2. AUTHENTICITY:
   - 4k-professional-quality photography
   - Natural lighting, real environments
   - Slight imperfections (soft focus, natural shadows)
   - Casual, off-center framing

3. STYLE:
   - lifestyle photography aesthetic
   - natural lighting

4. QUALITY:
   - No AI artifacts, watermarks, text
   - Natural human anatomy if people appear
   - No invented branding

--negative "AI artifacts, text overlays, watermark, distorted faces, extra limbs, blurry, low quality, cartoon, illustration, painting, drawing, bad anatomy"

OUTPUT: Single authentic UGC photo ready for social media.`;
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
  } catch (error: unknown) {
    console.error(`[processEcommercePhoto] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = errorMessage;
    let errorType = 'UNKNOWN_ERROR';
    if (errorMessage?.includes('REGION_BLOCKED')) {
      userMessage = 'Image generation is not available in your region';
      errorType = 'REGION_BLOCKED';
    } else if (errorMessage?.includes('Image generation refused')) {
      userMessage = 'Unable to generate this style. Please try a different approach or contact support.';
      errorType = 'AI_REFUSED';
    } else if (errorMessage?.includes('429')) {
      userMessage = 'Too many requests. Please try again in a few minutes';
      errorType = 'RATE_LIMIT';
    } else if (errorMessage?.includes('timeout')) {
      userMessage = 'Request timed out. Please try again';
      errorType = 'TIMEOUT';
    } else if (errorMessage?.includes('Failed to generate image after')) {
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
        error_details: errorMessage
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
      error: errorMessage
    }, 500);
  }
}
async function getEcommercePhoto(userId1: string, photoId: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase.from("outfit_swap_ecommerce_photos").select("*").eq("id", photoId).eq("user_id", userId1).single();
  if (error) return jsonResponse({
    error: "Photo not found"
  }, 404);
  return jsonResponse({
    ecommercePhoto: data
  }, 200);
}
async function cancelEcommercePhoto(userId1: string, photoId: string) {
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
function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
