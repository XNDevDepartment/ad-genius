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

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }
});

const fetchWithRetry = async (url: string, init: RequestInit, attempts = 3): Promise<Response> => {
  for(let i = 0; i < attempts; i++){
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (i === attempts - 1 || res.status < 500) throw res;
    await new Promise((r)=>setTimeout(r, 250 * 2 ** i));
  }
  throw new Error('All retry attempts failed');
};
const b64ToBlob = (b64: string, mime = 'image/jpeg') => {
  const bin = atob(b64.split(',').pop() || '');
  const buf = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++)buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
};
async function waitForRun(threadId: string, runId: string) {
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
async function getLatestAssistantReply(threadId: string) {
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
async function sendImageAndRun({ threadId, assistantId, fileData, fileName, prompt }: {
  threadId: string;
  assistantId: string;
  fileData: string;
  fileName: string;
  prompt?: string;
}) {
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
async function converse({ threadId, content, assistantId }: {
  threadId: string;
  content: any;
  assistantId: string;
}) {
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

// Note: UGC image generation is now handled entirely by the ugc edge function
// This function only handles AI assistant conversations and image analysis

/*──────────────────────────  HTTP server  ───────────────────────────*/
serve(async (req)=>{
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