import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'NOT_AUTHENTICATED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const codeUpper = code.trim().toUpperCase();
    console.log('Attempting to redeem code:', codeUpper, 'for user:', user.id);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if promo code exists and is valid
    const { data: promoCode, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', codeUpper)
      .eq('is_active', true)
      .single();

    if (promoError || !promoCode) {
      console.error('Promo code not found or inactive:', promoError);
      return new Response(
        JSON.stringify({ error: 'INVALID_CODE' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      console.log('Promo code expired:', promoCode.expires_at);
      return new Response(
        JSON.stringify({ error: 'CODE_EXPIRED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if code has reached max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      console.log('Promo code exhausted:', promoCode.current_uses, '>=', promoCode.max_uses);
      return new Response(
        JSON.stringify({ error: 'CODE_EXHAUSTED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check if user has already redeemed this code
    const { data: existingRedemption, error: redemptionCheckError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('promo_code_id', promoCode.id)
      .maybeSingle();

    if (redemptionCheckError) {
      console.error('Error checking redemptions:', redemptionCheckError);
      return new Response(
        JSON.stringify({ error: 'DATABASE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRedemption) {
      console.log('User already redeemed this code');
      return new Response(
        JSON.stringify({ error: 'ALREADY_REDEEMED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Add credits to user's balance using refund_user_credits
    const { data: creditResult, error: creditError } = await supabaseAdmin
      .rpc('refund_user_credits', {
        p_user_id: user.id,
        p_amount: promoCode.credits_amount,
        p_reason: `promo_code:${codeUpper}`
      });

    if (creditError || !creditResult?.success) {
      console.error('Error adding credits:', creditError, creditResult);
      return new Response(
        JSON.stringify({ error: 'CREDIT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Record the redemption
    const { error: insertError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .insert({
        user_id: user.id,
        promo_code_id: promoCode.id,
        credits_received: promoCode.credits_amount
      });

    if (insertError) {
      console.error('Error recording redemption:', insertError);
      // Try to refund the credits since redemption recording failed
      await supabaseAdmin.rpc('deduct_user_credits', {
        p_user_id: user.id,
        p_amount: promoCode.credits_amount,
        p_reason: 'promo_code_rollback'
      });
      return new Response(
        JSON.stringify({ error: 'DATABASE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Increment the code's usage count
    const { error: updateError } = await supabaseAdmin
      .from('promo_codes')
      .update({ 
        current_uses: promoCode.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promoCode.id);

    if (updateError) {
      console.error('Error updating promo code usage:', updateError);
      // Non-critical error, already gave credits
    }

    console.log('Successfully redeemed code:', codeUpper, 'for', promoCode.credits_amount, 'credits');

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits: promoCode.credits_amount,
        new_balance: creditResult.new_balance
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
