import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api';
const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY');

interface SyncRequest {
  email: string;
  name?: string;
  subscription_tier?: string;
  action: 'subscribe' | 'unsubscribe' | 'update';
  newsletter_subscribed?: boolean;
}

interface MailerLiteSubscriber {
  email: string;
  fields?: {
    name?: string;
    subscription_tier?: string;
  };
  groups?: string[];
  status?: string;
}

const tierToGroupMap: Record<string, string> = {
  'Free': 'produktpix-free',
  'Starter': 'produktpix-starter',
  'Plus': 'produktpix-plus',
  'Pro': 'produktpix-pro',
  'Founders': 'produktpix-founders',
};

async function getMailerLiteSubscriber(email: string): Promise<any> {
  const response = await fetch(`${MAILERLITE_API_URL}/subscribers/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`MailerLite API error: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

async function createOrUpdateSubscriber(data: MailerLiteSubscriber): Promise<any> {
  const response = await fetch(`${MAILERLITE_API_URL}/subscribers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MailerLite API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function deleteSubscriber(subscriberId: string): Promise<void> {
  const response = await fetch(`${MAILERLITE_API_URL}/subscribers/${subscriberId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`MailerLite API error: ${response.status} ${await response.text()}`);
  }
}

async function updateSubscriberGroups(subscriberId: string, oldTier?: string, newTier?: string): Promise<void> {
  // Remove from old group
  if (oldTier && tierToGroupMap[oldTier]) {
    const oldGroupName = tierToGroupMap[oldTier];
    // Note: MailerLite API requires group ID, not name
    // In production, you'd need to fetch group IDs first or store them
    console.log(`Would remove subscriber ${subscriberId} from group ${oldGroupName}`);
  }

  // Add to new group
  if (newTier && tierToGroupMap[newTier]) {
    const newGroupName = tierToGroupMap[newTier];
    console.log(`Would add subscriber ${subscriberId} to group ${newGroupName}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SYNC-MAILERLITE] Function started');

    if (!MAILERLITE_API_KEY) {
      throw new Error('MAILERLITE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SyncRequest = await req.json();
    console.log('[SYNC-MAILERLITE] Request data:', { 
      email: requestData.email, 
      action: requestData.action,
      tier: requestData.subscription_tier 
    });

    const { email, name, subscription_tier, action, newsletter_subscribed } = requestData;

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if subscriber exists in MailerLite
    const existingSubscriber = await getMailerLiteSubscriber(email);

    if (action === 'unsubscribe') {
      if (existingSubscriber) {
        await deleteSubscriber(existingSubscriber.data.id);
        console.log(`[SYNC-MAILERLITE] Unsubscribed ${email}`);
      }

      // Update database
      await supabase
        .from('profiles')
        .update({ newsletter_subscribed: false })
        .eq('email', email);

      return new Response(
        JSON.stringify({ success: true, action: 'unsubscribed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Subscribe or update
    const subscriberData: MailerLiteSubscriber = {
      email,
      fields: {
        name: name || '',
        subscription_tier: subscription_tier || 'Free',
      },
      status: newsletter_subscribed === false ? 'unsubscribed' : 'active',
    };

    const result = await createOrUpdateSubscriber(subscriberData);
    console.log(`[SYNC-MAILERLITE] Subscriber synced:`, result.data);

    // Update database with MailerLite subscriber ID
    await supabase
      .from('profiles')
      .update({ 
        mailerlite_subscriber_id: result.data.id,
        newsletter_subscribed: newsletter_subscribed !== false,
      })
      .eq('email', email);

    // Log sync action
    await supabase
      .from('mailerlite_sync_log')
      .insert({
        user_id: result.data.id,
        action: existingSubscriber ? 'update' : 'subscribe',
        mailerlite_subscriber_id: result.data.id,
        success: true,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: existingSubscriber ? 'updated' : 'created',
        subscriber_id: result.data.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SYNC-MAILERLITE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
