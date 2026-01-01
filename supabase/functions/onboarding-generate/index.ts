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

    // Check/create bonus credits record
    let { data: bonusCredits } = await supabase
      .from('onboarding_bonus_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!bonusCredits) {
      const { data: newCredits, error: insertError } = await supabase
        .from('onboarding_bonus_credits')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('[onboarding-generate] Error creating bonus credits:', insertError);
        throw new Error('Failed to initialize bonus credits');
      }
      bonusCredits = newCredits;
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

    // Call the existing ugc-gemini-v3 function to generate images
    const { data: genResult, error: genError } = await supabase.functions.invoke('ugc-gemini-v3', {
      body: {
        action: 'createImageJob',
        prompt,
        sourceImageId,
        settings: {
          numImages: 2,
          aspectRatio: '1:1',
          style: 'natural',
          outputFormat: 'webp'
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

    // Wait for job completion and get images
    const jobId = genResult?.jobId;
    if (!jobId) {
      throw new Error('No job ID returned');
    }

    // Poll for job completion (max 2 minutes)
    let images: string[] = [];
    for (let i = 0; i < 24; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { data: job } = await supabase
        .from('image_jobs')
        .select('status, completed')
        .eq('id', jobId)
        .single();

      if (job?.status === 'completed' || job?.status === 'partially_completed') {
        // Fetch generated images
        const { data: ugcImages } = await supabase
          .from('ugc_images')
          .select('public_url')
          .eq('job_id', jobId);

        images = ugcImages?.map(img => img.public_url) || [];
        break;
      } else if (job?.status === 'failed') {
        throw new Error('Image generation failed');
      }
    }

    console.log('[onboarding-generate] Success:', { images: images.length });

    return new Response(JSON.stringify({ success: true, images, jobId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[onboarding-generate] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
