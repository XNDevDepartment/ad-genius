import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const GEMINI_MODEL = "gemini-3-pro-image-preview";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: any, timeout = 120000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Fallback prompts for different genders
const FALLBACK_PROMPT_MALE = `Create a professional fashion photography composition showing a male model wearing the garment from the reference image.

GARMENT REFERENCE:
- Study the garment design, patterns, colors, and fabric details from the reference image
- Reproduce these exact characteristics in the final image

MODEL SPECIFICATIONS:
- Body type: athletic fit
- Pose style: natural professional stance
- Skin tone: natural

STYLING DIRECTION:
- Dress the model in a complete, professionally styled outfit
- The reference garment should be the hero piece
- Add appropriate coordinating pieces (pants, shoes, accessories) as needed for a polished look
- Ensure all garments fit naturally on the model's body

PHOTOGRAPHY STYLE:
- Professional e-commerce/catalog photography aesthetic
- Studio lighting with soft, even illumination
- Clean white or light neutral background
- Sharp focus emphasizing fabric texture and garment details
- Natural, confident modeling posture
- Commercial-quality resolution suitable for retail use

OUTPUT REQUIREMENTS:
- Full-body or three-quarter shot showing the complete outfit
- The reference garment must be clearly visible and accurately represented
- Professional styling appropriate for fashion retail presentation`;

const FALLBACK_PROMPT_FEMALE = `Create a professional fashion photography composition showing a female model wearing the garment from the reference image.

GARMENT REFERENCE:
- Study the garment design, patterns, colors, and fabric details from the reference image
- Reproduce these exact characteristics in the final image

MODEL SPECIFICATIONS:
- Body type: athletic fit
- Pose style: natural professional stance
- Skin tone: natural

STYLING DIRECTION:
- Dress the model in a complete, professionally styled outfit
- The reference garment should be the hero piece
- Add appropriate coordinating pieces (pants, shoes, accessories) as needed for a polished look
- Ensure all garments fit naturally on the model's body

PHOTOGRAPHY STYLE:
- Professional e-commerce/catalog photography aesthetic
- Studio lighting with soft, even illumination
- Clean white or light neutral background
- Sharp focus emphasizing fabric texture and garment details
- Natural, confident modeling posture
- Commercial-quality resolution suitable for retail use

OUTPUT REQUIREMENTS:
- Full-body or three-quarter shot showing the complete outfit
- The reference garment must be clearly visible and accurately represented
- Professional styling appropriate for fashion retail presentation`;

// Generate outfit swap image using Lovable AI
async function generateOutfitSwapImage(
  baseModelUrl: string,
  garmentUrl: string,
  baseModel: any
): Promise<string> {
  console.log('Starting outfit swap image generation...');
  console.log('Base model URL:', baseModelUrl);
  console.log('Garment URL:', garmentUrl);

  const isMale = baseModel.gender?.toLowerCase() === 'male';
  const fallbackPrompt = isMale ? FALLBACK_PROMPT_MALE : FALLBACK_PROMPT_FEMALE;
  
  const customPrompt = baseModel.metadata?.custom_prompt || fallbackPrompt;

  console.log('Using model:', GEMINI_MODEL);

  try {
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: customPrompt },
              { type: 'image_url', image_url: { url: baseModelUrl } },
              { type: 'image_url', image_url: { url: garmentUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    }, 120000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error response:', errorText);
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT: AI service is currently at capacity. Please try again in a few moments.');
      } else if (response.status === 402) {
        throw new Error('QUOTA_EXCEEDED: AI service quota exceeded. Please contact support.');
      }
      
      throw new Error(`Lovable AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    if (!data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      const finishReason = data.choices?.[0]?.finish_reason;
      
      if (finishReason === 'SAFETY' || finishReason === 'IMAGE_OTHER') {
        throw new Error('SAFETY_FILTER: Unable to generate image for this garment. The content may have been flagged by our safety filters. Try a different garment or adjust the description.');
      }
      
      console.error('No image in Lovable AI response:', JSON.stringify(data));
      throw new Error('No image generated. The request may have been filtered or rejected.');
    }

    const base64Image = data.choices[0].message.images[0].image_url.url;
    console.log('Successfully received base64 image from Lovable AI');
    
    return base64Image;
  } catch (error) {
    console.error('Error in generateOutfitSwapImage:', error);
    throw error;
  }
}

// Process a single outfit swap job
async function processOutfitSwap(jobId: string): Promise<void> {
  console.log(`Starting to process outfit swap job: ${jobId}`);

  try {
    // Update job status to processing
    const { error: updateError } = await supabase
      .from('outfit_swap_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', jobId);

    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('outfit_swap_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    console.log('Job details:', job);

    // Fetch base model
    const { data: baseModel, error: modelError } = await supabase
      .from('outfit_swap_base_models')
      .select('*')
      .eq('id', job.base_model_id)
      .single();

    if (modelError || !baseModel) {
      throw new Error(`Base model not found: ${modelError?.message}`);
    }

    console.log('Base model:', baseModel);

    // Fetch garment
    const { data: garment, error: garmentError } = await supabase
      .from('source_images')
      .select('*')
      .eq('id', job.source_garment_id)
      .single();

    if (garmentError || !garment) {
      throw new Error(`Garment not found: ${garmentError?.message}`);
    }

    console.log('Garment:', garment);

    // Update progress
    await supabase
      .from('outfit_swap_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

    // Generate the outfit swap image
    const base64Image = await generateOutfitSwapImage(
      baseModel.public_url,
      garment.public_url,
      baseModel
    );

    console.log('Image generated successfully');

    // Update progress
    await supabase
      .from('outfit_swap_jobs')
      .update({ progress: 60 })
      .eq('id', jobId);

    // Convert base64 to blob
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${job.user_id}/${jobId}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('Image uploaded to storage:', fileName);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Update progress
    await supabase
      .from('outfit_swap_jobs')
      .update({ progress: 90 })
      .eq('id', jobId);

    // Save result
    const { data: result, error: resultError } = await supabase
      .from('outfit_swap_results')
      .insert({
        job_id: jobId,
        user_id: job.user_id,
        public_url: publicUrl,
        storage_path: fileName,
        metadata: {
          base_model_id: job.base_model_id,
          garment_id: job.source_garment_id
        }
      })
      .select()
      .single();

    if (resultError) {
      throw new Error(`Failed to save result: ${resultError.message}`);
    }

    console.log('Result saved:', result);

    // Update job status to completed
    const { error: completeError } = await supabase
      .from('outfit_swap_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        progress: 100
      })
      .eq('id', jobId);

    if (completeError) {
      throw new Error(`Failed to complete job: ${completeError.message}`);
    }

    // Update batch progress if this job is part of a batch
    if (job.batch_id) {
      const { data: batchJobs } = await supabase
        .from('outfit_swap_jobs')
        .select('status')
        .eq('batch_id', job.batch_id);

      const completed = batchJobs?.filter(j => j.status === 'completed').length || 0;
      const failed = batchJobs?.filter(j => j.status === 'failed').length || 0;
      const total = batchJobs?.length || 0;

      await supabase
        .from('outfit_swap_batches')
        .update({
          completed_jobs: completed,
          failed_jobs: failed,
          status: completed + failed === total ? 'completed' : 'processing'
        })
        .eq('id', job.batch_id);
    }

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorType = 'generation_error';
    let shouldRefund = false;

    // Classify error type
    if (errorMessage.includes('SAFETY_FILTER')) {
      errorType = 'safety_filter';
      shouldRefund = true;
    } else if (errorMessage.includes('RATE_LIMIT')) {
      errorType = 'rate_limit';
      shouldRefund = true;
    } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
      errorType = 'quota_exceeded';
      shouldRefund = true;
    }

    // Update job status to failed
    await supabase
      .from('outfit_swap_jobs')
      .update({
        status: 'failed',
        error: errorMessage,
        finished_at: new Date().toISOString(),
        metadata: { error_type: errorType }
      })
      .eq('id', jobId);

    // Update batch if needed
    const { data: job } = await supabase
      .from('outfit_swap_jobs')
      .select('batch_id, user_id')
      .eq('id', jobId)
      .single();

    if (job?.batch_id) {
      const { data: batchJobs } = await supabase
        .from('outfit_swap_jobs')
        .select('status')
        .eq('batch_id', job.batch_id);

      const completed = batchJobs?.filter(j => j.status === 'completed').length || 0;
      const failed = batchJobs?.filter(j => j.status === 'failed').length || 0;
      const total = batchJobs?.length || 0;

      await supabase
        .from('outfit_swap_batches')
        .update({
          completed_jobs: completed,
          failed_jobs: failed,
          status: completed + failed === total ? (failed === total ? 'failed' : 'completed') : 'processing'
        })
        .eq('id', job.batch_id);
    }

    // Refund credits if appropriate
    if (shouldRefund && job?.user_id) {
      try {
        await supabase.rpc('refund_user_credits', {
          p_user_id: job.user_id,
          p_amount: 1,
          p_reason: `outfit_swap_refund_${errorType}`
        });
        console.log(`Refunded 1 credit to user ${job.user_id} for ${errorType}`);
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError);
      }
    }

    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log('Action:', action, 'Params:', params);

    // Get user ID from auth header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'createJob': {
        const { sourcePersonId, sourceGarmentId, settings = {} } = params;

        // Deduct credits
        const { data: deductResult, error: deductError } = await supabase.rpc('deduct_user_credits', {
          p_user_id: user.id,
          p_amount: 1,
          p_reason: 'outfit_swap'
        });

        if (deductError || !deductResult?.success) {
          return new Response(
            JSON.stringify({ error: 'Insufficient credits' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create job
        const { data: job, error: jobError } = await supabase
          .from('outfit_swap_jobs')
          .insert({
            user_id: user.id,
            source_person_id: sourcePersonId,
            source_garment_id: sourceGarmentId,
            base_model_id: sourcePersonId,
            status: 'queued',
            settings
          })
          .select()
          .single();

        if (jobError) {
          return new Response(
            JSON.stringify({ error: jobError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process job in background
        EdgeRuntime.waitUntil(processOutfitSwap(job.id));

        return new Response(
          JSON.stringify({ success: true, job }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createBatchJob': {
        const { baseModelId, garmentIds, settings = {} } = params;

        if (!Array.isArray(garmentIds) || garmentIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'garmentIds must be a non-empty array' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const totalCost = garmentIds.length;

        // Deduct credits
        const { data: deductResult, error: deductError } = await supabase.rpc('deduct_user_credits', {
          p_user_id: user.id,
          p_amount: totalCost,
          p_reason: 'outfit_swap_batch'
        });

        if (deductError || !deductResult?.success) {
          return new Response(
            JSON.stringify({ error: 'Insufficient credits', required: totalCost }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create batch
        const { data: batch, error: batchError } = await supabase
          .from('outfit_swap_batches')
          .insert({
            user_id: user.id,
            base_model_id: baseModelId,
            total_jobs: garmentIds.length,
            status: 'queued',
            metadata: settings
          })
          .select()
          .single();

        if (batchError) {
          return new Response(
            JSON.stringify({ error: batchError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create jobs for each garment
        const jobs = [];
        for (const garmentId of garmentIds) {
          const { data: job, error: jobError } = await supabase
            .from('outfit_swap_jobs')
            .insert({
              user_id: user.id,
              batch_id: batch.id,
              base_model_id: baseModelId,
              source_garment_id: garmentId,
              status: 'queued',
              settings,
              total_garments: 1,
              completed_garments: 0
            })
            .select()
            .single();

          if (!jobError && job) {
            jobs.push(job);
            // Process each job in background
            EdgeRuntime.waitUntil(processOutfitSwap(job.id));
          }
        }

        // Update batch to processing
        await supabase
          .from('outfit_swap_batches')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', batch.id);

        return new Response(
          JSON.stringify({ success: true, batch, jobs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelJob': {
        const { jobId } = params;

        const { error: cancelError } = await supabase
          .from('outfit_swap_jobs')
          .update({ status: 'canceled' })
          .eq('id', jobId)
          .eq('user_id', user.id);

        if (cancelError) {
          return new Response(
            JSON.stringify({ error: cancelError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelBatch': {
        const { batchId } = params;

        // Update batch status
        await supabase
          .from('outfit_swap_batches')
          .update({ status: 'canceled' })
          .eq('id', batchId)
          .eq('user_id', user.id);

        // Cancel all queued/processing jobs in batch
        await supabase
          .from('outfit_swap_jobs')
          .update({ status: 'canceled' })
          .eq('batch_id', batchId)
          .eq('user_id', user.id)
          .in('status', ['queued', 'processing']);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getJob': {
        const { jobId } = params;

        const { data: job, error: jobError } = await supabase
          .from('outfit_swap_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single();

        if (jobError) {
          return new Response(
            JSON.stringify({ error: jobError.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ job }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getResults': {
        const { jobId } = params;

        const { data: results, error: resultsError } = await supabase
          .from('outfit_swap_results')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        if (resultsError) {
          return new Response(
            JSON.stringify({ error: resultsError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getBatch': {
        const { batchId } = params;

        const { data: batch, error: batchError } = await supabase
          .from('outfit_swap_batches')
          .select('*')
          .eq('id', batchId)
          .eq('user_id', user.id)
          .single();

        if (batchError) {
          return new Response(
            JSON.stringify({ error: batchError.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ batch }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'retryJob': {
        const { jobId } = params;

        // Get original job
        const { data: originalJob, error: jobError } = await supabase
          .from('outfit_swap_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single();

        if (jobError || !originalJob) {
          return new Response(
            JSON.stringify({ error: 'Job not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new job with same settings (no credit deduction for retry)
        const retryCount = (originalJob.metadata?.retry_count || 0) + 1;
        
        const { data: newJob, error: createError } = await supabase
          .from('outfit_swap_jobs')
          .insert({
            user_id: user.id,
            batch_id: originalJob.batch_id,
            base_model_id: originalJob.base_model_id,
            source_garment_id: originalJob.source_garment_id,
            status: 'queued',
            settings: originalJob.settings,
            total_garments: originalJob.total_garments,
            completed_garments: 0,
            metadata: { ...originalJob.metadata, retry_count: retryCount, original_job_id: jobId }
          })
          .select()
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process new job in background
        EdgeRuntime.waitUntil(processOutfitSwap(newJob.id));

        return new Response(
          JSON.stringify({ success: true, job: newJob }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in outfit-swap function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
