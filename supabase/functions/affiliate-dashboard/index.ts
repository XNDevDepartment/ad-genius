import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, action, data } = await req.json();

    if (!access_token) {
      console.error('[affiliate-dashboard] Missing access_token');
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch affiliate by access token (service role bypasses RLS)
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, name, email, status, referral_code, referral_link, iban, created_at, approved_at')
      .eq('access_token', access_token)
      .single();

    if (affiliateError || !affiliate) {
      console.error('[affiliate-dashboard] Invalid access token or affiliate not found:', affiliateError);
      return new Response(
        JSON.stringify({ error: 'Dashboard not found. Check if the link is correct.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[affiliate-dashboard] Affiliate found: ${affiliate.id}, action: ${action || 'fetch'}`);

    // Handle different actions
    if (action === 'update_iban') {
      // Update IBAN for this affiliate
      if (!data?.iban) {
        return new Response(
          JSON.stringify({ error: 'IBAN is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('affiliates')
        .update({ iban: data.iban, updated_at: new Date().toISOString() })
        .eq('id', affiliate.id);

      if (updateError) {
        console.error('[affiliate-dashboard] Error updating IBAN:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update IBAN' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[affiliate-dashboard] IBAN updated for affiliate ${affiliate.id}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: fetch all affiliate data
    // Fetch referrals for this affiliate
    const { data: referrals, error: referralsError } = await supabase
      .from('affiliate_referrals')
      .select('id, signup_date, conversion_date, current_plan, status')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('[affiliate-dashboard] Error fetching referrals:', referralsError);
    }

    // Fetch commissions for this affiliate
    const { data: commissions, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select('id, amount, month, status, plan_value')
      .eq('affiliate_id', affiliate.id)
      .order('month', { ascending: false });

    if (commissionsError) {
      console.error('[affiliate-dashboard] Error fetching commissions:', commissionsError);
    }

    console.log(`[affiliate-dashboard] Returning data for affiliate ${affiliate.id}: ${referrals?.length || 0} referrals, ${commissions?.length || 0} commissions`);

    return new Response(
      JSON.stringify({
        affiliate,
        referrals: referrals || [],
        commissions: commissions || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[affiliate-dashboard] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
