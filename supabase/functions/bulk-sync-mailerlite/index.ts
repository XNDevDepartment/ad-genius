import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY')!;

// Correct group names matching MailerLite dashboard
const tierToGroupMap: Record<string, string> = {
  'Free': 'produktpix-free',
  'Starter': 'produktpix-starter',
  'Plus': 'produktpix-plus',
  'Pro': 'produktpix-pro',
  'Founders': 'produktpix-founders'
};

async function getGroupIdByName(groupName: string): Promise<string | null> {
  try {
    const response = await fetch('https://connect.mailerlite.com/api/groups', {
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[BULK-SYNC] Failed to fetch groups: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const group = data.data?.find((g: any) => g.name === groupName);
    
    if (group) {
      console.log(`[BULK-SYNC] Found group "${groupName}" with ID: ${group.id}`);
      return group.id;
    }
    
    console.warn(`[BULK-SYNC] Group "${groupName}" not found`);
    return null;
  } catch (error) {
    console.error('[BULK-SYNC] Error fetching group:', error);
    return null;
  }
}

async function createOrUpdateSubscriber(email: string, name: string, tier: string, groupId: string | null): Promise<any> {
  const payload: any = {
    email,
    fields: {
      name: name || '',
      subscription_tier: tier
    },
    status: 'active'
  };

  // Add to group if we have a valid group ID
  if (groupId) {
    payload.groups = [groupId];
  }

  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MailerLite API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BULK-SYNC] Starting bulk sync to MailerLite');

    if (!MAILERLITE_API_KEY) {
      throw new Error('MAILERLITE_API_KEY not configured');
    }

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
        mailerlite_subscriber_id
      `)
      .is('mailerlite_subscriber_id', null);

    if (error) throw error;

    // Filter out profiles with empty or null emails
    const validProfiles = profiles.filter(p => p.email && p.email.trim() !== '');
    const skippedCount = profiles.length - validProfiles.length;

    if (skippedCount > 0) {
      console.log(`[BULK-SYNC] Skipped ${skippedCount} profiles with invalid/empty emails`);
    }

    console.log(`[BULK-SYNC] Found ${validProfiles.length} valid users to sync`);

    if (validProfiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          total: 0,
          synced: 0,
          failed: 0,
          skipped: skippedCount,
          message: 'No users to sync'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription tiers for these users
    const userIds = validProfiles.map(p => p.id);
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('user_id, subscription_tier')
      .in('user_id', userIds);

    const tierMap = new Map(subscribers?.map(s => [s.user_id, s.subscription_tier]) || []);

    // Pre-fetch all group IDs
    const groupIds: Record<string, string | null> = {};
    for (const tier of Object.keys(tierToGroupMap)) {
      const groupName = tierToGroupMap[tier];
      const groupId = await getGroupIdByName(groupName);
      groupIds[tier] = groupId;
    }

    let synced = 0;
    let failed = 0;
    const failedEmails: string[] = [];
    const results: { email: string; success: boolean; error?: string }[] = [];

    // Process each user individually (more reliable than batch)
    for (const profile of validProfiles) {
      try {
        const tier = tierMap.get(profile.id) || 'Free';
        const groupId = groupIds[tier];

        console.log(`[BULK-SYNC] Syncing ${profile.email} (tier: ${tier})`);

        const result = await createOrUpdateSubscriber(
          profile.email,
          profile.name || '',
          tier,
          groupId
        );

        const mailerliteId = result.data?.id;

        if (mailerliteId) {
          // Update profile with MailerLite ID
          await supabase
            .from('profiles')
            .update({ mailerlite_subscriber_id: mailerliteId })
            .eq('id', profile.id);

          // Log successful sync
          await supabase
            .from('mailerlite_sync_log')
            .insert({
              user_id: profile.id,
              action: 'bulk_subscribe',
              mailerlite_subscriber_id: mailerliteId,
              success: true,
              synced_at: new Date().toISOString()
            });

          synced++;
          results.push({ email: profile.email, success: true });
          console.log(`[BULK-SYNC] ✓ Synced ${profile.email} (ID: ${mailerliteId})`);
        } else {
          throw new Error('No subscriber ID returned');
        }

        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[BULK-SYNC] ✗ Failed ${profile.email}:`, errorMsg);
        
        failed++;
        failedEmails.push(profile.email);
        results.push({ email: profile.email, success: false, error: errorMsg });

        // Log failure
        await supabase
          .from('mailerlite_sync_log')
          .insert({
            user_id: profile.id,
            action: 'bulk_subscribe',
            success: false,
            error_message: errorMsg,
            synced_at: new Date().toISOString()
          });
      }
    }

    console.log(`[BULK-SYNC] Complete: ${synced} synced, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: validProfiles.length,
        synced,
        failed,
        skipped: skippedCount,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined
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
