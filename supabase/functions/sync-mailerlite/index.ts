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

// Input validation
function validateSyncRequest(data: any): { valid: boolean; error?: string; request?: SyncRequest } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { email, name, subscription_tier, action, newsletter_subscribed } = data;
  
  // Validate email
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 255) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Validate action
  const validActions = ['subscribe', 'unsubscribe', 'update'];
  if (!action || !validActions.includes(action)) {
    return { valid: false, error: 'Invalid action' };
  }
  
  // Validate optional fields
  if (name !== undefined && (typeof name !== 'string' || name.length > 255)) {
    return { valid: false, error: 'Invalid name' };
  }
  
  const validTiers = ['Free', 'Starter', 'Plus', 'Pro', 'Founders'];
  if (subscription_tier !== undefined && !validTiers.includes(subscription_tier)) {
    return { valid: false, error: 'Invalid subscription tier' };
  }
  
  if (newsletter_subscribed !== undefined && typeof newsletter_subscribed !== 'boolean') {
    return { valid: false, error: 'Invalid newsletter_subscribed value' };
  }
  
  return {
    valid: true,
    request: { email, name, subscription_tier, action, newsletter_subscribed }
  };
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

async function getGroupIdByName(groupName: string): Promise<string | null> {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/groups`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SYNC-MAILERLITE] Failed to fetch groups: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const group = result.data?.find((g: any) => g.name === groupName);
    
    if (group) {
      console.log(`[SYNC-MAILERLITE] Found group "${groupName}" with ID: ${group.id}`);
      return group.id;
    }
    
    console.warn(`[SYNC-MAILERLITE] Group "${groupName}" not found in MailerLite`);
    return null;
  } catch (error) {
    console.error(`[SYNC-MAILERLITE] Error fetching group ID for "${groupName}":`, error);
    return null;
  }
}

async function assignSubscriberToGroup(subscriberId: string, groupId: string): Promise<void> {
  const response = await fetch(`${MAILERLITE_API_URL}/subscribers/${subscriberId}/groups/${groupId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to assign to group: ${response.status} ${await response.text()}`);
  }
  
  console.log(`[SYNC-MAILERLITE] Assigned subscriber ${subscriberId} to group ${groupId}`);
}

async function removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<void> {
  const response = await fetch(`${MAILERLITE_API_URL}/subscribers/${subscriberId}/groups/${groupId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    console.warn(`[SYNC-MAILERLITE] Failed to remove from group: ${response.status}`);
    return;
  }
  
  console.log(`[SYNC-MAILERLITE] Removed subscriber ${subscriberId} from group ${groupId}`);
}

async function updateSubscriberGroups(subscriberId: string, oldTier?: string, newTier?: string): Promise<void> {
  // Remove from old group if tier changed
  if (oldTier && oldTier !== newTier && tierToGroupMap[oldTier]) {
    const oldGroupName = tierToGroupMap[oldTier];
    const oldGroupId = await getGroupIdByName(oldGroupName);
    
    if (oldGroupId) {
      await removeSubscriberFromGroup(subscriberId, oldGroupId);
    }
  }

  // Add to new group
  if (newTier && tierToGroupMap[newTier]) {
    const newGroupName = tierToGroupMap[newTier];
    const newGroupId = await getGroupIdByName(newGroupName);
    
    if (newGroupId) {
      await assignSubscriberToGroup(subscriberId, newGroupId);
    } else {
      console.warn(`[SYNC-MAILERLITE] Cannot assign to group - group "${newGroupName}" not found. Please create it in MailerLite.`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SYNC-MAILERLITE] Function started');

    if (!MAILERLITE_API_KEY) {
      console.error('[SYNC-MAILERLITE] Missing API key');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawData = await req.json();
    
    // Validate input
    const validation = validateSyncRequest(rawData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { email, name, subscription_tier, action, newsletter_subscribed } = validation.request!;
    
    console.log('[SYNC-MAILERLITE] Request data:', { 
      email: email.substring(0, 3) + '***', 
      action,
      tier: subscription_tier 
    });

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

    // Assign to appropriate group based on subscription tier
    const oldTier = existingSubscriber?.data?.fields?.subscription_tier;
    const newTier = subscription_tier || 'Free';
    
    await updateSubscriberGroups(result.data.id, oldTier, newTier);

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
    // Return generic error message to client
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
