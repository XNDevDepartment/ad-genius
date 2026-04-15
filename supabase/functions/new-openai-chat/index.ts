import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  createOpenAIClient,
  OPENAI_BASE,
  ASSISTANTS_BETA_HEADER as ASSISTANTS_BETA,
} from '../_shared/openai-client.ts';
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

// Supabase clients
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const openai = createOpenAIClient(openAIApiKey);

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }
});

const b64ToBlob = (b64: string, mime = 'image/jpeg') => {
  const bin = atob(b64.split(',').pop() || '');
  const buf = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++)buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
};
/*──────────────────────────  Action handlers  ───────────────────────────*/
async function createThread() {
  const threadId = await openai.createThread();
  return json({ threadId });
}

async function sendImageAndRun({ threadId, assistantId, fileData, fileName, prompt }: {
  threadId: string;
  assistantId: string;
  fileData: string;
  fileName: string;
  prompt?: string;
}) {
  const fileId = await openai.uploadFile(b64ToBlob(fileData), fileName);
  const content: any[] = [{ type: 'image_file', image_file: { file_id: fileId } }];
  if (prompt) content.push({ type: 'text', text: prompt });
  await openai.addMessage(threadId, content);
  const runId = await openai.createRun(threadId, assistantId);
  await openai.waitForRun(threadId, runId);
  const reply = await openai.getLatestReply(threadId);
  return json({ reply });
}

async function sendMultipleImagesAndRun({ threadId, assistantId, images, prompt }: {
  threadId: string;
  assistantId: string;
  images: Array<{ fileData: string; fileName: string }>;
  prompt?: string;
}) {
  const fileIds: string[] = [];
  for (const image of images) {
    const fileId = await openai.uploadFile(b64ToBlob(image.fileData), image.fileName);
    fileIds.push(fileId);
  }
  const content: any[] = fileIds.map((fileId) => ({ type: 'image_file', image_file: { file_id: fileId } }));
  if (prompt) content.push({ type: 'text', text: prompt });
  await openai.addMessage(threadId, content);
  const runId = await openai.createRun(threadId, assistantId);
  await openai.waitForRun(threadId, runId);
  const reply = await openai.getLatestReply(threadId);
  return json({ reply });
}

async function converse({ threadId, content, assistantId }: {
  threadId: string;
  content: any;
  assistantId: string;
}) {
  if (!threadId || !assistantId) throw new Error('Missing parameters');
  await openai.addMessage(threadId, content);
  const runId = await openai.createRun(threadId, assistantId);
  await openai.waitForRun(threadId, runId);
  const reply = await openai.getLatestReply(threadId);
  return json({ reply });
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
      case 'sendMultipleImages':
        return await sendMultipleImagesAndRun(params);
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