import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createGeminiClient,
  GEMINI_MODELS,
} from "../_shared/gemini-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceImageUrl } = await req.json();
    if (!sourceImageUrl) {
      return new Response(JSON.stringify({ error: "sourceImageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const gemini = createGeminiClient(GOOGLE_AI_API_KEY);

    // Fetch the image
    const imageResponse = await fetch(sourceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Determine mime type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.includes("png") ? "image/png" : "image/jpeg";

    // Call Gemini
    const geminiData = await gemini.generateContentJSON(
      GEMINI_MODELS.FLASH_TEXT,
      [
        {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            {
              text: 'Preciso que me analises esta imagem e detetes se este produto é moda/vestuário ou não? responde diretamente dizendo "yes" ou "no"',
            },
          ],
        },
      ],
      { temperature: 0, maxOutputTokens: 10 },
    );

    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "";
    
    console.log("[analyze-product-type] Gemini response:", textResponse);
    
    const isFashion = textResponse.includes("yes");

    return new Response(JSON.stringify({ isFashion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-product-type] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, isFashion: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
