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

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    if (action === "sync") {
      return await handleSync(supabase, user.id, body);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Only 'sync' is supported." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("shopify-sync error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSync(supabase: any, userId: string, body: any) {
  const { connectionId } = body;

  // Query shopify_store_connections (new table)
  const { data: conn, error: connErr } = await supabase
    .from("shopify_store_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .single();

  if (connErr || !conn) {
    console.error("Connection lookup failed:", connErr);
    return new Response(JSON.stringify({ error: "Connection not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await syncProducts(supabase, userId, conn.id, conn.shop_domain);

  // Update last_sync_at on the connection
  await supabase
    .from("shopify_store_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", conn.id);

  return new Response(JSON.stringify({ success: true, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function syncProducts(
  supabase: any,
  userId: string,
  connectionId: string,
  shopDomain: string
) {
  let allProducts: any[] = [];
  let page = 1;
  let hasMore = true;

  // Normalize domain
  let domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Paginate through all products using public products.json endpoint
  while (hasMore) {
    const url = `https://${domain}/products.json?limit=250&page=${page}`;
    console.log(`Fetching products page ${page}:`, url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      throw new Error("Your Shopify store appears to be password-protected. Please remove the storefront password in Shopify Admin → Online Store → Preferences before syncing.");
    }

    if (!res.ok) {
      console.error("Shopify public API error:", res.status, await res.text());
      break;
    }

    const data = await res.json();
    const products = data.products || [];
    allProducts = allProducts.concat(products);

    // If we got fewer than 250 products, we've reached the last page
    hasMore = products.length === 250;
    page++;
  }

  console.log(`Fetched ${allProducts.length} total products from ${domain}`);

  // Map products to shopify_products schema
  const upsertData = allProducts.map((p: any) => {
    const firstVariant = p.variants?.[0];
    return {
      user_id: userId,
      shopify_connection_id: connectionId,
      shopify_product_id: p.id,
      title: p.title,
      description: p.body_html || null,
      sku: firstVariant?.sku || null,
      vendor: p.vendor || null,
      product_type: p.product_type || null,
      status: p.status || "active",
      image_url: p.image?.src || p.images?.[0]?.src || null,
      images: p.images || [],
      variants: p.variants || [],
      synced_at: new Date().toISOString(),
    };
  });

  let synced = 0;
  // Batch upsert in chunks of 50
  for (let i = 0; i < upsertData.length; i += 50) {
    const batch = upsertData.slice(i, i + 50);
    const { error } = await supabase
      .from("shopify_products")
      .upsert(batch, { onConflict: "user_id,shopify_product_id" });

    if (error) {
      console.error("Upsert error:", error);
    } else {
      synced += batch.length;
    }
  }

  return { synced, total: allProducts.length };
}
