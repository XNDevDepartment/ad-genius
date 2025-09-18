import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'createConversation':
        return await handleCreateConversation(params, supabase, req);
      case 'analyzeImage':
        return await handleAnalyzeImage(params, supabase);
      case 'converse':
        return await handleConverse(params, supabase);
      case 'generateScenarios':
        return await handleGenerateScenarios(params, supabase);
      case 'getHistory':
        return await handleGetHistory(params, supabase);
      case 'updateContext':
        return await handleUpdateContext(params, supabase);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Gemini Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleCreateConversation(
  { niche, audience }: { niche?: string; audience?: string },
  supabase: any,
  req: Request
) {
  // Get user from request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    throw new Error('Invalid authentication');
  }

  // Create new conversation in database
  const { data: conversation, error: convError } = await supabase
    .from('gemini_conversations')
    .insert({
      user_id: user.id,
      niche,
      audience
    })
    .select()
    .single();

  if (convError) {
    console.error('Error creating conversation:', convError);
    throw new Error('Failed to create conversation');
  }

  console.log('Created Gemini conversation:', conversation.id);

  return new Response(
    JSON.stringify({ conversationId: conversation.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAnalyzeImage(
  { conversationId, fileData, fileName, prompt }: { 
    conversationId: string; 
    fileData: string; 
    fileName: string; 
    prompt?: string; 
  },
  supabase: any
) {
  // Convert base64 to blob for Gemini
  const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
  
  // Get conversation context
  const { data: conversation, error: convError } = await supabase
    .from('gemini_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Prepare image analysis prompt
  const analysisPrompt = `
Analyze this image in detail for UGC (User Generated Content) creation purposes.
${conversation.niche ? `Niche/Industry: ${conversation.niche}` : ''}
${conversation.audience ? `Target Audience: ${conversation.audience}` : ''}

Please provide:
1. Visual elements and composition
2. Style and aesthetic
3. Colors and lighting
4. Subject matter and context
5. Potential UGC scenarios this image could work for
6. Suggestions for similar content creation

${prompt ? `Additional context: ${prompt}` : ''}

Be detailed but concise, focusing on actionable insights for content creation.
`;

  // Call Gemini Pro Vision API
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: analysisPrompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    }
  );

  if (!geminiResponse.ok) {
    const error = await geminiResponse.text();
    console.error('Gemini API error:', error);
    throw new Error('Image analysis failed');
  }

  const geminiResult = await geminiResponse.json();
  const analysis = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis failed';

  // Update conversation with image analysis
  await supabase
    .from('gemini_conversations')
    .update({
      image_url: fileData,
      image_analysis: analysis,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  // Save message to conversation history
  await supabase
    .from('gemini_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: `Image uploaded: ${fileName}${prompt ? ` - ${prompt}` : ''}`,
      has_image: true
    });

  await supabase
    .from('gemini_messages')
    .insert({
      conversation_id: conversationId,
      role: 'model',
      content: analysis,
      has_image: false
    });

  console.log('Image analyzed with Gemini Pro Vision');

  return new Response(
    JSON.stringify({ analysis }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConverse(
  { conversationId, message }: { conversationId: string; message: string },
  supabase: any
) {
  // Get conversation history
  const { data: messages, error: messagesError } = await supabase
    .from('gemini_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw new Error('Failed to fetch conversation history');
  }

  // Get conversation context
  const { data: conversation, error: convError } = await supabase
    .from('gemini_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Build conversation history for Gemini
  const conversationHistory = messages.map((msg: any) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add current message
  conversationHistory.push({
    role: 'user',
    parts: [{ text: message }]
  });

  // Add system context if available
  let systemContext = '';
  if (conversation.image_analysis) {
    systemContext += `Image Analysis Context: ${conversation.image_analysis}\n\n`;
  }
  if (conversation.niche) {
    systemContext += `Niche: ${conversation.niche}\n`;
  }
  if (conversation.audience) {
    systemContext += `Target Audience: ${conversation.audience}\n`;
  }

  // Prepare the full conversation with context
  const fullConversation = systemContext ? [{
    role: 'user',
    parts: [{ text: `Context for this conversation:\n${systemContext}\nNow let's continue our conversation.` }]
  }, ...conversationHistory] : conversationHistory;

  // Call Gemini Pro API
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: fullConversation,
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    }
  );

  if (!geminiResponse.ok) {
    const error = await geminiResponse.text();
    console.error('Gemini API error:', error);
    throw new Error('Conversation failed');
  }

  const geminiResult = await geminiResponse.json();
  const reply = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

  // Save both messages to conversation history
  await supabase
    .from('gemini_messages')
    .insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: message,
        has_image: false
      },
      {
        conversation_id: conversationId,
        role: 'model',
        content: reply,
        has_image: false
      }
    ]);

  console.log('Gemini conversation completed');

  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerateScenarios(
  { conversationId, niche, audience, count }: { 
    conversationId: string; 
    niche: string; 
    audience: string; 
    count: number; 
  },
  supabase: any
) {
  // Get conversation context
  const { data: conversation, error: convError } = await supabase
    .from('gemini_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Prepare scenario generation prompt
  const scenarioPrompt = `
Generate ${count} creative UGC (User Generated Content) scenarios for the following:

Niche/Industry: ${niche}
Target Audience: ${audience}
${conversation.image_analysis ? `Image Context: ${conversation.image_analysis}` : ''}

Each scenario should be:
1. Specific and actionable
2. Relevant to the niche and audience
3. Engaging and authentic
4. Suitable for social media content
${conversation.image_analysis ? '5. Complementary to the analyzed image style/theme' : ''}

Format each scenario as a numbered list with a brief title and 2-3 sentence description.
Focus on scenarios that would generate high engagement and feel authentic to the target audience.
`;

  // Call Gemini Pro API
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: scenarioPrompt }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1500,
        }
      }),
    }
  );

  if (!geminiResponse.ok) {
    const error = await geminiResponse.text();
    console.error('Gemini API error:', error);
    throw new Error('Scenario generation failed');
  }

  const geminiResult = await geminiResponse.json();
  const scenarios = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate scenarios.';

  // Save scenario generation to conversation history
  await supabase
    .from('gemini_messages')
    .insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: `Generate ${count} UGC scenarios for ${niche} targeting ${audience}`,
        has_image: false
      },
      {
        conversation_id: conversationId,
        role: 'model',
        content: scenarios,
        has_image: false
      }
    ]);

  console.log('Generated scenarios with Gemini');

  return new Response(
    JSON.stringify({ scenarios }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetHistory(
  { conversationId }: { conversationId: string },
  supabase: any
) {
  const { data: messages, error } = await supabase
    .from('gemini_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching conversation history:', error);
    throw new Error('Failed to fetch conversation history');
  }

  return new Response(
    JSON.stringify({ messages }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateContext(
  { conversationId, imageUrl, niche, audience }: { 
    conversationId: string; 
    imageUrl?: string; 
    niche?: string; 
    audience?: string; 
  },
  supabase: any
) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (imageUrl !== undefined) updateData.image_url = imageUrl;
  if (niche !== undefined) updateData.niche = niche;
  if (audience !== undefined) updateData.audience = audience;

  const { error } = await supabase
    .from('gemini_conversations')
    .update(updateData)
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation context:', error);
    throw new Error('Failed to update conversation context');
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}