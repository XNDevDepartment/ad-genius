// outfit-creator/index.ts - Multi-pass outfit generation with Gemini
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || "";

const serviceClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface GarmentSlots {
  top?: string;
  bottom?: string;
  shoes?: string;
  accessory_1?: string;
  accessory_2?: string;
}

interface GarmentAnalysis {
  slot: 'TOP' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';
  type: string;
  color: string;
  style: string;
  material: string;
  keyFeatures: string;
}

// Helper: JSON response
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper: Get prompt from database
async function getPrompt(promptKey: string, variables: Record<string, string> = {}): Promise<string> {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_key', promptKey)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    
    let prompt = data.prompt_template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }
    return prompt;
  } catch (error) {
    console.error(`[getPrompt] Failed to load ${promptKey}:`, error);
    throw new Error(`Prompt ${promptKey} not found`);
  }
}

// Helper: Deduct credits
async function deductCredits(userId: string, amount: number) {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: 'outfit_creator_generation'
  });
  
  if (error || !data?.success) {
    return { success: false, error: data?.error || error?.message || 'Insufficient credits' };
  }
  return { success: true };
}

// Helper: Refund credits
async function refundCredits(userId: string, amount: number, reason = 'outfit_creator_failed') {
  const supabase = serviceClient();
  await supabase.rpc('refund_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason
  });
}

// Helper: Convert ArrayBuffer to base64
function bufferToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Helper: Fetch image as base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  const base64 = bufferToBase64(new Uint8Array(buffer));
  
  return { base64, mimeType: contentType };
}

// Helper: Extract base64 from Gemini response
function extractBase64Image(jsonResp: any): string | null {
  if (!jsonResp?.candidates) return null;
  const parts = jsonResp.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p?.inlineData?.mimeType?.startsWith('image/'));
  return imgPart?.inlineData?.data || null;
}

// Helper: Extract text from Gemini response
function extractTextResponse(jsonResp: any): string | null {
  if (!jsonResp?.candidates) return null;
  const parts = jsonResp.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p: any) => p?.text);
  return textPart?.text || null;
}

// Helper: Call Gemini for image generation
async function generateWithGemini(
  prompt: string,
  images: Array<{ base64: string; mimeType: string }>,
  maxRetries = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Attempt ${attempt}/${maxRetries} with ${images.length} images`);
      
      const parts: any[] = [{ text: prompt }];
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64
          }
        });
      }
      
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': GOOGLE_AI_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini] API error ${response.status}:`, errorText);
        
        if (response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 16000);
          console.log(`[Gemini] Rate limited, waiting ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.candidates?.[0]?.finishReason === 'IMAGE_OTHER') {
        throw new Error(`Safety filter: ${data.candidates[0].finishMessage || 'Content rejected'}`);
      }
      
      const resultBase64 = extractBase64Image(data);
      if (resultBase64) {
        console.log(`[Gemini] ✅ Image generated successfully`);
        return resultBase64;
      }
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    } catch (error) {
      console.error(`[Gemini] Attempt ${attempt} error:`, error);
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return null;
}

// Helper: Call Gemini for text analysis
async function analyzeWithGemini(
  prompt: string,
  image: { base64: string; mimeType: string }
): Promise<string | null> {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GOOGLE_AI_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: image.mimeType, data: image.base64 } }
            ]
          }]
        })
      }
    );
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return extractTextResponse(data);
  } catch (error) {
    console.error('[analyzeWithGemini] Error:', error);
    return null;
  }
}

// Helper: Parse garment analysis response
function parseGarmentAnalysis(text: string): GarmentAnalysis | null {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const getValue = (prefix: string) => {
      const line = lines.find(l => l.toUpperCase().startsWith(prefix.toUpperCase()));
      return line?.split(':').slice(1).join(':').trim() || '';
    };
    
    const slotRaw = getValue('SLOT').toUpperCase();
    let slot: GarmentAnalysis['slot'] = 'ACCESSORY';
    if (slotRaw.includes('TOP')) slot = 'TOP';
    else if (slotRaw.includes('BOTTOM')) slot = 'BOTTOM';
    else if (slotRaw.includes('SHOES')) slot = 'SHOES';
    
    return {
      slot,
      type: getValue('TYPE'),
      color: getValue('COLOR'),
      style: getValue('STYLE'),
      material: getValue('MATERIAL'),
      keyFeatures: getValue('KEY_FEATURES')
    };
  } catch {
    return null;
  }
}

// Helper: Upload image to storage
async function uploadToStorage(
  userId: string,
  jobId: string,
  base64Data: string,
  suffix: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = serviceClient();
  const fileName = `${userId}/${jobId}/${suffix}.png`;
  
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const { error } = await supabase.storage
    .from('generated-images')
    .upload(fileName, binaryData, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) throw new Error(`Upload failed: ${error.message}`);
  
  const { data: urlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);
  
  return {
    storagePath: fileName,
    publicUrl: urlData.publicUrl
  };
}

// ACTION: Analyze garment
async function handleAnalyzeGarment(sourceImageId: string): Promise<Response> {
  const supabase = serviceClient();
  
  // Fetch source image
  const { data: sourceImage, error } = await supabase
    .from('source_images')
    .select('public_url')
    .eq('id', sourceImageId)
    .single();
  
  if (error || !sourceImage) {
    return jsonResponse({ error: 'Source image not found' }, 404);
  }
  
  const imageData = await fetchImageAsBase64(sourceImage.public_url);
  const prompt = await getPrompt('outfit_creator_garment_analysis');
  const analysisText = await analyzeWithGemini(prompt, imageData);
  
  if (!analysisText) {
    return jsonResponse({ error: 'Failed to analyze garment' }, 500);
  }
  
  const analysis = parseGarmentAnalysis(analysisText);
  
  return jsonResponse({
    analysis,
    rawText: analysisText,
    suggestedSlot: analysis?.slot?.toLowerCase() || 'accessory'
  });
}

// ACTION: Create job
async function handleCreateJob(
  userId: string,
  baseModelId: string,
  garments: GarmentSlots,
  settings: any = {}
): Promise<Response> {
  const supabase = serviceClient();
  
  // Count filled slots to determine passes needed
  const filledSlots = Object.entries(garments).filter(([_, v]) => v);
  if (filledSlots.length === 0) {
    return jsonResponse({ error: 'At least one garment is required' }, 400);
  }
  
  // Calculate cost: 3 credits for complete outfit
  const creditCost = 3;
  const deductResult = await deductCredits(userId, creditCost);
  if (!deductResult.success) {
    return jsonResponse({ error: deductResult.error || 'Insufficient credits' }, 402);
  }
  
  // Determine how many passes are needed
  // Pass 1: Model + Top + Bottom (if both exist)
  // Pass 2: Result + Shoes (if exists)
  // Pass 3: Result + Accessories (if exist)
  let totalPasses = 0;
  if (garments.top || garments.bottom) totalPasses++;
  if (garments.shoes) totalPasses++;
  if (garments.accessory_1 || garments.accessory_2) totalPasses++;
  
  // Create job
  const { data: job, error } = await supabase
    .from('outfit_creator_jobs')
    .insert({
      user_id: userId,
      base_model_id: baseModelId,
      garments,
      settings,
      status: 'queued',
      total_passes: Math.max(totalPasses, 1),
      metadata: { credit_cost: creditCost }
    })
    .select()
    .single();
  
  if (error) {
    await refundCredits(userId, creditCost, 'outfit_creator_job_creation_failed');
    return jsonResponse({ error: 'Failed to create job' }, 500);
  }
  
  // Trigger processing
  EdgeRuntime.waitUntil(
    fetch(`${SUPABASE_URL}/functions/v1/outfit-creator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ action: 'processJob', jobId: job.id })
    }).catch(err => console.error('[handleCreateJob] Failed to trigger processing:', err))
  );
  
  return jsonResponse({ job });
}

// ACTION: Get job
async function handleGetJob(userId: string, jobId: string): Promise<Response> {
  const supabase = serviceClient();
  
  const { data: job, error } = await supabase
    .from('outfit_creator_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();
  
  if (error || !job) {
    return jsonResponse({ error: 'Job not found' }, 404);
  }
  
  return jsonResponse({ job });
}

// ACTION: Get result
async function handleGetResult(userId: string, jobId: string): Promise<Response> {
  const supabase = serviceClient();
  
  const { data: result, error } = await supabase
    .from('outfit_creator_results')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single();
  
  if (error || !result) {
    return jsonResponse({ error: 'Result not found' }, 404);
  }
  
  return jsonResponse({ result });
}

// ACTION: Cancel job
async function handleCancelJob(userId: string, jobId: string): Promise<Response> {
  const supabase = serviceClient();
  
  const { data: job, error } = await supabase
    .from('outfit_creator_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();
  
  if (error || !job) {
    return jsonResponse({ error: 'Job not found' }, 404);
  }
  
  if (job.status === 'completed' || job.status === 'failed') {
    return jsonResponse({ error: 'Cannot cancel finished job' }, 400);
  }
  
  await supabase
    .from('outfit_creator_jobs')
    .update({ status: 'canceled', finished_at: new Date().toISOString() })
    .eq('id', jobId);
  
  // Refund credits
  const creditCost = (job.metadata as any)?.credit_cost || 3;
  await refundCredits(userId, creditCost, 'outfit_creator_canceled');
  
  return jsonResponse({ success: true });
}

// ACTION: Process job (internal)
async function processJob(jobId: string): Promise<Response> {
  const supabase = serviceClient();
  
  console.log(`[processJob] Starting job ${jobId}`);
  
  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('outfit_creator_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (jobError || !job) {
    console.error('[processJob] Job not found');
    return jsonResponse({ error: 'Job not found' }, 404);
  }
  
  if (job.status === 'canceled') {
    return jsonResponse({ message: 'Job was canceled' });
  }
  
  const userId = job.user_id;
  const garments = job.garments as GarmentSlots;
  
  try {
    // Update status to processing
    await supabase
      .from('outfit_creator_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);
    
    // Fetch base model
    const { data: baseModel } = await supabase
      .from('outfit_swap_base_models')
      .select('public_url')
      .eq('id', job.base_model_id)
      .single();
    
    if (!baseModel) throw new Error('Base model not found');
    
    const modelImage = await fetchImageAsBase64(baseModel.public_url);
    const intermediateImages: string[] = [];
    let currentImage = modelImage;
    let currentPass = 0;
    
    // Helper to fetch garment image and analyze
    async function getGarmentData(sourceImageId: string): Promise<{ image: { base64: string; mimeType: string }; description: string }> {
      const { data: sourceImage } = await supabase
        .from('source_images')
        .select('public_url')
        .eq('id', sourceImageId)
        .single();
      
      if (!sourceImage) throw new Error('Garment image not found');
      
      const image = await fetchImageAsBase64(sourceImage.public_url);
      
      // Analyze garment for description
      const analysisPrompt = await getPrompt('outfit_creator_garment_analysis');
      const analysisText = await analyzeWithGemini(analysisPrompt, image);
      const analysis = analysisText ? parseGarmentAnalysis(analysisText) : null;
      
      const description = analysis
        ? `${analysis.color} ${analysis.material} ${analysis.type}, ${analysis.style} style. ${analysis.keyFeatures}`
        : 'Fashion garment';
      
      return { image, description };
    }
    
    // PASS 1: Core outfit (Top + Bottom or single garment)
    if (garments.top || garments.bottom) {
      currentPass++;
      console.log(`[processJob] Pass ${currentPass}: Core outfit`);
      
      await supabase
        .from('outfit_creator_jobs')
        .update({ current_pass: currentPass, progress: Math.round((currentPass / job.total_passes) * 50) })
        .eq('id', jobId);
      
      const images = [currentImage];
      let prompt: string;
      
      if (garments.top && garments.bottom) {
        // Both top and bottom - use pass1 prompt
        const topData = await getGarmentData(garments.top);
        const bottomData = await getGarmentData(garments.bottom);
        
        images.push(topData.image, bottomData.image);
        prompt = await getPrompt('outfit_creator_pass1_core', {
          top_description: topData.description,
          bottom_description: bottomData.description
        });
      } else {
        // Single garment - use single pass prompt
        const garmentId = garments.top || garments.bottom;
        const garmentData = await getGarmentData(garmentId!);
        
        images.push(garmentData.image);
        prompt = await getPrompt('outfit_creator_single_pass', {
          garment_description: garmentData.description
        });
      }
      
      const resultBase64 = await generateWithGemini(prompt, images);
      if (!resultBase64) throw new Error('Pass 1 generation failed');
      
      // Store intermediate
      const { publicUrl } = await uploadToStorage(userId, jobId, resultBase64, `pass${currentPass}`);
      intermediateImages.push(publicUrl);
      currentImage = { base64: resultBase64, mimeType: 'image/png' };
      
      await supabase
        .from('outfit_creator_jobs')
        .update({ intermediate_images: intermediateImages })
        .eq('id', jobId);
    }
    
    // PASS 2: Add footwear
    if (garments.shoes) {
      currentPass++;
      console.log(`[processJob] Pass ${currentPass}: Footwear`);
      
      await supabase
        .from('outfit_creator_jobs')
        .update({ current_pass: currentPass, progress: Math.round((currentPass / job.total_passes) * 70) })
        .eq('id', jobId);
      
      const shoesData = await getGarmentData(garments.shoes);
      const prompt = await getPrompt('outfit_creator_pass2_footwear', {
        shoes_description: shoesData.description
      });
      
      const resultBase64 = await generateWithGemini(prompt, [currentImage, shoesData.image]);
      if (!resultBase64) throw new Error('Pass 2 generation failed');
      
      const { publicUrl } = await uploadToStorage(userId, jobId, resultBase64, `pass${currentPass}`);
      intermediateImages.push(publicUrl);
      currentImage = { base64: resultBase64, mimeType: 'image/png' };
      
      await supabase
        .from('outfit_creator_jobs')
        .update({ intermediate_images: intermediateImages })
        .eq('id', jobId);
    }
    
    // PASS 3: Add accessories
    if (garments.accessory_1 || garments.accessory_2) {
      currentPass++;
      console.log(`[processJob] Pass ${currentPass}: Accessories`);
      
      await supabase
        .from('outfit_creator_jobs')
        .update({ current_pass: currentPass, progress: 90 })
        .eq('id', jobId);
      
      const images = [currentImage];
      let acc1Desc = 'No accessory';
      let acc2Desc = 'No accessory';
      
      if (garments.accessory_1) {
        const acc1Data = await getGarmentData(garments.accessory_1);
        images.push(acc1Data.image);
        acc1Desc = acc1Data.description;
      }
      
      if (garments.accessory_2) {
        const acc2Data = await getGarmentData(garments.accessory_2);
        images.push(acc2Data.image);
        acc2Desc = acc2Data.description;
      }
      
      const prompt = await getPrompt('outfit_creator_pass3_accessories', {
        accessory1_description: acc1Desc,
        accessory2_description: acc2Desc
      });
      
      const resultBase64 = await generateWithGemini(prompt, images);
      if (!resultBase64) throw new Error('Pass 3 generation failed');
      
      currentImage = { base64: resultBase64, mimeType: 'image/png' };
    }
    
    // Save final result
    console.log(`[processJob] Saving final result`);
    const { storagePath, publicUrl } = await uploadToStorage(userId, jobId, currentImage.base64, 'final');
    
    await supabase
      .from('outfit_creator_results')
      .insert({
        job_id: jobId,
        user_id: userId,
        public_url: publicUrl,
        storage_path: storagePath,
        metadata: { passes_completed: currentPass, intermediate_images: intermediateImages }
      });
    
    // Mark job complete
    await supabase
      .from('outfit_creator_jobs')
      .update({
        status: 'completed',
        progress: 100,
        finished_at: new Date().toISOString(),
        intermediate_images: intermediateImages
      })
      .eq('id', jobId);
    
    console.log(`[processJob] ✅ Job ${jobId} completed successfully`);
    return jsonResponse({ success: true });
    
  } catch (error: any) {
    console.error(`[processJob] Error:`, error);
    
    await supabase
      .from('outfit_creator_jobs')
      .update({
        status: 'failed',
        error: error.message || 'Generation failed',
        finished_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    // Refund credits
    const creditCost = (job.metadata as any)?.credit_cost || 3;
    await refundCredits(userId, creditCost, 'outfit_creator_generation_failed');
    
    return jsonResponse({ error: error.message }, 500);
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, ...params } = await req.json();
    console.log('[outfit-creator] Action:', action);
    
    // Internal processing action (no auth needed)
    if (action === 'processJob') {
      return await processJob(params.jobId);
    }
    
    // All other actions require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    switch (action) {
      case 'createJob':
        return await handleCreateJob(user.id, params.baseModelId, params.garments, params.settings);
      
      case 'getJob':
        return await handleGetJob(user.id, params.jobId);
      
      case 'getResult':
        return await handleGetResult(user.id, params.jobId);
      
      case 'cancelJob':
        return await handleCancelJob(user.id, params.jobId);
      
      case 'analyzeGarment':
        return await handleAnalyzeGarment(params.sourceImageId);
      
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error('[outfit-creator] Error:', error);
    return jsonResponse({ error: error.message || 'Internal error' }, 500);
  }
});
