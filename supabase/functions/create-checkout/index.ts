
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    
    console.log('[create-checkout] Request received, hasAuthHeader:', !!authHeader, 'tokenLength:', token.length);
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      console.error('[create-checkout] Auth error:', userError.message);
      throw new Error("User not authenticated: " + userError.message);
    }
    
    if (!userData.user?.email) {
      console.error('[create-checkout] No user email found');
      throw new Error("User email not available");
    }
    
    const user = userData.user;
    console.log('[create-checkout] User authenticated:', user.email);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get request body
    const { planId, interval = 'month', promoCode } = await req.json();
    
    console.log('[create-checkout] Checkout params:', { planId, interval, promoCode: promoCode || 'none' });

    // Define plan pricing
    const planPricing = {
      founders: { monthly: 1999, yearly: 23988 }, // €19.99/month, €239.88/year (12 months)
      starter: { monthly: 2900, yearly: 29004 }, // €29/month, €290.04/year (€24.17/month × 12)
      plus: { monthly: 4900, yearly: 48996 },   // €49/month, €489.96/year (€40.83/month × 12)
      pro: { monthly: 9900, yearly: 99000 },     // €99/month, €990/year (€82.50/month × 12)
      christmas: { monthly: 1999, yearly: 19988 }, // €19.99/month, €199.88/year (Christmas 2025 promo)
      onboarding_first_month: { monthly: 1999, yearly: null } // €19.99 first month special (Starter tier)
    };

    // Validate pricing to prevent future bugs
    const validatePricing = () => {
      if (planPricing.founders.yearly !== planPricing.founders.monthly * 12) {
        console.error('PRICING ERROR: Founders yearly should be 12x monthly!', {
          expected: planPricing.founders.monthly * 12,
          actual: planPricing.founders.yearly
        });
      }
    };
    validatePricing();

    const planNames = {
      founders: 'Founders Plan',
      starter: 'Starter Plan',
      plus: 'Plus Plan', 
      pro: 'Pro Plan',
      christmas: 'Promoção de Natal 2025',
      onboarding_first_month: 'First Month Special - Starter'
    };

    if (!planPricing[planId as keyof typeof planPricing]) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    const pricing = planPricing[planId as keyof typeof planPricing];
    const unitAmount = interval === 'year' ? pricing.yearly : pricing.monthly;
    const planName = planNames[planId as keyof typeof planNames];

    // Try to find existing customer by email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    // Look up promotion code ID if a code string was provided
    let promotionCodeId: string | undefined;
    let adHocCouponId: string | undefined;

    if (promoCode === '1MES') {
      // The 1MES Stripe coupon is restricted to specific products, but we use
      // dynamic price_data (inline products). Create an ad-hoc unrestricted
      // coupon so the discount applies regardless of product.
      try {
        const coupon = await stripe.coupons.create({
          amount_off: 1901,   // 29.00 − 19.01 = 9.99 EUR first month
          currency: 'eur',
          duration: 'once',
          name: '1MES First Month',
        });
        adHocCouponId = coupon.id;
        console.log('[create-checkout] Created ad-hoc coupon for 1MES:', adHocCouponId);
      } catch (err) {
        console.error('[create-checkout] Failed to create ad-hoc coupon for 1MES:', err);
      }
    } else if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1
        });
        if (promoCodes.data.length > 0) {
          promotionCodeId = promoCodes.data[0].id;
          console.log('Found promotion code:', promoCode, '→', promotionCodeId);
        } else {
          console.warn('Promotion code not found or inactive:', promoCode);
        }
      } catch (err) {
        console.error('Error looking up promotion code:', err);
      }
    }

    // Log checkout session creation for tracking
    console.log('Creating checkout session:', {
      planId,
      interval,
      unitAmount,
      customerId: customerId || 'new',
      userEmail: user.email,
      promoCode: promoCode || null,
      promotionCodeId: promotionCodeId || null
    });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      // Use discounts if promo code / ad-hoc coupon found, otherwise allow manual entry
      ...(adHocCouponId
        ? { discounts: [{ coupon: adHocCouponId }] }
        : promotionCodeId 
          ? { discounts: [{ promotion_code: promotionCodeId }] }
          : { allow_promotion_codes: true }
      ),
      tax_id_collection: { enabled: true },
      billing_address_collection: 'required',
      // custom_fields: [
      //   { key: 'nif', label: { type: 'custom', custom: 'NIF (optional)' }, type: 'text', optional: true }
      // ],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: planName,
              description: planId === 'founders' 
                ? `Limited-time Founders subscription with lifetime pricing guarantee! (Billed ${interval === 'year' ? 'annually' : 'monthly'})` 
                : interval === 'year' 
                  ? 'Annual subscription (2 months free! Billed annually)' 
                  : 'Monthly subscription (Billed monthly)',
            },
            unit_amount: unitAmount,
            recurring: { interval: interval as 'month' | 'year' },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        plan_id: planId,
        user_id: user.id,
        promo_code: promoCode || null
      }
    });

    console.log('[create-checkout] Session created:', { 
      sessionId: session.id, 
      hasUrl: !!session.url 
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[create-checkout] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
