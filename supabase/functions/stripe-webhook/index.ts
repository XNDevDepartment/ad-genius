import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Meta Conversions API helper functions
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendMetaConversionEvent(eventData: {
  event_name: string;
  event_time: number;
  event_id: string;
  user_data: {
    em?: string;  // hashed email
    client_ip_address?: string;
    client_user_agent?: string;
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_type?: string;
  };
}) {
  const PIXEL_ID = '3052150201636830';
  const ACCESS_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN');
  
  if (!ACCESS_TOKEN) {
    console.log('[META CAPI] No access token configured, skipping');
    return;
  }

  const payload = {
    data: [{
      ...eventData,
      action_source: 'website',
      event_source_url: 'https://produktpix.com/success'
    }]
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    
    const result = await response.json();
    console.log('[META CAPI] Event sent:', eventData.event_name, result);
  } catch (error) {
    console.error('[META CAPI] Failed to send event:', error);
  }
}

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

        // Check if this is a one-time payment
        const isOneTimePayment = session.metadata?.payment_mode === 'one_time';

        if (!session.subscription && !isOneTimePayment) {
          console.error("[WEBHOOK] No subscription in checkout session and not a one-time payment");
          break;
        }

        let subscription: Stripe.Subscription | null = null;
        if (session.subscription) {
          subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
        }
        
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
          pro: "Pro",
          christmas: "Starter" // Christmas promo gives Starter tier benefits
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
        
        // 1MES promo: limit first month to 35 credits instead of 80
        if (promoCodeUsed === '1MES') {
          credits = 35;
          console.log('[WEBHOOK] 1MES promo: limiting credits to 35');
        }
        
        console.log(`[WEBHOOK] Activating ${tier} subscription with ${credits} credits${promoCodeUsed ? ` (promo: ${promoCodeUsed})` : ''}`);
        
        // Calculate subscription end date
        let subscriptionEndDate: string;
        if (isOneTimePayment) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
          subscriptionEndDate = endDate.toISOString();
        } else {
          subscriptionEndDate = new Date(subscription!.current_period_end * 1000).toISOString();
        }

        // Update subscriber in database
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            subscribed: true,
            subscription_tier: tier,
            subscription_end: subscriptionEndDate,
            stripe_customer_id: session.customer as string,
            payment_type: isOneTimePayment ? 'one_time' : 'subscription',
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
        
        // Track purchase with Meta Conversions API (server-side)
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();
          
          if (profileData?.email) {
            const planPrices: Record<string, { monthly: number; yearly: number }> = {
              Founders: { monthly: 19.99, yearly: 239.88 },
              Starter: { monthly: 29, yearly: 290 },
              Plus: { monthly: 49, yearly: 490 },
              Pro: { monthly: 99, yearly: 990 }
            };
            
            const prices = planPrices[tier] || planPrices.Starter;
            
            // Determine if yearly based on subscription period
            let isYearly = false;
            if (subscription) {
              const periodEnd = subscription.current_period_end;
              const periodStart = subscription.current_period_start;
              const daysInPeriod = (periodEnd - periodStart) / (60 * 60 * 24);
              isYearly = daysInPeriod > 60;
            }
            
            const purchaseValue = isYearly ? prices.yearly : prices.monthly;
            const hashedEmail = await hashEmail(profileData.email);
            
            await sendMetaConversionEvent({
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              event_id: `purchase_${session.id}`, // Unique ID for deduplication with client-side
              user_data: {
                em: hashedEmail
              },
              custom_data: {
                value: purchaseValue,
                currency: 'EUR',
                content_name: `${tier}${isYearly ? ' Yearly' : ' Monthly'}`,
                content_type: 'product'
              }
            });
            
            console.log(`[WEBHOOK] ✓ Meta CAPI Purchase tracked: ${tier} ${isYearly ? 'Yearly' : 'Monthly'} - €${purchaseValue}`);
          }
        } catch (capiError) {
          console.error('[WEBHOOK] Meta CAPI tracking failed (non-fatal):', capiError);
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
        
        // Get subscription details from Stripe to update subscription_end
        let newSubscriptionEnd: string | null = null;
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string
            );
            newSubscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            console.log(`[WEBHOOK] Retrieved subscription end date: ${newSubscriptionEnd}`);
          } catch (subError) {
            console.error("[WEBHOOK] Failed to retrieve subscription details:", subError);
          }
        }
        
        // Clear any payment failure status, reset to active, and update subscription_end
        const updateData: Record<string, any> = { 
          payment_failed_at: null,
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        };
        
        if (newSubscriptionEnd) {
          updateData.subscription_end = newSubscriptionEnd;
        }
        
        await supabase
          .from("subscribers")
          .update(updateData)
          .eq("stripe_customer_id", customerId);
        
        console.log(`[WEBHOOK] ✓ Updated subscriber: status=active, subscription_end=${newSubscriptionEnd || 'unchanged'}`);
        
        // Clear dunning notifications for this user
        await supabase
          .from("dunning_notifications")
          .delete()
          .eq("user_id", subscriber.user_id);
        
        console.log(`[WEBHOOK] ✓ Cleared dunning notifications for ${subscriber.user_id}`);
        
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
            subscription_status: "canceled",
            subscription_end: null,
            payment_failed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);
        
        if (updateError) {
          console.error("[WEBHOOK] Failed to cancel subscription:", updateError);
          throw updateError;
        }
        
        // Clear dunning notifications
        if (cancelledSubscriber?.user_id) {
          await supabase
            .from("dunning_notifications")
            .delete()
            .eq("user_id", cancelledSubscriber.user_id);
        }
        
        console.log(`[WEBHOOK] ✓ Subscription cancelled for customer ${customerId}`);
        
        // Get user credits before sending email
        let remainingCredits = 0;
        if (cancelledSubscriber?.user_id) {
          const { data: subscriberData } = await supabase
            .from("subscribers")
            .select("credits_balance")
            .eq("user_id", cancelledSubscriber.user_id)
            .single();
          remainingCredits = subscriberData?.credits_balance || 0;
        }
        
        // Sync downgrade to MailerLite and send cancellation email
        if (cancelledSubscriber?.user_id) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, name')
              .eq('id', cancelledSubscriber.user_id)
              .single();
            
            if (profileData?.email) {
              // Sync to MailerLite
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
              
              // Send cancellation email via Resend
              const resendApiKey = Deno.env.get("RESEND_API_KEY");
              if (resendApiKey) {
                const userName = profileData.name || 'there';
                const emailResponse = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from: 'ProduktPix <noreply@produktpix.com>',
                    to: [profileData.email],
                    subject: `We're sorry to see you go, ${userName}!`,
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      </head>
                      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                          <h1 style="color: #7c3aed; margin: 0;">ProduktPix</h1>
                        </div>
                        
                        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                          <h2 style="color: #1e293b; margin-top: 0;">Thank you for being a customer! 💜</h2>
                          <p>Hi ${userName},</p>
                          <p>We're sad to see you go, but we understand. Your subscription has been cancelled and you've been moved to our Free plan.</p>
                        </div>
                        
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                          <h3 style="color: #166534; margin-top: 0;">✨ Good news!</h3>
                          <p style="margin-bottom: 0;">You still have <strong>${remainingCredits} credits</strong> remaining in your account. These credits won't expire, so you can use them anytime!</p>
                        </div>
                        
                        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                          <h3 style="margin-top: 0;">What happens now:</h3>
                          <ul style="margin-bottom: 0;">
                            <li>Your account is now on the <strong>Free plan</strong> (10 credits/month)</li>
                            <li>You keep all your previously generated images</li>
                            <li>Your remaining ${remainingCredits} credits are still available</li>
                          </ul>
                        </div>
                        
                        <div style="text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                          <h3 style="color: white; margin-top: 0;">Miss us? Come back anytime!</h3>
                          <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">Resubscribe and get instant access to all premium features.</p>
                          <a href="https://produktpix.com/pricing" style="display: inline-block; background: white; color: #7c3aed; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Resubscribe Now</a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                          If you have any feedback or questions, we'd love to hear from you at <a href="mailto:info@produktpix.com" style="color: #7c3aed;">info@produktpix.com</a>
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} ProduktPix. All rights reserved.<br>
                          <a href="https://produktpix.com" style="color: #7c3aed;">produktpix.com</a>
                        </p>
                      </body>
                      </html>
                    `
                  })
                });
                
                if (emailResponse.ok) {
                  console.log(`[WEBHOOK] ✓ Cancellation email sent to ${profileData.email}`);
                } else {
                  const errorText = await emailResponse.text();
                  console.error(`[WEBHOOK] Failed to send cancellation email:`, errorText);
                }
              } else {
                console.log("[WEBHOOK] No RESEND_API_KEY configured, skipping cancellation email");
              }
            }
          } catch (mlError) {
            console.error("[WEBHOOK] MailerLite/email sync error (non-fatal):", mlError);
          }
        }
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log(`[WEBHOOK] ⚠️ Payment failed for customer: ${customerId}`);
        
        // Find user and update payment_failed_at
        const { data: failedSubscriber, error: failedFetchError } = await supabase
          .from("subscribers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (failedFetchError || !failedSubscriber) {
          console.error("[WEBHOOK] Could not find subscriber for failed payment:", customerId);
          break;
        }
        
        // Set payment_failed_at timestamp and subscription_status
        // Only set payment_failed_at if not already set (first failure)
        const { data: currentSubscriber } = await supabase
          .from("subscribers")
          .select("payment_failed_at")
          .eq("stripe_customer_id", customerId)
          .single();
        
        const updates: Record<string, any> = {
          subscription_status: 'past_due',
          updated_at: new Date().toISOString()
        };
        
        // Only set payment_failed_at on first failure
        if (!currentSubscriber?.payment_failed_at) {
          updates.payment_failed_at = new Date().toISOString();
        }
        
        const { error: updateFailedError } = await supabase
          .from("subscribers")
          .update(updates)
          .eq("stripe_customer_id", customerId);
        
        if (updateFailedError) {
          console.error("[WEBHOOK] Failed to update payment status:", updateFailedError);
        } else {
          console.log(`[WEBHOOK] ✓ Set subscription_status to past_due for customer ${customerId}`);
        }
        
        // Record day_0 notification
        await supabase.from("dunning_notifications").upsert({
          user_id: failedSubscriber.user_id,
          notification_type: 'day_0',
          sent_at: new Date().toISOString()
        }, { onConflict: 'user_id,notification_type' });
        
        // Get user email and send notification email
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('id', failedSubscriber.user_id)
            .single();
          
          if (profileData?.email) {
            // Send payment failed email via Resend
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (resendApiKey) {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'ProduktPix <noreply@produktpix.com>',
                  to: [profileData.email],
                  subject: 'Action Required: Payment Failed for Your ProduktPix Subscription',
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin: 0;">ProduktPix</h1>
                      </div>
                      
                      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #dc2626; margin-top: 0;">⚠️ Payment Failed</h2>
                        <p>Hi${profileData.name ? ` ${profileData.name}` : ''},</p>
                        <p>We were unable to process your payment for your ProduktPix subscription. This may be due to:</p>
                        <ul>
                          <li>Expired credit card</li>
                          <li>Insufficient funds</li>
                          <li>Card declined by your bank</li>
                        </ul>
                      </div>
                      
                      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0;">What to do next:</h3>
                        <ol>
                          <li>Log in to your ProduktPix account</li>
                          <li>Go to Account → Billing</li>
                          <li>Update your payment method</li>
                        </ol>
                        <p style="text-align: center; margin-top: 20px;">
                          <a href="https://produktpix.com/account" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Update Payment Method</a>
                        </p>
                      </div>
                      
                      <p style="color: #6b7280; font-size: 14px;">
                        If you have any questions or need assistance, please contact us at <a href="mailto:info@produktpix.com" style="color: #7c3aed;">info@produktpix.com</a>
                      </p>
                      
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                      
                      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} ProduktPix. All rights reserved.
                      </p>
                    </body>
                    </html>
                  `
                })
              });
              
              if (emailResponse.ok) {
                console.log(`[WEBHOOK] ✓ Payment failed email sent to ${profileData.email}`);
              } else {
                const errorText = await emailResponse.text();
                console.error(`[WEBHOOK] Failed to send payment failed email:`, errorText);
              }
            } else {
              console.error("[WEBHOOK] RESEND_API_KEY not configured, skipping email notification");
            }
          }
        } catch (emailError) {
          console.error("[WEBHOOK] Error sending payment failed email (non-fatal):", emailError);
        }
        
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
