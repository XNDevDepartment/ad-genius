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

  console.log('Starting conversation with optimized function...');
  const result = await callEdgeFunction('new-open-ai', {
    action: 'startConversation',
    assistantId
  });

  return result;
}

export async function fastConverse(threadId: string, content: any, assistantId: string) {
  if (!threadId || !assistantId) {
    throw new Error('Thread ID and Assistant ID are required');
  }

  console.log('Using fast converse...');
  const result = await callEdgeFunction('new-open-ai', {
    action: 'fastConverse',
    threadId,
    content,
    assistantId
  });

  return result.reply;
}

export async function converse(threadId: string, content: any, assistantId: string) {
  if (!threadId || !assistantId) {
    throw new Error('Thread ID and Assistant ID are required');
  }

  console.log('Using optimized converse...');
  const result = await callEdgeFunction('new-open-ai', {
    action: 'converse',
    threadId,
    content,
    assistantId
  });

  return result.reply;
}

export async function uploadFile(file: File) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG and PNG are supported.');
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File size too large. Maximum size is 10MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await callEdgeFunction('new-open-ai', {
          action: 'uploadFile',
          fileData: reader.result as string,
          fileName: file.name
        });
        resolve(result.fileId);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
}

export async function generateImagesFromBase(
  baseFile: File,
  prompt: string,
  options: {
    number?: number;
    quality?: string;
    size?: string;
    output_format?: string;
  } = {}
) {
  if (!baseFile || !prompt) {
    throw new Error('Base file and prompt are required');
  }

  if (prompt.length > 4000) {
    throw new Error('Prompt is too long. Maximum length is 4000 characters.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await callEdgeFunction('new-open-ai', {
          action: 'generateImages',
          baseFileData: reader.result as string,
          prompt,
          options
        });
        resolve(result.images);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(baseFile);
  });
}