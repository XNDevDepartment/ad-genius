import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, targetNiche } = await req.json();

    if (!productDescription || !targetNiche) {
      return new Response(
        JSON.stringify({ error: 'Product description and target niche are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const prompt = `You are a UGC (User Generated Content) specialist. Based on this product: "${productDescription}" and target niche: "${targetNiche}", generate 6 creative UGC scenario ideas.

Each scenario should be a realistic situation where someone would naturally use this product and want to share their experience on social media.

Return ONLY a JSON object in this exact format:
{
  "scenarios": [
    {
      "idea": "Brief scenario title",
      "description": "Detailed description of the UGC scenario"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate scenarios' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    // Parse the JSON response
    try {
      const scenarios = JSON.parse(generatedText);
      return new Response(JSON.stringify(scenarios), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse scenarios JSON:', parseError);
      console.error('Raw response:', generatedText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse scenario response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in scenario-suggester function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});