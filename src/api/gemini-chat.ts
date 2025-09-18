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

export async function startGeminiConversation(niche?: string, audience?: string) {
  console.log('Starting Gemini conversation...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'createConversation',
    niche,
    audience
  });

  return result;
}

export async function sendImageToGemini(
  conversationId: string,
  fileData: string,
  fileName: string,
  prompt?: string
) {
  if (!conversationId || !fileData) {
    throw new Error('Conversation ID and file data are required');
  }

  console.log('Sending image to Gemini for analysis...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'analyzeImage',
    conversationId,
    fileData,
    fileName,
    prompt
  });

  return result.analysis;
}

export async function converseWithGemini(conversationId: string, message: string) {
  if (!conversationId || !message) {
    throw new Error('Conversation ID and message are required');
  }

  console.log('Conversing with Gemini...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'converse',
    conversationId,
    message
  });

  return result.reply;
}

export async function generateGeminiScenarios(
  conversationId: string,
  niche: string,
  audience: string,
  count: number = 5
) {
  if (!conversationId || !niche) {
    throw new Error('Conversation ID and niche are required');
  }

  console.log('Generating scenarios with Gemini...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'generateScenarios',
    conversationId,
    niche,
    audience,
    count
  });

  return result.scenarios;
}

export async function getGeminiConversationHistory(conversationId: string) {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  console.log('Getting Gemini conversation history...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'getHistory',
    conversationId
  });

  return result.messages;
}

export async function updateGeminiConversationContext(
  conversationId: string,
  imageUrl?: string,
  niche?: string,
  audience?: string
) {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  console.log('Updating Gemini conversation context...');
  const result = await callEdgeFunction('gemini-chat', {
    action: 'updateContext',
    conversationId,
    imageUrl,
    niche,
    audience
  });

  return result;
}