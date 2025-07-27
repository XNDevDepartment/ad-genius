import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log(`Processing action: ${action}`);

    switch (action) {
      case 'startConversation':
        return await handleStartConversation(params);
      case 'converse':
        return await handleConverse(params);
      case 'uploadFile':
        return await handleUploadFile(params);
      case 'generateImages':
        return await handleGenerateImages(params);
      case 'fastConverse':
        return await handleFastConverse(params);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Optimized fast conversation handler with streaming support
async function handleFastConverse({ threadId, content, assistantId }: { 
  threadId: string; 
  content: any; 
  assistantId: string; 
}) {
  console.log('Starting fast converse...');
  
  if (!threadId || !assistantId) {
    throw new Error('Missing required parameters');
  }

  // Use Promise.all for parallel execution where possible
  const [messageResponse, runResponse] = await Promise.all([
    // Add user message
    fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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
    }),
    // Prepare run creation (we'll execute this after message is added)
    Promise.resolve(null)
  ]);

  if (!messageResponse.ok) {
    throw new Error('Failed to add message to thread');
  }

  // Create run immediately after message is added
  const runCreateResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      assistant_id: assistantId,
      // Add streaming support for faster responses
      stream: false
    }),
  });

  if (!runCreateResponse.ok) {
    throw new Error('Failed to create run');
  }

  const { id: runId } = await runCreateResponse.json();
  console.log(`Created run: ${runId}`);

  // Optimized run waiting with shorter intervals
  await waitForRunOptimized(threadId, runId);

  const reply = await getLatestAssistantReply(threadId);

  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStartConversation({ assistantId }: { assistantId: string }) {
  console.log('Starting conversation...');
  
  // Create thread
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json',
    },
  });
  
  if (!threadResponse.ok) {
    throw new Error('Failed to create thread');
  }

  const { id: threadId } = await threadResponse.json();
  console.log(`Created thread: ${threadId}`);

  // Add initial message and create run in parallel
  const [messageResponse] = await Promise.all([
    fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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
    })
  ]);

  if (!messageResponse.ok) {
    throw new Error('Failed to add initial message');
  }

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

  if (!runResponse.ok) {
    throw new Error('Failed to create initial run');
  }

  const { id: runId } = await runResponse.json();
  await waitForRunOptimized(threadId, runId);

  // Get latest response
  const reply = await getLatestAssistantReply(threadId);

  return new Response(
    JSON.stringify({ threadId, reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConverse({ threadId, content, assistantId }: { threadId: string; content: any; assistantId: string }) {
  return handleFastConverse({ threadId, content, assistantId });
}

async function handleUploadFile({ fileData, fileName }: { fileData: string; fileName: string }) {
  console.log('Uploading file...');
  
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

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const { id } = await response.json();
  return new Response(
    JSON.stringify({ fileId: id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerateImages({ baseFileData, prompt, options }: { 
  baseFileData: string; 
  prompt: string; 
  options: any; 
}) {
  console.log('Generating images...');
  
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
    form.append('model', 'dall-e-2');
    form.append('image', blob);
    form.append('prompt', sanitizedPrompt);
    form.append('size', options.size || '1024x1024');
    form.append('response_format', 'b64_json');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: form,
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('Image generation error:', error);
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

// Optimized run waiting with shorter polling intervals
async function waitForRunOptimized(threadId: string, runId: string, maxWaitTime = 60000) {
  const startTime = Date.now();
  let pollInterval = 500; // Start with 500ms
  
  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to check run status');
    }

    const data = await response.json();
    console.log(`Run status: ${data.status}`);
    
    if (data.status === 'completed') {
      console.log('Run completed successfully');
      break;
    }
    
    if (['failed', 'cancelled', 'expired'].includes(data.status)) {
      throw new Error(`Run failed: ${data.status}`);
    }
    
    // Gradually increase poll interval to reduce API calls
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    pollInterval = Math.min(pollInterval * 1.1, 2000); // Max 2 seconds
  }
  
  if (Date.now() - startTime >= maxWaitTime) {
    throw new Error('Run timeout exceeded');
  }
}

async function getLatestAssistantReply(threadId: string) {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?role=assistant&limit=1&order=desc`, {
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get assistant reply');
  }

  const { data } = await response.json();
  return data[0]?.content?.[0]?.text?.value ?? '';
}