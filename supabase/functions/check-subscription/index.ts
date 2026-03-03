
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated or email not available");
    const user = userData.user;
    log("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });

    if (customers.data.length === 0) {
      log("No customer found, marking Free");
      await supabaseService.from("subscribers").upsert({
        email: user.email!,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: "Free",
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
      return new Response(JSON.stringify({ subscribed: false, subscription_tier: "Free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    // Fetch all subscriptions (not just active) to catch trialing, incomplete, past_due
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
  const activeSub = subscriptions.data.find((s: any) => ['active', 'trialing'].includes(s.status));
    const pendingSub = subscriptions.data.find((s: any) => ['incomplete', 'past_due'].includes(s.status));
    const subscription = activeSub || pendingSub;
    const active = !!activeSub;
    const pending = !activeSub && !!pendingSub;
    let subscriptionEnd: string | null = null;
    let subscriptionTier = "Free";

    if (subscription) {
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine tier based on price amount
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      // Map price amounts to tiers (in cents) - using ranges to handle variations
      if (amount >= 1900 && amount <= 2099) { // €19-€20.99 range - Founders tier
        subscriptionTier = "Founders";
      } else if (amount >= 8200 && amount <= 9900) { // €82-€99 range
        subscriptionTier = "Pro";
      } else if (amount >= 4000 && amount <= 4900) { // €40-€49 range
        subscriptionTier = "Plus";
      } else if (amount >= 2400 && amount <= 2900) { // €24-€29 range
        subscriptionTier = "Starter";
      } else {
        // Fallback based on amount ranges
        if (amount >= 8000) subscriptionTier = "Pro";
        else if (amount >= 4000) subscriptionTier = "Plus";  
        else if (amount >= 2000) subscriptionTier = "Starter";
      }
      
      log("Determined subscription tier", { amount, subscriptionTier });
    }

    // Check for one-time payment users
    const { data: existingSubscriber } = await supabaseService
      .from("subscribers")
      .select("subscription_tier, credits_balance, last_reset_at, updated_at, payment_type, subscription_end")
      .eq("user_id", user.id)
      .single();

    // Handle one-time payment users — skip Stripe subscription lookup
    if (existingSubscriber?.payment_type === 'one_time') {
      const isStillActive = existingSubscriber.subscription_end && 
        new Date(existingSubscriber.subscription_end) > new Date();
      
      if (isStillActive) {
        log("One-time payment user still active", { 
          tier: existingSubscriber.subscription_tier, 
          expires: existingSubscriber.subscription_end 
        });
        return new Response(JSON.stringify({ 
          subscribed: true, 
          subscription_tier: existingSubscriber.subscription_tier,
          subscription_end: existingSubscriber.subscription_end,
          payment_type: 'one_time'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        log("One-time payment expired, downgrading to Free");
        await supabaseService.from("subscribers").update({
          subscribed: false,
          subscription_tier: "Free",
          payment_type: 'one_time',
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        
        return new Response(JSON.stringify({ 
          subscribed: false, 
          subscription_tier: "Free",
          payment_type: 'one_time'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Sync subscription status only — NO credit allocation here
    // Credits are allocated exclusively by the stripe-webhook function
    log("Syncing subscription status (no credit allocation)", {
      existingTier: existingSubscriber?.subscription_tier,
      newTier: subscriptionTier,
      isActive: active
    });

    // Update subscriber record (status sync only)
    await supabaseService.from("subscribers").upsert({
      email: user.email!,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: active,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    return new Response(JSON.stringify({ 
      subscribed: active, 
      subscription_tier: subscriptionTier, 
      subscription_end: subscriptionEnd,
      pending: pending
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
