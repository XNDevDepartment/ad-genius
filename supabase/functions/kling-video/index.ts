import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();
    console.log(`[KLING-VIDEO] Action: ${action}, User: ${user.id}`);

    let result;
    switch (action) {
      case 'createVideoJob':
        result = await createVideoJob(supabaseClient, user.id, payload);
        break;
      case 'getVideoJob':
        result = await getVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      case 'cancelVideoJob':
        result = await cancelVideoJob(supabaseClient, user.id, payload.jobId);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[KLING-VIDEO] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createVideoJob(supabase: any, userId: string, payload: any) {
  const { source_image_id, ugc_image_id, prompt, duration = 5, model } = payload;

  console.log('[CREATE-JOB] Starting job creation', { userId, prompt, duration });

  // Calculate credit cost
  const creditCost = duration === 5 ? 5 : 10;

  // Check and deduct credits
  const { data: creditResult, error: creditError } = await supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: creditCost,
    p_reason: 'video_generation'
  });

  if (creditError || !creditResult?.success) {
    console.error('[CREATE-JOB] Credit deduction failed:', creditError || creditResult);
    return {
      success: false,
      error: creditResult?.error || 'Failed to deduct credits',
      current_balance: creditResult?.current_balance,
      required: creditCost
    };
  }

  console.log('[CREATE-JOB] Credits deducted:', creditCost);

  // Get source image URL
  let imageUrl = null;
  let imageId = null;

  if (source_image_id) {
    const { data: sourceImage } = await supabase
      .from('source_images')
      .select('public_url')
      .eq('id', source_image_id)
      .eq('user_id', userId)
      .single();
    
    imageUrl = sourceImage?.public_url;
    imageId = source_image_id;
  } else if (ugc_image_id) {
    const { data: ugcImage } = await supabase
      .from('ugc_images')
      .select('public_url')
      .eq('id', ugc_image_id)
      .eq('user_id', userId)
      .single();
    
    imageUrl = ugcImage?.public_url;
    imageId = ugc_image_id;
  }

  if (!imageUrl) {
    // Refund credits
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'video_generation_failed_no_image'
    });

    return {
      success: false,
      error: 'Source image not found'
    };
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('kling_jobs')
    .insert({
      user_id: userId,
      prompt,
      duration,
      model: model || 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
      image_url: imageUrl,
      source_image_id: source_image_id || null,
      ugc_image_id: ugc_image_id || null,
      status: 'queued',
      metadata: { credit_cost: creditCost }
    })
    .select()
    .single();

  if (jobError) {
    console.error('[CREATE-JOB] Failed to create job:', jobError);
    // Refund credits
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'video_generation_failed_job_creation'
    });

    return {
      success: false,
      error: 'Failed to create job record'
    };
  }

  console.log('[CREATE-JOB] Job created:', job.id);

  // Start processing in background
  processVideoJobAsync(supabase, job.id);

  return {
    success: true,
    jobId: job.id,
    status: 'queued'
  };
}

async function processVideoJobAsync(supabase: any, jobId: string) {
  try {
    console.log('[PROCESS-JOB] Starting processing for job:', jobId);

    // Get job details
    const { data: job } = await supabase
      .from('kling_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      console.error('[PROCESS-JOB] Job not found:', jobId);
      return;
    }

    // Update status to processing
    await supabase
      .from('kling_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Call FAL.ai API
    const FAL_KEY = Deno.env.get('FAL_KEY');
    if (!FAL_KEY) {
      throw new Error('FAL_KEY not configured');
    }

    console.log('[PROCESS-JOB] Calling FAL.ai API');

    const falResponse = await fetch(`https://queue.fal.run/${job.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: job.image_url,
        prompt: job.prompt,
        duration: job.duration,
        aspect_ratio: '16:9'
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      throw new Error(`FAL.ai API error: ${falResponse.status} - ${errorText}`);
    }

    const falData = await falResponse.json();
    const requestId = falData.request_id;

    console.log('[PROCESS-JOB] FAL.ai request submitted:', requestId);

    // Update job with request ID
    await supabase
      .from('kling_jobs')
      .update({ request_id: requestId })
      .eq('id', jobId);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    let videoUrl = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://queue.fal.run/${job.model}/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
        },
      });

      const statusData = await statusResponse.json();

      if (statusData.status === 'COMPLETED') {
        videoUrl = statusData.output?.video?.url;
        console.log('[PROCESS-JOB] Video generation completed:', videoUrl);
        break;
      } else if (statusData.status === 'FAILED') {
        throw new Error('Video generation failed: ' + JSON.stringify(statusData.error));
      }

      attempts++;
      console.log(`[PROCESS-JOB] Polling attempt ${attempts}/${maxAttempts}, status: ${statusData.status}`);
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    // Download video
    console.log('[PROCESS-JOB] Downloading video from:', videoUrl);
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.arrayBuffer();

    // Upload to Supabase Storage
    const videoPath = `kling/${job.user_id}/${jobId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(videoPath, videoBlob, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      throw new Error('Failed to upload video: ' + uploadError.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(videoPath);

    console.log('[PROCESS-JOB] Video uploaded successfully:', publicUrl);

    // Update job with completion
    await supabase
      .from('kling_jobs')
      .update({
        status: 'completed',
        video_url: publicUrl,
        video_path: videoPath,
        finished_at: new Date().toISOString(),
        video_size_bytes: videoBlob.byteLength,
        video_duration: job.duration
      })
      .eq('id', jobId);

    console.log('[PROCESS-JOB] Job completed successfully:', jobId);

  } catch (error) {
    console.error('[PROCESS-JOB] Error processing job:', error);

    // Update job with error
    await supabase
      .from('kling_jobs')
      .update({
        status: 'failed',
        error: { message: error.message, stack: error.stack },
        finished_at: new Date().toISOString(),
        retry_count: supabase.sql`retry_count + 1`
      })
      .eq('id', jobId);

    // Refund credits
    const { data: job } = await supabase
      .from('kling_jobs')
      .select('user_id, metadata')
      .eq('id', jobId)
      .single();

    if (job?.metadata?.credit_cost) {
      await supabase.rpc('refund_user_credits', {
        p_user_id: job.user_id,
        p_amount: job.metadata.credit_cost,
        p_reason: 'video_generation_failed'
      });
    }
  }
}

async function getVideoJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('kling_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { success: false, error: 'Job not found' };
  }

  return { success: true, job };
}

async function cancelVideoJob(supabase: any, userId: string, jobId: string) {
  const { data: job } = await supabase
    .from('kling_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return { success: false, error: 'Cannot cancel completed or failed job' };
  }

  // Update status
  await supabase
    .from('kling_jobs')
    .update({ 
      status: 'canceled',
      finished_at: new Date().toISOString()
    })
    .eq('id', jobId);

  // Refund credits if not yet processing
  if (job.status === 'queued' && job.metadata?.credit_cost) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: job.metadata.credit_cost,
      p_reason: 'video_generation_canceled'
    });
  }

  return { success: true };
}
