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
    if (userError || !userData.user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const invoices = await stripe.invoices.list({
      customer: customers.data[0].id,
      limit: 20,
    });

    return new Response(JSON.stringify({ 
      invoices: invoices.data.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        date: invoice.created * 1000,
        pdfUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
        description: invoice.lines.data[0]?.description || 'Subscription',
      }))
    }), {
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
