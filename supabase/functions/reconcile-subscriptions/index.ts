import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Missing Stripe key" }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log("[RECONCILE] Starting subscription reconciliation...");

  try {
    // Get all subscribers with stripe_customer_id who are marked as subscribed
    const { data: subscribers, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, stripe_customer_id, subscription_tier, subscription_end, credits_balance, last_reset_at")
      .eq("subscribed", true)
      .not("stripe_customer_id", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch subscribers: ${fetchError.message}`);
    }

    console.log(`[RECONCILE] Found ${subscribers?.length || 0} active subscribers to check`);

    const results = {
      checked: 0,
      updated: 0,
      creditsReset: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    for (const subscriber of subscribers || []) {
      results.checked++;
      
      try {
        // Get all subscriptions for this customer from Stripe
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: subscriber.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        if (stripeSubscriptions.data.length === 0) {
          console.log(`[RECONCILE] No active Stripe subscription for ${subscriber.user_id} - may need attention`);
          results.details.push({
            user_id: subscriber.user_id,
            action: 'no_active_subscription',
            note: 'User marked subscribed but no active Stripe subscription found'
          });
          continue;
        }

        const stripeSub = stripeSubscriptions.data[0];
        const stripeEndDate = new Date(stripeSub.current_period_end * 1000).toISOString();
        const currentDbEndDate = subscriber.subscription_end;

        // Check if subscription_end needs updating
        if (stripeEndDate !== currentDbEndDate) {
          console.log(`[RECONCILE] Updating subscription_end for ${subscriber.user_id}: ${currentDbEndDate} -> ${stripeEndDate}`);
          
          const { error: updateError } = await supabase
            .from("subscribers")
            .update({
              subscription_end: stripeEndDate,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", subscriber.user_id);

          if (updateError) {
            results.errors.push(`Failed to update ${subscriber.user_id}: ${updateError.message}`);
          } else {
            results.updated++;
            results.details.push({
              user_id: subscriber.user_id,
              action: 'updated_subscription_end',
              old_end: currentDbEndDate,
              new_end: stripeEndDate
            });
          }
        }

        // Check if credits need to be reset (last_reset_at is more than 25 days ago or null)
        const lastReset = subscriber.last_reset_at ? new Date(subscriber.last_reset_at) : null;
        const now = new Date();
        const daysSinceReset = lastReset ? (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24) : 999;

        if (daysSinceReset >= 25) {
          console.log(`[RECONCILE] Resetting credits for ${subscriber.user_id} (last reset: ${daysSinceReset.toFixed(1)} days ago)`);
          
          const { data: resetResult, error: resetError } = await supabase.rpc("reset_user_monthly_credits", {
            p_user_id: subscriber.user_id
          });

          if (resetError) {
            results.errors.push(`Failed to reset credits for ${subscriber.user_id}: ${resetError.message}`);
          } else {
            results.creditsReset++;
            results.details.push({
              user_id: subscriber.user_id,
              action: 'credits_reset',
              days_since_last_reset: daysSinceReset.toFixed(1),
              result: resetResult
            });
          }
        }

      } catch (stripeError) {
        console.error(`[RECONCILE] Error processing ${subscriber.user_id}:`, stripeError);
        results.errors.push(`Stripe error for ${subscriber.user_id}: ${stripeError instanceof Error ? stripeError.message : String(stripeError)}`);
      }
    }

    console.log(`[RECONCILE] Complete. Checked: ${results.checked}, Updated: ${results.updated}, Credits Reset: ${results.creditsReset}, Errors: ${results.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        checked: results.checked,
        updated: results.updated,
        creditsReset: results.creditsReset,
        errorCount: results.errors.length
      },
      details: results.details,
      errors: results.errors
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("[RECONCILE] Fatal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
