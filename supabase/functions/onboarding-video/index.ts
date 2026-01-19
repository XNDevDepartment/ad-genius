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

    const { imageUrl } = await req.json();
    console.log('[onboarding-video] Request:', { userId: user.id, imageUrl });

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
        console.error('[onboarding-video] Error creating bonus credits:', insertError);
        throw new Error('Failed to initialize bonus credits');
      }
      bonusCredits = newCredits;
    }

    // Check if user has already used bonus video
    if (bonusCredits.video_used) {
      return new Response(JSON.stringify({ error: 'Bonus video already used' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call the existing kling-video function
    const { data: videoResult, error: videoError } = await supabase.functions.invoke('kling-video', {
      body: {
        imageUrl,
        prompt: 'Gentle camera movement, product showcase, professional lighting',
        duration: 5
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (videoError) {
      console.error('[onboarding-video] Video generation error:', videoError);
      throw new Error('Video generation failed');
    }

    // Mark bonus video as used
    await supabase
      .from('onboarding_bonus_credits')
      .update({ video_used: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    console.log('[onboarding-video] Success:', { jobId: videoResult?.jobId });

    return new Response(JSON.stringify({ 
      success: true, 
      jobId: videoResult?.jobId,
      videoUrl: videoResult?.videoUrl 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[onboarding-video] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
