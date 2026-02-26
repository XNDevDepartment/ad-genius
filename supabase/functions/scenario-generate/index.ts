import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Tool definition for structured output
const scenarioTool = {
  type: "function",
  function: {
    name: "generate_scenarios",
    description: "Generate 5 unique UGC scenario ideas for product photography and social media content",
    parameters: {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              idea: { 
                type: "string",
                description: "A short, catchy title for the scenario (3-6 words)"
              },
              description: { 
                type: "string",
                description: "A detailed description of the scenario, including setting, mood, and how to capture it (2 sentences max). 1 Photo, 1 Angle always"
              },
              "small-description": { 
                type: "string",
                description: "A brief one-line summary of the scenario"
              }
            },
            required: ["idea", "description", "small-description"]
          },
          minItems: 5,
          maxItems: 5
        }
      },
      required: ["scenarios"]
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { audience, productSpecs, language, imageUrl } = await req.json();

    if (!audience) {
      return new Response(
        JSON.stringify({ error: "Missing required field: audience" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user prompt
    let userPrompt = `Generate 5 creative and unique UGC (User Generated Content) scenario ideas for product photography.

    Target Audience: ${audience}
    ${productSpecs ? `Product Details: ${productSpecs}` : ""}
    Language for response: ${language || "en"}

    Requirements:
    - Each scenario should be practical to photograph
    - Consider the target audience's lifestyle and preferences
    - Include a mix of indoor and outdoor settings
    - Vary the moods (energetic, calm, professional, casual, etc.)
    - Make scenarios authentic and relatable for social media
    - Focus on realistic, achievable setups for UGC creators`;

    // System prompt
    const systemPrompt = `You are a creative UGC (User Generated Content) strategist and photographer with expertise in product photography for social media.

  Your role is to generate unique, creative, and practical scenario ideas that resonate with the target audience. Each scenario should:
  - Be visually interesting and engaging for social media
  - Feel authentic and relatable (not overly staged)
  - Be achievable for content creators with basic equipment
  - Highlight the product naturally within the scene
  - Consider lighting, composition, and mood

  Always respond in the language requested by the user.`;

    // Build messages array
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt }
    ];

    // If image URL provided, use vision capabilities
    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt + "\n\nHere is the product image to analyze:" },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    console.log("[scenario-generate] Calling OpenRouter with Claude Sonnet...");

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://produktpix.com",
        "X-Title": "ProduktPix UGC Generator"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.6",
        messages,
        tools: [scenarioTool],
        tool_choice: { type: "function", function: { name: "generate_scenarios" } },
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[scenario-generate] OpenRouter error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate scenarios. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[scenario-generate] OpenRouter response received");

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_scenarios") {
      console.error("[scenario-generate] Unexpected response structure:", JSON.stringify(data));
      
      // Fallback: try to parse content if tool call failed
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
              return new Response(
                JSON.stringify({ scenarios: parsed.scenarios }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (parseError) {
          console.error("[scenario-generate] Failed to parse fallback content:", parseError);
        }
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scenarios = JSON.parse(toolCall.function.arguments);
    console.log("[scenario-generate] Generated", scenarios.scenarios?.length, "scenarios");

    return new Response(
      JSON.stringify(scenarios),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[scenario-generate] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
