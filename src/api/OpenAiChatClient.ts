import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function callEdgeFunction(functionName: string, payload: any, retryCount = 0): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'Function call failed');
    }

    return data;
  } catch (error) {
    console.error(`Edge function call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return callEdgeFunction(functionName, payload, retryCount + 1);
    }
    
    throw error;
  }
}

export async function startConversationAPI(assistantId: string) {
  if (!assistantId) {
    throw new Error('Assistant ID is required');
  }

  console.log('Starting conversation with new-openai-chat...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'createThread'
  });

  return result;
}

export async function converse(threadId: string, content: any, assistantId: string) {
  if (!threadId || !assistantId) {
    throw new Error('Thread ID and Assistant ID are required');
  }

  console.log('Using new-openai-chat converse...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'converse',
    threadId,
    content,
    assistantId
  });

  return result.reply;
}

export async function sendImageAndRun(
  threadId: string,
  assistantId: string,
  fileData: string,
  fileName: string,
  prompt?: string
) {
  if (!threadId || !assistantId || !fileData) {
    throw new Error('Thread ID, Assistant ID, and file data are required');
  }

  console.log('Using new-openai-chat sendImage...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'sendImage',
    threadId,
    assistantId,
    fileData,
    fileName,
    prompt
  });

  return result.reply;
}

export async function sendMultipleImagesAndRun(
  threadId: string,
  assistantId: string,
  images: Array<{ fileData: string; fileName: string }>,
  prompt?: string
) {
  if (!threadId || !assistantId || !images || images.length === 0) {
    throw new Error('Thread ID, Assistant ID, and images are required');
  }

  console.log('Using new-openai-chat sendMultipleImages...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'sendMultipleImages',
    threadId,
    assistantId,
    images,
    prompt
  });

  return result.reply;
}

export async function createImageJob(
  prompt: string,
  settings: {
    number?: number;
    size?: string;
    quality?: string;
    output_format?: string;
  } = {},
  sourceImageId?: string
) {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  if (prompt.length > 4000) {
    throw new Error('Prompt is too long. Maximum length is 4000 characters.');
  }

  console.log('Creating image job...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'createImageJob',
    prompt,
    settings,
    sourceImageId
  });

  return result;
}

export async function generateImagesFromBase(
  baseFileData: string,
  prompt: string,
  options: {
    number?: number;
    size?: string;
    quality?: string;
    output_format?: string;
    input_fidelity?: string;
  } = {},
  jobId?: string
) {
  if (!baseFileData || !prompt) {
    throw new Error('Base file data and prompt are required');
  }

  if (prompt.length > 4000) {
    throw new Error('Prompt is too long. Maximum length is 4000 characters.');
  }

  if(options.number && options.number > 3){
    toast.error('Apenas pode gerar 3 imagens em simultâneo');
    throw new Error('User asked to generate more than 3 images');
  }

  console.log('Using new-openai-chat generateImages...');
  const imageResult = await callEdgeFunction('new-openai-chat', {
    action: 'generateImages',
    baseFileData,
    prompt,
    options: {
      ...options,
      input_fidelity: 'high'
    },
    jobId
  });

  return imageResult.images;
}