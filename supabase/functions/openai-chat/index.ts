
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  // Create thread
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
  });
  
  const { id: threadId } = await threadResponse.json();

  // Add initial message
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'user',
      content: [{ type: 'text', text: 'START' }]
    }),
  });

  // Create and wait for run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assistant_id: assistantId }),
  });

  const { id: runId } = await runResponse.json();
  await waitForRun(threadId, runId);

  // Get latest response
  const reply = await getLatestAssistantReply(threadId);

  return new Response(
    JSON.stringify({ threadId, reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConverse({ threadId, content, assistantId }: { threadId: string; content: any; assistantId: string }) {
  // Input validation
  if (!threadId || !assistantId) {
    throw new Error('Missing required parameters');
  }

  // Add user message
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'user',
      content: Array.isArray(content) ? content : [{ type: 'text', text: content }]
    }),
  });

  // Create and wait for run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assistant_id: assistantId }),
  });

  const { id: runId } = await runResponse.json();
  await waitForRun(threadId, runId);

  const reply = await getLatestAssistantReply(threadId);

  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUploadFile({ fileData, fileName }: { fileData: string; fileName: string }) {
  // Convert base64 to blob
  const byteString = atob(fileData.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/jpeg' });

  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('purpose', 'vision');

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
    body: form,
  });

  const { id } = await response.json();
  return new Response(
    JSON.stringify({ fileId: id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerateImages({ baseFileData, prompt, options }: { baseFileData: string; prompt: string; options: any }) {
  // Input validation and sanitization
  if (!prompt || prompt.length > 4000) {
    throw new Error('Invalid prompt');
  }

  const sanitizedPrompt = prompt.replace(/[<>]/g, ''); // Basic XSS prevention

  const calls = Array.from({ length: options.number || 1 }, async () => {
    // Convert base64 to blob
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

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: form,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error('Image generation failed');
    }

    const { data } = await res.json();
    return data[0].b64_json;
  });

  const images = await Promise.all(calls);

  return new Response(
    JSON.stringify({ images }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function waitForRun(threadId: string, runId: string) {
  while (true) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    const data = await response.json();
    
    if (data.status === 'completed') break;
    if (['failed', 'cancelled', 'expired'].includes(data.status)) {
      throw new Error(`Run failed: ${data.status}`);
    }
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function getLatestAssistantReply(threadId: string) {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?role=assistant&limit=1&order=desc`, {
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });
  
  const { data } = await response.json();
  return data[0]?.content?.[0]?.text?.value ?? '';
}
