import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  console.log("[WEBHOOK] Received request");
  
  if (!signature) {
    console.error("[WEBHOOK] Missing stripe-signature header");
    return new Response("Missing signature", { status: 400, headers: corsHeaders });
  }
  
  if (!stripeKey || !webhookSecret) {
    console.error("[WEBHOOK] Missing Stripe credentials");
    return new Response("Server configuration error", { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const body = await req.text();
  
  let event: Stripe.Event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`[WEBHOOK] Event verified: ${event.type} (${event.id})`);
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        
        console.log(`[WEBHOOK] Checkout completed - User: ${userId}, Plan: ${planId}`);
        
        if (!userId) {
          console.error("[WEBHOOK] Missing user_id in session metadata");
          break;
        }

        // Get subscription details from Stripe
        if (!session.subscription) {
          console.error("[WEBHOOK] No subscription in checkout session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        
        // Retrieve session with discount details expanded to detect promo codes
        let promoCodeUsed: string | null = null;
        try {
          const sessionWithDiscounts = await stripe.checkout.sessions.retrieve(
            session.id,
            { expand: ['total_details.breakdown'] }
          );
          
          const breakdown = sessionWithDiscounts.total_details?.breakdown as any;
          const discounts = breakdown?.discounts || [];
          
          for (const discount of discounts) {
            if (discount.discount?.promotion_code) {
              try {
                const promoCode = await stripe.promotionCodes.retrieve(
                  discount.discount.promotion_code as string
                );
                promoCodeUsed = promoCode.code;
                console.log(`[WEBHOOK] Promo code detected: ${promoCodeUsed}`);
              } catch (e) {
                console.error('[WEBHOOK] Failed to retrieve promo code details:', e);
              }
            }
          }
        } catch (e) {
          console.error('[WEBHOOK] Failed to retrieve session discounts:', e);
        }
        
        // Map plan_id to tier
        const tierMap: Record<string, string> = {
          founders: "Founders",
          starter: "Starter",
          plus: "Plus",
          pro: "Pro"
        };
        
        const tier = tierMap[planId as string] || "Free";
        
        // Credit allocation map (base credits)
        const creditMap: Record<string, number> = {
          Founders: 80,
          Starter: 80,
          Plus: 200,
          Pro: 400,
          Free: 10
        };
        
        let credits = creditMap[tier];
        
        // PROV15 promo code gives 10% bonus credits on Plus and Pro plans only
        if (promoCodeUsed === 'PROV15' && (tier === 'Plus' || tier === 'Pro')) {
          const bonusCredits = Math.floor(credits * 0.10);
          credits += bonusCredits;
          console.log(`[WEBHOOK] PROV15 bonus applied: +${bonusCredits} credits (total: ${credits})`);
        }
        
        console.log(`[WEBHOOK] Activating ${tier} subscription with ${credits} credits${promoCodeUsed ? ` (promo: ${promoCodeUsed})` : ''}`);
        
        // Update subscriber in database
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            subscribed: true,
            subscription_tier: tier,
            subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
            last_reset_at: new Date().toISOString()
          })
          .eq("user_id", userId);
        
        if (updateError) {
          console.error("[WEBHOOK] Failed to update subscriber:", updateError);
          throw updateError;
        }
        
        // Allocate credits via RPC function
        const { data: creditResult, error: creditError } = await supabase.rpc("refund_user_credits", {
          p_user_id: userId,
          p_amount: credits,
          p_reason: `${tier} subscription activated via webhook`
        });
        
        if (creditError) {
          console.error("[WEBHOOK] Failed to allocate credits:", creditError);
          throw creditError;
        }
        
        console.log(`[WEBHOOK] ✓ Subscription activated for user ${userId}: ${tier} tier with ${credits} credits`);
        console.log(`[WEBHOOK] Credit allocation result:`, creditResult);
        
        // Sync tier change to MailerLite
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('id', userId)
            .single();
          
          if (profileData?.email) {
            const syncResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-mailerlite`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                },
                body: JSON.stringify({
                  action: 'update',
                  email: profileData.email,
                  name: profileData.name || '',
                  subscription_tier: tier,
                  newsletter_subscribed: true
                })
              }
            );
            
            if (syncResponse.ok) {
              console.log(`[WEBHOOK] ✓ MailerLite synced for ${profileData.email} -> ${tier}`);
            } else {
              console.error(`[WEBHOOK] MailerLite sync failed:`, await syncResponse.text());
            }
          }
        } catch (mlError) {
          console.error("[WEBHOOK] MailerLite sync error (non-fatal):", mlError);
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        // Handle recurring payments
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log(`[WEBHOOK] Invoice payment succeeded for customer: ${customerId}`);
        
        // Find user by stripe_customer_id
        const { data: subscriber, error: fetchError } = await supabase
          .from("subscribers")
          .select("user_id, subscription_tier")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (fetchError || !subscriber) {
          console.error("[WEBHOOK] Could not find subscriber for customer:", customerId);
          break;
        }
        
        // Reset monthly credits
        const { data: resetResult, error: resetError } = await supabase.rpc("reset_user_monthly_credits", {
          p_user_id: subscriber.user_id
        });
        
        if (resetError) {
          console.error("[WEBHOOK] Failed to reset monthly credits:", resetError);
          throw resetError;
        }
        
        console.log(`[WEBHOOK] ✓ Monthly credits reset for ${subscriber.user_id}`);
        console.log(`[WEBHOOK] Reset result:`, resetResult);
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        console.log(`[WEBHOOK] Subscription updated for customer: ${customerId}`);
        
        // Update subscription end date
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          console.error("[WEBHOOK] Failed to update subscription end date:", updateError);
          throw updateError;
        }
        
        console.log(`[WEBHOOK] ✓ Subscription end date updated`);
        break;
      }
      
      case "customer.subscription.deleted": {
        // Handle cancellation
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        console.log(`[WEBHOOK] Subscription cancelled for customer: ${customerId}`);
        
        // Find user first to get their ID for MailerLite sync
        const { data: cancelledSubscriber } = await supabase
          .from("subscribers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            subscribed: false,
            subscription_tier: "Free",
            subscription_end: null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          console.error("[WEBHOOK] Failed to cancel subscription:", updateError);
          throw updateError;
        }
        
        console.log(`[WEBHOOK] ✓ Subscription cancelled for customer ${customerId}`);
        
        // Sync downgrade to MailerLite
        if (cancelledSubscriber?.user_id) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, name')
              .eq('id', cancelledSubscriber.user_id)
              .single();
            
            if (profileData?.email) {
              const syncResponse = await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-mailerlite`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                  },
                  body: JSON.stringify({
                    action: 'update',
                    email: profileData.email,
                    name: profileData.name || '',
                    subscription_tier: 'Free',
                    newsletter_subscribed: true
                  })
                }
              );
              
              if (syncResponse.ok) {
                console.log(`[WEBHOOK] ✓ MailerLite synced for ${profileData.email} -> Free (cancelled)`);
              } else {
                console.error(`[WEBHOOK] MailerLite sync failed:`, await syncResponse.text());
              }
            }
          } catch (mlError) {
            console.error("[WEBHOOK] MailerLite sync error (non-fatal):", mlError);
          }
        }
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log(`[WEBHOOK] ⚠️ Payment failed for customer: ${customerId}`);
        // Could send notification to user here
        break;
      }
      
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true, event_type: event.type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error("[WEBHOOK] Error processing webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Webhook processing failed", 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
