import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// ─────────────────────────────────────────────────────────────────────────────
//  CORS & ENV
// ─────────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openAIApiKey) throw new Error('OPENAI_API_KEY env var missing');
// ─────────────────────────────────────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const OPENAI_BASE = 'https://api.openai.com/v1';
const ASSISTANTS_BETA = {
  'OpenAI-Beta': 'assistants=v2'
};

// Supabase clients
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const json = (data, status = 200)=>new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
const fetchWithRetry = async (url, init, attempts = 3)=>{
  for(let i = 0; i < attempts; i++){
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (i === attempts - 1 || res.status < 500) throw res;
    await new Promise((r)=>setTimeout(r, 250 * 2 ** i));
  }
};
const b64ToBlob = (b64, mime = 'image/jpeg')=>{
  const bin = atob(b64.split(',').pop());
  const buf = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++)buf[i] = bin.charCodeAt(i);
  return new Blob([
    buf
  ], {
    type: mime
  });
};
/*──────────────────────────  OpenAI helpers  ───────────────────────────*/ async function waitForRun(threadId, runId) {
  let delay = 200;
  while(true){
    const run = await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/runs/${runId}`, {
      headers: {
        ...ASSISTANTS_BETA,
        Authorization: `Bearer ${openAIApiKey}`
      }
    }).then((r)=>r.json());
    if (run.status === 'completed') return;
    if ([
      'failed',
      'cancelled',
      'expired'
    ].includes(run.status)) throw new Error(`Run ${run.status}`);
    await new Promise((r)=>setTimeout(r, delay));
    delay = Math.min(delay * 2, 1000);
  }
}
async function getLatestAssistantReply(threadId) {
  const { data } = await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/messages?role=assistant&limit=1&order=desc`, {
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`
    }
  }).then((r)=>r.json());
  return data[0]?.content?.[0]?.text?.value ?? '';
}
/*──────────────────────────  Action handlers  ───────────────────────────*/ async function createThread() {
  const res = await fetchWithRetry(`${OPENAI_BASE}/threads`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`
    }
  }).then((r)=>r.json());
  return json({
    threadId: res.id
  });
}
async function sendImageAndRun({ threadId, assistantId, fileData, fileName, prompt }) {
  // 1 — upload image
  const form = new FormData();
  form.append('file', b64ToBlob(fileData), fileName);
  form.append('purpose', 'vision');
  const { id: fileId } = await fetchWithRetry(`${OPENAI_BASE}/files`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`
    },
    body: form
  }).then((r)=>r.json());
  // 2 — add message referencing the image (and optional caption)
  await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'user',
      content: [
        {
          type: 'image_file',
          image_file: {
            file_id: fileId
          }
        },
        prompt ? {
          type: 'text',
          text: prompt
        } : null
      ].filter(Boolean)
    })
  });
  // 3 — run
  const { id: runId } = await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assistant_id: assistantId
    })
  }).then((r)=>r.json());
  await waitForRun(threadId, runId);
  const reply = await getLatestAssistantReply(threadId);
  return json({
    reply
  });
}
async function converse({ threadId, content, assistantId }) {
  if (!threadId || !assistantId) throw new Error('Missing parameters');
  await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'user',
      content: Array.isArray(content) ? content : [
        {
          type: 'text',
          text: content
        }
      ]
    })
  });
  const { id: runId } = await fetchWithRetry(`${OPENAI_BASE}/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      ...ASSISTANTS_BETA,
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assistant_id: assistantId
    })
  }).then((r)=>r.json());
  await waitForRun(threadId, runId);
  const reply = await getLatestAssistantReply(threadId);
  return json({
    reply
  });
}
// Generate deterministic content hash for idempotency
function generateContentHash(prompt: string, settings: any, sourceImageId?: string): string {
  const content = JSON.stringify({
    prompt: prompt.trim(),
    settings: {
      size: settings.size,
      quality: settings.quality,
      numberOfImages: settings.number,
      format: settings.output_format || 'png'
    },
    source_image_id: sourceImageId || null
  });
  
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

async function createImageJob({ prompt, settings, sourceImageId }, req: Request) {
  if (!prompt || prompt.length > 4000) throw new Error('Invalid prompt');

  // Auth user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const user = userData.user;

  // Generate content hash for idempotency
  const contentHash = generateContentHash(prompt, settings, sourceImageId);

  console.log('Creating image job:', {
    userId: user.id,
    contentHash,
    prompt: prompt.substring(0, 50) + '...'
  });

  // Check for existing job with same content hash
  const { data: existingJob } = await supabaseService
    .from('image_jobs')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .eq('content_hash', contentHash)
    .single();

  if (existingJob) {
    console.log('Found existing job:', existingJob.id, 'with status:', existingJob.status);
    
    // If job completed successfully, return existing results
    if (existingJob.status === 'completed') {
      const { data: existingImages } = await supabaseService
        .from('generated_images')
        .select('id, public_url, prompt, settings, created_at')
        .eq('job_id', existingJob.id)
        .order('created_at', { ascending: true });

      if (existingImages && existingImages.length > 0) {
        console.log('Returning existing completed job:', existingJob.id);
        return json({ 
          jobId: existingJob.id,
          status: 'completed',
          existingImages: existingImages.map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt,
            settings: img.settings,
            created_at: img.created_at,
          }))
        });
      }
    }
    
    // Reuse existing job but reset status
    await supabaseService
      .from('image_jobs')
      .update({ 
        status: 'queued',
        error: null 
      })
      .eq('id', existingJob.id);
      
    return json({ jobId: existingJob.id, status: 'queued' });
  }

  // Create new job
  const { data: newJob, error: jobError } = await supabaseService
    .from('image_jobs')
    .insert({
      user_id: user.id,
      prompt,
      settings: {
        ...settings,
        quality: settings.quality || 'high'
      },
      content_hash: contentHash,
      status: 'queued'
    })
    .select('id')
    .single();

  if (jobError) {
    console.error('Failed to create job:', jobError);
    throw new Error(`Failed to create image generation job: ${jobError.message}`);
  }

  console.log('Created new job:', newJob.id);
  return json({ jobId: newJob.id, status: 'queued' });
}

async function generateImages({ baseFileData, prompt, options, jobId }, req: Request) {
  if (!prompt || prompt.length > 4000) throw new Error('Invalid prompt');

  // Auth user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const user = userData.user;

  // Ensure subscriber exists and monthly reset
  const { data: existing } = await supabaseService
    .from('subscribers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  let subscriber = existing;
  if (!subscriber) {
    const { data: inserted } = await supabaseService
      .from('subscribers')
      .insert({ user_id: user.id, email: user.email, subscription_tier: 'Free', subscribed: false })
      .select('*')
      .single();
    subscriber = inserted;
  }
  const now = new Date();
  const needsReset = !subscriber?.last_reset_at ||
    new Date(subscriber.last_reset_at).getUTCMonth() !== now.getUTCMonth() ||
    new Date(subscriber.last_reset_at).getUTCFullYear() !== now.getUTCFullYear();
  const planAllowance = subscriber?.subscription_tier === 'Pro' ? 100 : (subscriber?.subscription_tier === 'Enterprise' ? Infinity : 30);
  if (subscriber?.subscription_tier !== 'Enterprise' && needsReset) {
    const allowance = planAllowance === Infinity ? 0 : planAllowance;
    const { data: updated } = await supabaseService
      .from('subscribers')
      .update({ credits_balance: allowance, last_reset_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('user_id', user.id)
      .select('*')
      .single();
    await supabaseService.from('credits_transactions').insert({
      user_id: user.id,
      amount: allowance,
      reason: 'monthly_grant',
      metadata: { tier: subscriber?.subscription_tier || 'Free' }
    });
    subscriber = updated;
  }

  // Enforce plan rules - TEMPORARILY DISABLED: Allow all users high quality
  const quality = options?.quality ?? 'medium';
  // Temporarily allow free users to generate high quality images
  // if (subscriber?.subscription_tier === 'Free' && quality === 'high') {
  //   return json({ error: 'Free plan limited to medium quality' }, 403);
  // }

  const count = Math.max(1, options?.number ?? 1);
  let totalCost = 0;

  // Check credits and admin status
  const { data: adminCheck, error: adminError } = await supabaseService.rpc('is_admin', {
    check_user_id: user.id
  });
  
  const isAdmin = adminCheck === true;
  
  // Check affordability for non-admin users (pre-check without deducting)
  if (!isAdmin) {
    const { data: cost, error: costError } = await supabaseService.rpc('get_image_credit_cost', {
      p_quality: quality,
      p_count: count,
    });
    if (costError) {
      return json({ error: 'Credit cost calculation failed' }, 500);
    }
    totalCost = Number(cost ?? 0);

    // Check if user can afford the generation
    const currentBalance = subscriber?.credits_balance || 0;
    if (currentBalance < totalCost) {
      return json({ error: 'Insufficient credits' }, 402);
    }
  }

  // Update job status to processing if jobId provided
  if (jobId) {
    await supabaseService
      .from('image_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);
  }

  try {
    const safePrompt = prompt.replace(/[<>]/g, '');
    const tasks = Array.from({ length: count }, async () => {
      const byteString = atob(baseFileData.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('image', blob);
      form.append('prompt', safePrompt);
      form.append('size', options?.size ?? '1024x1024');
      form.append('quality', quality);
      form.append('output_format', options?.output_format ?? 'png');
      form.append('input_fidelity', 'high');
      const { data } = await fetchWithRetry(`${OPENAI_BASE}/images/edits`, {
        method: 'POST',
        headers: { ...ASSISTANTS_BETA, Authorization: `Bearer ${openAIApiKey}` },
        body: form
      }).then((r) => r.json());
      return data[0].b64_json;
    });

    const images = await Promise.all(tasks);
    
    // Only deduct credits after successful generation for non-admin users
    if (!isAdmin && totalCost > 0) {
      const { data: deduction, error: deductionError } = await supabaseService.rpc('deduct_user_credits', {
        p_user_id: user.id,
        p_amount: totalCost,
        p_reason: 'image_generation',
      });
      if (deductionError || !(deduction as any)?.success) {
        console.error('Failed to deduct credits after successful generation:', deductionError);
        return json({ error: 'Payment processing failed after generation' }, 402);
      }
    }
    
    // Update job status to completed if jobId provided
    if (jobId) {
      await supabaseService
        .from('image_jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);
    }
    
    return json({ images });
  } catch (err) {
    // Update job status to failed if jobId provided
    if (jobId) {
      await supabaseService
        .from('image_jobs')
        .update({ 
          status: 'failed',
          error: err.message 
        })
        .eq('id', jobId);
    }
    
    // No refund needed since credits weren't deducted yet
    throw err;
  }

}
/*──────────────────────────  HTTP server  ───────────────────────────*/ serve(async (req)=>{
  // CORS pre-flight
  if (req.method === 'OPTIONS') return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
  let body;
  try {
    body = await req.json();
  } catch  {
    return json({
      error: 'Invalid JSON body'
    }, 400);
  }
  try {
    const { action, ...params } = body;
    switch(action){
      case 'createThread':
        return await createThread();
      case 'sendImage':
        return await sendImageAndRun(params);
      case 'converse':
        return await converse(params);
      case 'createImageJob':
        return await createImageJob(params, req);
      case 'generateImages':
        return await generateImages(params, req);
      default:
        return json({
          error: 'Invalid action'
        }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({
      error: 'Internal Server Error'
    }, 500);
  }
});
