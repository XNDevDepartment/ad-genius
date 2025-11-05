import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const serviceClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fallback prompt if database is unavailable
const FALLBACK_MOTION_PROMPT = `Analyze this UGC image and describe natural motion that would make it feel like authentic social media content.

Think like a content creator holding a phone camera. Suggest simple, realistic movements:
- Subtle handheld camera shake or gentle pans
- Natural product handling (picking up, rotating, setting down)
- Organic environmental motion (slight wind, natural lighting shifts)
- Minimal, purposeful movements that feel unscripted

Avoid:
- Overly smooth or cinematic movements
- Complex effects or transitions
- Anything that looks professionally produced
- Fast or exaggerated motions

Keep it raw and relatable - like someone genuinely showing off a product they love.

Return ONLY a simple, conversational motion description (max 500 characters). No technical jargon, just natural language describing what should move and how.`;

// Helper: Get prompt from database with fallback
async function getPrompt(
  promptKey: string,
  fallback: string
): Promise<string> {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_key', promptKey)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    
    console.log(`[getPrompt] Successfully loaded prompt: ${promptKey}`);
    return data.prompt_template;
  } catch (error) {
    console.warn(`[getPrompt] Failed to load prompt ${promptKey}, using fallback:`, error);
    return fallback;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'imageUrl is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analyzing image for motion:', imageUrl);

    // Get system prompt from database
    const systemPrompt = await getPrompt(
      'motion_analysis_system',
      FALLBACK_MOTION_PROMPT
    );

    // Call OpenAI Vision API with specialized motion analysis prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and suggest a motion prompt for video generation:'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `OpenAI API error: ${response.status}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const suggestedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!suggestedPrompt) {
      console.error('No prompt generated from OpenAI response');
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to generate motion prompt'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Motion prompt generated successfully');
    return new Response(JSON.stringify({
      success: true,
      suggestedPrompt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in analyze-image-for-motion:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});