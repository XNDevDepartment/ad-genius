import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sourceImageId, audience, contentType } = await req.json();
    console.log('[onboarding-generate] Request:', { userId: user.id, sourceImageId, audience, contentType });

    // Check/create bonus credits record with race condition handling
    let { data: bonusCredits, error: selectError } = await supabase
      .from('onboarding_bonus_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!bonusCredits && (!selectError || selectError.code === 'PGRST116')) {
      // No record exists, try to create one
      const { data: newCredits, error: insertError } = await supabase
        .from('onboarding_bonus_credits')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        // Handle race condition - another request may have created it
        if (insertError.code === '23505') {
          console.log('[onboarding-generate] Race condition detected, fetching existing record');
          const { data: existingCredits } = await supabase
            .from('onboarding_bonus_credits')
            .select('*')
            .eq('user_id', user.id)
            .single();
          bonusCredits = existingCredits;
        } else {
          console.error('[onboarding-generate] Error creating bonus credits:', insertError);
          throw new Error('Failed to initialize bonus credits');
        }
      } else {
        bonusCredits = newCredits;
      }
    }

    // Ensure bonusCredits was retrieved successfully
    if (!bonusCredits) {
      console.error('[onboarding-generate] Failed to get bonus credits after all attempts');
      return new Response(JSON.stringify({ error: 'Failed to initialize bonus credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has remaining bonus images
    if (bonusCredits.images_used >= 2) {
      return new Response(JSON.stringify({ error: 'Bonus images already used' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get source image URL
    const { data: sourceImage } = await supabase
      .from('source_images')
      .select('public_url')
      .eq('id', sourceImageId)
      .single();

    if (!sourceImage) {
      return new Response(JSON.stringify({ error: 'Source image not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build prompt based on content type
    const promptMap: Record<string, string> = {
      product_showcase: `Create a professional product showcase image. The product should be the hero, photographed in clean, studio-like lighting. Target audience: ${audience}`,
      lifestyle: `Create a lifestyle image showing the product being used in a real-world context. Natural lighting, authentic setting. Target audience: ${audience}`,
      social_proof: `Create a UGC-style image with a person naturally using/holding the product. Authentic, influencer-like aesthetic. Target audience: ${audience}`,
      ad_creative: `Create a marketing-ready visual that highlights the product's key features. Bold, eye-catching composition perfect for ads. Target audience: ${audience}`
    };

    const prompt = promptMap[contentType] || promptMap.product_showcase;

    console.log('[onboarding-generate] Calling ugc-gemini-v3 with:', {
      source_image_id: sourceImageId,
      source_image_url: sourceImage.public_url,
      prompt: prompt.substring(0, 100) + '...'
    });

    // Call the existing ugc-gemini-v3 function to generate images
    const { data: genResult, error: genError } = await supabase.functions.invoke('ugc-gemini-v3', {
      body: {
        action: 'createImageJob',
        prompt,
        source_image_id: sourceImageId,
        settings: {
          number: 2,
          aspectRatio: '1:1',
          style: 'natural',
          output_format: 'webp'
        }
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (genError) {
      console.error('[onboarding-generate] Generation error:', genError);
      throw new Error('Image generation failed');
    }

    // Mark bonus images as used
    await supabase
      .from('onboarding_bonus_credits')
      .update({ images_used: 2, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // Return immediately with jobId - let client poll for completion
    // This prevents edge function timeout issues
    const jobId = genResult?.jobId;
    if (!jobId) {
      throw new Error('No job ID returned');
    }

    console.log('[onboarding-generate] Success - returning jobId for client polling:', { jobId });

    return new Response(JSON.stringify({ success: true, jobId, status: 'processing' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[onboarding-generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
