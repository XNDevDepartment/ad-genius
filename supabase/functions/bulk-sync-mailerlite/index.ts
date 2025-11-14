import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY')!;
const BATCH_SIZE = 50; // MailerLite allows up to 100, but 50 is safer

const tierToGroupMap: Record<string, string> = {
  'Free': 'Free',
  'Starter': 'Starter',
  'Plus': 'Plus',
  'Pro': 'Pro',
  'Founders': 'Founders'
};

interface MailerLiteBatchSubscriber {
  email: string;
  fields?: {
    name?: string;
    subscription_tier?: string;
  };
  status?: 'active' | 'unsubscribed';
  groups?: string[];
}

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
    return group?.id || null;
  } catch (error) {
    console.error('[BULK-SYNC] Error fetching group:', error);
    return null;
  }
}

async function batchCreateSubscribers(subscribers: MailerLiteBatchSubscriber[]): Promise<any> {
  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ subscribers })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MailerLite batch API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BULK-SYNC] Starting bulk sync to MailerLite using batch API');

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

    if (profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          total: 0,
          synced: 0,
          failed: 0,
          message: 'No users to sync'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription tiers for these users
    const userIds = profiles.map(p => p.id);
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('user_id, subscription_tier')
      .in('user_id', userIds);

    const tierMap = new Map(subscribers?.map(s => [s.user_id, s.subscription_tier]) || []);

    // Pre-fetch all group IDs
    const groupIds: Record<string, string | null> = {};
    for (const tier of Object.keys(tierToGroupMap)) {
      const groupId = await getGroupIdByName(tierToGroupMap[tier]);
      groupIds[tier] = groupId;
      console.log(`[BULK-SYNC] Group ${tier}: ${groupId || 'not found'}`);
    }

    let synced = 0;
    let failed = 0;
    const failedEmails: string[] = [];

    // Process in batches
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      console.log(`[BULK-SYNC] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} users)`);

      try {
        // Prepare batch payload
        const batchSubscribers: MailerLiteBatchSubscriber[] = batch.map(profile => {
          const tier = tierMap.get(profile.id) || 'Free';
          const groupId = groupIds[tier];
          
          return {
            email: profile.email,
            fields: {
              name: profile.name || '',
              subscription_tier: tier
            },
            status: (profile.newsletter_subscribed !== false ? 'active' : 'unsubscribed') as 'active' | 'unsubscribed',
            groups: groupId ? [groupId] : []
          };
        });

        // Send batch request
        const result = await batchCreateSubscribers(batchSubscribers);
        console.log(`[BULK-SYNC] Batch API response:`, result);

        // Update database with mailerlite_subscriber_id for each user in batch
        for (const profile of batch) {
          try {
            // The batch API doesn't return individual subscriber IDs reliably
            // So we need to fetch each subscriber to get their ID
            const subscriberResponse = await fetch(
              `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(profile.email)}`,
              {
                headers: {
                  'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (subscriberResponse.ok) {
              const subscriberData = await subscriberResponse.json();
              const mailerliteId = subscriberData.data?.id;

              if (mailerliteId) {
                await supabase
                  .from('profiles')
                  .update({ mailerlite_subscriber_id: mailerliteId })
                  .eq('id', profile.id);

                // Log successful sync
                await supabase
                  .from('mailerlite_sync_log')
                  .insert({
                    user_id: profile.id,
                    action: 'subscribe',
                    success: true,
                    synced_at: new Date().toISOString()
                  });

                synced++;
                console.log(`[BULK-SYNC] Synced ${profile.email} (ID: ${mailerliteId})`);
              }
            }
          } catch (err) {
            console.error(`[BULK-SYNC] Failed to update ${profile.email}:`, err);
            failed++;
            failedEmails.push(profile.email);
            
            // Log failure
            await supabase
              .from('mailerlite_sync_log')
              .insert({
                user_id: profile.id,
                action: 'subscribe',
                success: false,
                error_message: err instanceof Error ? err.message : 'Unknown error',
                synced_at: new Date().toISOString()
              });
          }
        }

        // Small delay between batches to be respectful
        if (i + BATCH_SIZE < profiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        console.error(`[BULK-SYNC] Batch failed:`, batchError);
        
        // Mark all users in this batch as failed
        for (const profile of batch) {
          failed++;
          failedEmails.push(profile.email);
          
          await supabase
            .from('mailerlite_sync_log')
            .insert({
              user_id: profile.id,
              action: 'subscribe',
              success: false,
              error_message: batchError instanceof Error ? batchError.message : 'Batch request failed',
              synced_at: new Date().toISOString()
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total: profiles.length,
        synced,
        failed,
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
