import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
async function generateImages({ baseFileData, prompt, options }) {
  if (!prompt || prompt.length > 4000) throw new Error('Invalid prompt');
  const safePrompt = prompt.replace(/[<>]/g, '');
  const tasks = Array.from({
    length: options.number ?? 1
  }, async ()=>{
    // Convert base64 to blob
    const byteString = atob(baseFileData.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for(let i = 0; i < byteString.length; i++){
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([
      ab
    ], {
      type: 'image/jpeg'
    });
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', blob);
    form.append('prompt', safePrompt);
    form.append('size', options.size ?? '1024x1024');
    form.append('quality', options.quality ?? 'medium');
    form.append('output_format', options.output_format ?? 'png');
    if (options.input_fidelity) {
      form.append('input_fidelity', options.input_fidelity);
    }
    const { data } = await fetchWithRetry(`${OPENAI_BASE}/images/edits`, {
      method: 'POST',
      headers: {
        ...ASSISTANTS_BETA,
        Authorization: `Bearer ${openAIApiKey}`
      },
      body: form
    }).then((r)=>r.json());
    return data[0].b64_json;
  });
  return json({
    images: await Promise.all(tasks)
  });
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
      case 'generateImages':
        return await generateImages(params);
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
