import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BULK-SYNC] Starting bulk sync to MailerLite');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users who aren't synced yet (no mailerlite_subscriber_id)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        newsletter_subscribed,
        mailerlite_subscriber_id
      `)
      .is('mailerlite_subscriber_id', null);

    if (error) throw error;

    console.log(`[BULK-SYNC] Found ${profiles.length} users to sync`);

    // Get subscription tiers for these users
    const userIds = profiles.map(p => p.id);
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('user_id, subscription_tier')
      .in('user_id', userIds);

    const tierMap = new Map(subscribers?.map(s => [s.user_id, s.subscription_tier]) || []);

    let synced = 0;
    let failed = 0;

    // Sync each user
    for (const profile of profiles) {
      try {
        const tier = tierMap.get(profile.id) || 'Free';
        
        const { error: syncError } = await supabase.functions.invoke('sync-mailerlite', {
          body: {
            action: 'subscribe',
            email: profile.email,
            name: profile.name || '',
            subscription_tier: tier,
            newsletter_subscribed: profile.newsletter_subscribed !== false
          }
        });

        if (syncError) {
          console.error(`[BULK-SYNC] Failed to sync ${profile.email}:`, syncError);
          failed++;
        } else {
          console.log(`[BULK-SYNC] Synced ${profile.email}`);
          synced++;
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`[BULK-SYNC] Error syncing ${profile.email}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total: profiles.length,
        synced,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[BULK-SYNC] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
