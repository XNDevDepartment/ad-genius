
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
    const activeSub = subscriptions.data.find(s => ['active', 'trialing'].includes(s.status));
    const pendingSub = subscriptions.data.find(s => ['incomplete', 'past_due'].includes(s.status));
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

    // Check if tier changed to allocate credits
    const { data: existingSubscriber } = await supabaseService
      .from("subscribers")
      .select("subscription_tier, credits_balance, last_reset_at, updated_at")
      .eq("user_id", user.id)
      .single();

    let shouldAllocateCredits = false;
    
    // Priority 1: New subscriber with active subscription
    if (!existingSubscriber) {
      shouldAllocateCredits = active;
      log("New subscriber detected", { active, subscriptionTier });
    } 
    // Priority 2: Free → Paid transition (ALWAYS allocate, ignore time check)
    else if (existingSubscriber.subscription_tier === 'Free' && subscriptionTier !== 'Free' && active) {
      shouldAllocateCredits = true;
      log("Free to paid upgrade detected - allocating credits immediately", {
        from: existingSubscriber.subscription_tier,
        to: subscriptionTier
      });
    }
    // Priority 3: Paid tier change (use time safeguard)
    else if (existingSubscriber.subscription_tier !== subscriptionTier && active) {
      const lastAllocation = existingSubscriber.last_reset_at || existingSubscriber.updated_at;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (!lastAllocation || new Date(lastAllocation) < oneHourAgo) {
        shouldAllocateCredits = true;
        log("Tier change detected", { 
          from: existingSubscriber.subscription_tier, 
          to: subscriptionTier,
          lastAllocation 
        });
      } else {
        log("Tier change detected but skipping allocation (too recent)", { 
          lastAllocation,
          timeSinceLastAllocation: Date.now() - new Date(lastAllocation).getTime()
        });
      }
    }
    
    log("Credit allocation decision", {
      shouldAllocate: shouldAllocateCredits,
      existingTier: existingSubscriber?.subscription_tier,
      newTier: subscriptionTier,
      isActive: active
    });

    // Update subscriber record
    await supabaseService.from("subscribers").upsert({
      email: user.email!,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: active,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
      // Update last_reset_at when allocating credits
      ...(shouldAllocateCredits ? { last_reset_at: new Date().toISOString() } : {})
    }, { onConflict: "email" });

    // Allocate credits if needed (Option B: Add to existing balance)
    if (shouldAllocateCredits) {
      const tierCredits = {
        'Free': 0, // Don't add credits for free tier
        'Starter': 80,
        'Plus': 200,
        'Pro': 400,
        'Founders': 80
      };
      
      const creditsToAdd = tierCredits[subscriptionTier as keyof typeof tierCredits] || 0;
      
      if (creditsToAdd > 0) {
        const { error: creditError } = await supabaseService.rpc('refund_user_credits', {
          p_user_id: user.id,
          p_amount: creditsToAdd,
          p_reason: `subscription_upgrade_${subscriptionTier.toLowerCase()}`
        });
        
        if (creditError) {
          log("Credit allocation error", creditError);
        } else {
          log("Credits allocated", { userId: user.id, tier: subscriptionTier, credits: creditsToAdd });
        }
      }
    }

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
