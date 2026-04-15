import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createOpenAIClient } from '../_shared/openai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = openAIApiKey ? createOpenAIClient(openAIApiKey) : null;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    switch (action) {
      case 'startConversation':
        return await handleStartConversation(params);
      case 'converse':
        return await handleConverse(params);
      case 'uploadFile':
        return await handleUploadFile(params);
      case 'generateImages':
        return await handleGenerateImages(params);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleStartConversation({ assistantId }: { assistantId: string }) {
  const threadId = await openai!.createThread();
  await openai!.addMessage(threadId, [{ type: 'text', text: 'START' }]);
  const runId = await openai!.createRun(threadId, assistantId);
  await openai!.waitForRun(threadId, runId);
  const reply = await openai!.getLatestReply(threadId);
  return new Response(
    JSON.stringify({ threadId, reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConverse({ threadId, content, assistantId }: { threadId: string; content: any; assistantId: string }) {
  if (!threadId || !assistantId) {
    throw new Error('Missing required parameters');
  }
  await openai!.addMessage(threadId, content);
  const runId = await openai!.createRun(threadId, assistantId);
  await openai!.waitForRun(threadId, runId);
  const reply = await openai!.getLatestReply(threadId);
  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUploadFile({ fileData, fileName }: { fileData: string; fileName: string }) {
  const byteString = atob(fileData.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/jpeg' });
  const id = await openai!.uploadFile(blob, fileName);
  return new Response(
    JSON.stringify({ fileId: id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerateImages({ baseFileData, prompt, options }: { baseFileData: string; prompt: string; options: any }) {
  if (!prompt || prompt.length > 4000) {
    throw new Error('Invalid prompt');
  }
  const sanitizedPrompt = prompt.replace(/[<>]/g, '');

  const calls = Array.from({ length: options.number || 1 }, async () => {
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
    form.append('prompt', sanitizedPrompt);
    form.append('size', options.size || '1024x1024');
    form.append('quality', options.quality || 'medium');
    form.append('output_format', options.output_format || 'png');

    const res = await openai!.editImage(form);
    if (!res.ok) throw new Error('Image generation failed');
    const { data } = await res.json();
    return data[0].b64_json;
  });

  const images = await Promise.all(calls);
  return new Response(
    JSON.stringify({ images }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

