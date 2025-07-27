import { supabase } from "@/integrations/supabase/client";

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

export async function generateImagesFromBase(
  baseFileData: File,
  prompt: string,
  options: {
    number?: number;
    size?: string;
    quality?: string;
    output_format?: string;
  } = {}
) {
  if (!baseFileData || !prompt) {
    throw new Error('Base file data and prompt are required');
  }

  if (prompt.length > 4000) {
    throw new Error('Prompt is too long. Maximum length is 4000 characters.');
  }

  console.log('Using new-openai-chat generateImages...');
  const result = await callEdgeFunction('new-openai-chat', {
    action: 'generateImages',
    baseFileData,
    prompt,
    options
  });

  return result.images;
}