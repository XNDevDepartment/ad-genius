
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobCreateRequest {
  prompt: string;
  settings: {
    size?: string;
    quality?: string;
    numberOfImages?: number;
    format?: string;
  };
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hash function for idempotency
async function generateContentHash(userId: string, prompt: string, settings: any): Promise<string> {
  const content = `${userId}-${prompt}-${JSON.stringify(settings)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function processImageGeneration(jobId: string) {
  try {
    console.log(`Processing job ${jobId}`);
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('image_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Failed to get job:', jobError);
      return;
    }

    // Update status to in_progress
    await supabase
      .from('image_jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId);

    // Call OpenAI Images API
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: job.prompt,
        n: job.settings.numberOfImages || 1,
        size: job.settings.size || '1024x1024',
        quality: job.settings.quality || 'standard',
        response_format: 'b64_json'
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const imageData = openaiData.data[0];

    // Convert base64 to blob
    const imageBuffer = Uint8Array.from(atob(imageData.b64_json), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const fileName = `${jobId}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(`jobs/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(`jobs/${fileName}`);

    // Update job with success
    const { error: updateError } = await supabase
      .from('image_jobs')
      .update({
        status: 'succeeded',
        output_url: urlData.publicUrl
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job success:', updateError);
    } else {
      console.log(`Job ${jobId} completed successfully`);
    }

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Update job with error
    await supabase
      .from('image_jobs')
      .update({
        status: 'failed',
        error: error.message
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Get user from auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user's auth token
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route handlers
    if (req.method === 'POST' && path === '/image-jobs') {
      // Create new job
      const body: JobCreateRequest = await req.json();
      
      // Generate content hash for idempotency
      const contentHash = await generateContentHash(user.id, body.prompt, body.settings);
      
      // Check if job already exists with this hash
      const { data: existingJob } = await supabase
        .from('image_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_hash', contentHash)
        .eq('status', 'succeeded')
        .single();

      if (existingJob) {
        return new Response(JSON.stringify({ job: existingJob, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create new job
      const { data: newJob, error: createError } = await supabase
        .from('image_jobs')
        .insert({
          user_id: user.id,
          prompt: body.prompt,
          settings: body.settings,
          content_hash: contentHash,
          status: 'queued'
        })
        .select()
        .single();

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Start processing in background (don't await)
      processImageGeneration(newJob.id);

      return new Response(JSON.stringify({ job: newJob }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET' && path.startsWith('/image-jobs/')) {
      // Get specific job
      const jobId = path.split('/')[2];
      
      const { data: job, error: jobError } = await supabaseClient
        .from('image_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET' && path === '/image-jobs') {
      // List user's jobs
      const { data: jobs, error: jobsError } = await supabaseClient
        .from('image_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) {
        return new Response(JSON.stringify({ error: jobsError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ jobs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in image-jobs function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
