import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_AI_KEY = Deno.env.get('GOOGLE_AI_API_KEY')

// Input validation schema
function validateInput(data: any): { valid: boolean; error?: string; prompt?: string; sourceImageUrl?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { prompt, sourceImageUrl } = data;
  
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string' };
  }
  
  if (prompt.length < 1 || prompt.length > 5000) {
    return { valid: false, error: 'Prompt must be between 1 and 5000 characters' };
  }
  
  if (sourceImageUrl !== undefined && sourceImageUrl !== null) {
    if (typeof sourceImageUrl !== 'string') {
      return { valid: false, error: 'sourceImageUrl must be a string' };
    }
    
    // Basic URL validation
    try {
      new URL(sourceImageUrl);
    } catch {
      return { valid: false, error: 'sourceImageUrl must be a valid URL' };
    }
  }
  
  return { valid: true, prompt, sourceImageUrl };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[TEST-GEMINI] Direct API test started')
    
    if (!GOOGLE_AI_KEY) {
      console.error('[TEST-GEMINI] Missing API key');
      return new Response(JSON.stringify({
        success: false,
        error: 'Service configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    
    // Validate input
    const validation = validateInput(requestBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: validation.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { prompt, sourceImageUrl } = validation;

    console.log('[TEST-GEMINI] Making direct API call', { 
      hasSourceImage: !!sourceImageUrl, 
      promptLength: prompt!.length 
    })

    let apiRequestBody: any = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        personGeneration: "dont_allow"
      }
    }

    // Handle source image if provided
    if (sourceImageUrl) {
      console.log('[TEST-GEMINI] Processing source image')
      const src = await fetch(sourceImageUrl)
      if (!src.ok) {
        console.error('[TEST-GEMINI] Failed to fetch source image');
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch source image'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const imageBuffer = await src.arrayBuffer()
      console.log('[TEST-GEMINI] Image buffer size:', imageBuffer.byteLength)
      
      // Safe base64 conversion for large images
      const uint8Array = new Uint8Array(imageBuffer)
      let binary = ''
      const chunkSize = 32768
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
      }
      
      const base64Image = btoa(binary)
      console.log('[TEST-GEMINI] Base64 conversion completed, length:', base64Image.length)
      
      // For image editing with source image - update the structure
      apiRequestBody.instances[0].image = {
        bytesBase64Encoded: base64Image
      }
      apiRequestBody.instances[0].editInstruction = prompt
    }

    // Make API call to Google Imagen API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`, {
      method: "POST",
      headers: {
        "x-goog-api-key": GOOGLE_AI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiRequestBody),
    })

    console.log('[TEST-GEMINI] API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TEST-GEMINI] API error:', errorText)
      // Return generic error to client, log details server-side
      return new Response(JSON.stringify({
        success: false,
        error: 'Image generation failed. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json()
    console.log('[TEST-GEMINI] API response received:', {
      hasPredictions: !!result.predictions,
      imageCount: result.predictions?.length || 0
    })

    if (!result.predictions || result.predictions.length === 0) {
      console.error('[TEST-GEMINI] No images generated');
      return new Response(JSON.stringify({
        success: false,
        error: 'No images generated. Please try a different prompt.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const generatedImage = result.predictions[0]
    
    return new Response(JSON.stringify({
      success: true,
      image: {
        base64: generatedImage.image.imageBytes,
        mimeType: generatedImage.image.mimeType || 'image/png',
        prompt: prompt,
        hasSourceImage: !!sourceImageUrl
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[TEST-GEMINI] Error:', error)
    // Return generic error message to client
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})