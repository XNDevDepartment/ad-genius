import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function cleanAndCap(text: string, maxChars = 2000) {
  if (!text) return "";
  let t = text.trim();

  // Remove line breaks & bullets just in case
  t = t.replace(/^\s*[-•]\s+/gm, "");
  t = t.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

  if (t.length > maxChars) {
    t = t.slice(0, maxChars).trim();
  }

  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { imageUrl, language = "en" } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `
You generate short instructions describing natural movement that continues an image scene.

Rules:
- Continue the scene realistically for a few seconds.
- Keep it simple and natural.
- No cinematic language.
- No dramatic actions.
- No new objects appearing.
- No formatting.
- Output only one short paragraph.
- Write in ${language}.
- Maximum 1000 characters.
- No slow movements.
`.trim();

    const userPrompt = `
Describe the natural movement that would continue from this image for a few seconds.
Keep it subtle and human.
`.trim();

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://produktpix.com",
        "X-Title": "ProduktPix Motion Generator",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.6,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate motion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    let raw = data?.choices?.[0]?.message?.content || "";

    if (Array.isArray(raw)) {
      raw = raw
        .map((p: any) => (p?.type === "text" ? p.text : ""))
        .join(" ");
    }

    const suggestedPrompt = cleanAndCap(raw, 2000);

    return new Response(
      JSON.stringify({ success: true, suggestedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
