import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin
    const { data: isAdmin } = await supabase.rpc("is_user_admin", {
      check_user_id: user.id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query Stripe for paid invoices in the last 30 days
    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
    );

    const invoicesUrl = new URL("https://api.stripe.com/v1/invoices");
    invoicesUrl.searchParams.set("status", "paid");
    invoicesUrl.searchParams.set("created[gte]", thirtyDaysAgo.toString());
    invoicesUrl.searchParams.set("limit", "100");

    let totalRevenue = 0;
    let invoiceCount = 0;
    const planBreakdown: Record<
      string,
      { count: number; revenue: number }
    > = {};
    let hasMore = true;
    let startingAfter: string | null = null;

    while (hasMore) {
      const url = new URL(invoicesUrl.toString());
      if (startingAfter) url.searchParams.set("starting_after", startingAfter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Basic ${btoa(stripeSecretKey + ":")}` },
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      for (const invoice of data.data || []) {
        const amount = (invoice.amount_paid || 0) / 100; // cents to euros
        totalRevenue += amount;
        invoiceCount++;

        // Try to get plan name from line items
        const planName =
          invoice.lines?.data?.[0]?.price?.product_name ||
          invoice.lines?.data?.[0]?.description ||
          "Unknown";
        if (!planBreakdown[planName]) {
          planBreakdown[planName] = { count: 0, revenue: 0 };
        }
        planBreakdown[planName].count++;
        planBreakdown[planName].revenue += amount;

        startingAfter = invoice.id;
      }

      hasMore = data.has_more;
    }

    // Get active subscriptions count from Stripe
    const subsRes = await fetch(
      "https://api.stripe.com/v1/subscriptions?status=active&limit=1",
      {
        headers: { Authorization: `Basic ${btoa(stripeSecretKey + ":")}` },
      }
    );
    const subsData = await subsRes.json();
    const activeSubscriptions = subsData.total_count || 0;

    // Get credits stats from DB using service role (no row limit issue)
    const { data: creditsUsed } = await supabase.rpc("admin_sum_credits_used");
    const { data: creditsBalance } = await supabase.rpc(
      "admin_sum_credits_balance"
    );

    return new Response(
      JSON.stringify({
        stripe_mrr: totalRevenue,
        invoice_count: invoiceCount,
        active_subscriptions: activeSubscriptions,
        plan_breakdown: Object.entries(planBreakdown).map(([plan, data]) => ({
          plan,
          ...data,
        })),
        credits_used_total: creditsUsed || 0,
        credits_balance_total: creditsBalance || 0,
        synced_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("admin-revenue-stats error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
