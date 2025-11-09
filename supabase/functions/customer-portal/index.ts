import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CUSTOMER-PORTAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated or email not available");
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    log("Searching for Stripe customer", { email: user.email });

    // Procurar cliente Stripe existente
    let customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string;

    if (customers.data.length === 0) {
      // Cliente não existe - criar novo
      log("No Stripe customer found, creating new customer");
      
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
          created_via: 'customer_portal_auto_creation'
        }
      });
      
      customerId = newCustomer.id;
      log("Created new Stripe customer", { customerId });
      
      // Atualizar a tabela subscribers com o novo stripe_customer_id
      const { error: updateError } = await supabaseService
        .from('subscribers')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
        
      if (updateError) {
        console.error("Error updating stripe_customer_id:", updateError);
        // Não falhar se a atualização falhar - o portal ainda funcionará
      }
    } else {
      customerId = customers.data[0].id;
      log("Found existing Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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