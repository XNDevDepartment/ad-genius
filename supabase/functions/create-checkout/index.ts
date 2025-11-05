
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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated or email not available");
    const user = userData.user;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get request body
    const { planId, interval = 'month' } = await req.json();

    // Define plan pricing
    const planPricing = {
      founders: { monthly: 1999, yearly: 23988 }, // €19.99/month, €239.88/year (12 months)
      starter: { monthly: 2900, yearly: 2417 }, // €29/month, €24.17/month when billed yearly
      plus: { monthly: 4900, yearly: 4083 },   // €49/month, €40.83/month when billed yearly
      pro: { monthly: 9900, yearly: 8250 }     // €99/month, €82.50/month when billed yearly
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
      pro: 'Pro Plan'
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

    // Log checkout session creation for tracking
    console.log('Creating checkout session:', {
      planId,
      interval,
      unitAmount,
      customerId: customerId || 'new',
      userEmail: user.email
    });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      allow_promotion_codes: true,
      
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
        user_id: user.id
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
