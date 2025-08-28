import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Create service role client for backend operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with user's auth token for RLS
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Invalid authentication token');
    }

    const { action, ...payload } = await req.json();

    switch (action) {
      case 'createImageJob':
        return await createImageJob(user.id, payload, supabaseService);
      case 'generateImages':
        return await generateImages(payload.jobId, supabaseService);
      case 'getJob':
        return await getJob(user.id, payload.jobId, supabaseClient);
      case 'getJobImages':
        return await getJobImages(user.id, payload.jobId, supabaseClient);
      case 'cancelJob':
        return await cancelJob(user.id, payload.jobId, supabaseService);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('UGC function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Fix the UGC function to use correct cost calculation
function calculateImageCost(settings: any): number {
  const qualityCosts = {
    'low': 1,
    'medium': 1.5,
    'hd': 2,
    'high': 2
  };
  
  const quality = settings.quality || 'high';
  return qualityCosts[quality] || 2;
}

async function createImageJob(userId: string, payload: any, supabase: any) {
  const { prompt, settings, source_image_id, idempotency_window_minutes = 60 } = payload;

  // Generate idempotency key
  const { data: keyResult } = await supabase.rpc('generate_idempotency_key', {
    p_user_id: userId,
    p_source_image_id: source_image_id || null,
    p_prompt: prompt,
    p_settings: settings
  });

  const idempotencyKey = keyResult;

  // Check for existing job within window
  const windowStart = new Date(Date.now() - idempotency_window_minutes * 60 * 1000);
  const { data: existingJob } = await supabase
    .from('image_jobs')
    .select('*, ugc_images(*)')
    .eq('content_hash', idempotencyKey)
    .gte('created_at', windowStart.toISOString())
    .single();

  if (existingJob) {
    const response = { jobId: existingJob.id, status: existingJob.status };
    if (existingJob.status === 'completed') {
      response.existingImages = existingJob.ugc_images.map((img: any) => ({
        url: img.public_url,
        prompt: existingJob.prompt
      }));
    }
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calculate cost
  const costPerImage = calculateImageCost(settings);
  const totalCost = costPerImage * (settings.number || 1);

  // Start transaction to reserve credits and create job
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('credits_balance')
    .eq('user_id', userId)
    .single();

  if (!subscriber || subscriber.credits_balance < totalCost) {
    throw new Error('Insufficient credits');
  }

  // Reserve credits
  const { data: creditResult } = await supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: totalCost,
    p_reason: 'reserve:image_job'
  });

  if (!creditResult.success) {
    throw new Error(creditResult.error);
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from('image_jobs')
    .insert({
      user_id: userId,
      prompt,
      settings,
      content_hash: idempotencyKey,
      total: settings.number || 1,
      progress: 0,
      completed: 0,
      failed: 0,
      status: 'queued'
    })
    .select()
    .single();

  if (jobError) {
    // Refund credits on failure
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: totalCost,
      p_reason: 'job_creation_failed'
    });
    throw new Error(jobError.message);
  }

  // Fire background worker using EdgeRuntime.waitUntil
  EdgeRuntime.waitUntil(generateImages(job.id, supabase));

  return new Response(JSON.stringify({ jobId: job.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateImages(jobId: string, supabase: any) {
  // Claim the job atomically
  const { data: job, error } = await supabase
    .from('image_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .in('status', ['queued', 'processing'])
    .select()
    .single();

  if (error || !job) {
    console.error('Failed to claim job:', error);
    return new Response(JSON.stringify({ error: 'Job not found or already processed' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Get source image if provided
    let sourceImageUrl = null;
    if (job.source_image_id) {
      const { data: sourceImage } = await supabase
        .from('source_images')
        .select('storage_path')
        .eq('id', job.source_image_id)
        .single();

      if (sourceImage) {
        const { data: signedUrl } = await supabase.storage
          .from('ugc-inputs')
          .createSignedUrl(sourceImage.storage_path, 3600);
        sourceImageUrl = signedUrl?.signedUrl;
      }
    }

    // Generate images
    for (let i = 0; i < job.total; i++) {
      try {
        await generateSingleImage(job, i, sourceImageUrl, supabase);
        completed++;
        
        // Update progress
        const progress = Math.floor((completed / job.total) * 100);
        await supabase
          .from('image_jobs')
          .update({
            completed,
            progress,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      } catch (error) {
        console.error(`Image ${i} generation failed:`, error);
        failed++;
        errors.push(error.message);
      }
    }

    // Finalize job
    const finalStatus = completed > 0 ? 'completed' : 'failed';
    const updateData: any = {
      status: finalStatus,
      completed,
      failed,
      progress: completed > 0 ? 100 : 0,
      finished_at: new Date().toISOString()
    };

    if (finalStatus === 'failed') {
      updateData.error = errors.join('; ');
    }

    await supabase
      .from('image_jobs')
      .update(updateData)
      .eq('id', jobId);

    // Handle credit refunds for failed images
    if (failed > 0) {
      const refundAmount = failed * calculateImageCost({ ...job.settings, number: 1 });
      await supabase.rpc('refund_user_credits', {
        p_user_id: job.user_id,
        p_amount: refundAmount,
        p_reason: 'failed_image_generation'
      });
    }

  } catch (error) {
    console.error('Job processing error:', error);
    await supabase
      .from('image_jobs')
      .update({
        status: 'failed',
        error: error.message,
        finished_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Refund all credits on complete failure - calculate total cost
    const totalCost = calculateImageCost(job.settings) * (job.settings.number || 1);
    await supabase.rpc('refund_user_credits', {
      p_user_id: job.user_id,
      p_amount: totalCost,
      p_reason: 'job_processing_failed'
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateSingleImage(job: any, index: number, sourceImageUrl: string | null, supabase: any) {
  const openaiPayload: any = {
    model: 'dall-e-3',
    prompt: job.prompt,
    size: job.settings.size || '1024x1024',
    quality: job.settings.quality || 'standard',
    response_format: 'b64_json'
  };

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(openaiPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const result = await response.json();
  const b64Data = result.data[0].b64_json;
  
  if (!b64Data) {
    throw new Error('No image data returned from OpenAI');
  }

  // Convert base64 to bytes
  const bytes = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
  
  // Upload to storage
  const storagePath = `${job.user_id}/${job.id}/${index}.png`;
  const { error: uploadError } = await supabase.storage
    .from('ugc')
    .upload(storagePath, bytes, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('ugc')
    .getPublicUrl(storagePath);

  // Save image record
  const { error: saveError } = await supabase
    .from('ugc_images')
    .insert({
      job_id: job.id,
      user_id: job.user_id,
      storage_path: storagePath,
      public_url: publicUrl.publicUrl,
      meta: {
        index,
        settings: job.settings,
        openai_response: result
      }
    });

  if (saveError) {
    throw new Error(`Failed to save image record: ${saveError.message}`);
  }
}

async function getJob(userId: string, jobId: string, supabase: any) {
  const { data: job, error } = await supabase
    .from('image_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error('Job not found');
  }

  return new Response(JSON.stringify({ job }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getJobImages(userId: string, jobId: string, supabase: any) {
  const { data: images, error } = await supabase
    .from('ugc_images')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch images');
  }

  return new Response(JSON.stringify({ images }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function cancelJob(userId: string, jobId: string, supabase: any) {
  const { data: job, error } = await supabase
    .from('image_jobs')
    .update({ status: 'canceled' })
    .eq('id', jobId)
    .eq('user_id', userId)
    .in('status', ['queued', 'processing'])
    .select()
    .single();

  if (error || !job) {
    throw new Error('Job not found or cannot be canceled');
  }

  // Refund reserved credits - calculate the cost based on remaining images
  const totalCost = calculateImageCost(job.settings) * (job.settings.number || 1);
  const usedCost = calculateImageCost(job.settings) * (job.completed || 0);
  const refundAmount = totalCost - usedCost;

  if (refundAmount > 0) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: refundAmount,
      p_reason: 'job_canceled'
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}