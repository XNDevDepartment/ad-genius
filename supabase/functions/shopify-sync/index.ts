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

    if (action === "connect") {
      return await handleConnect(supabase, user.id, body);
    } else if (action === "sync") {
      return await handleSync(supabase, user.id, body);
    } else if (action === "disconnect") {
      return await handleDisconnect(supabase, user.id, body);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("shopify-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleConnect(supabase: any, userId: string, body: any) {
  const { shopDomain, accessToken } = body;
  if (!shopDomain || !accessToken) {
    return new Response(JSON.stringify({ error: "shopDomain and accessToken are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Normalize domain
  const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Verify the token works by calling Shopify
  const verifyRes = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });

  if (!verifyRes.ok) {
    return new Response(JSON.stringify({ error: "Invalid Shopify credentials. Could not connect to store." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Upsert connection
  const { data, error } = await supabase
    .from("shopify_connections")
    .upsert(
      { user_id: userId, shop_domain: domain, access_token: accessToken, connected_at: new Date().toISOString() },
      { onConflict: "user_id,shop_domain" }
    )
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Trigger initial sync
  await syncProducts(supabase, userId, data.id, domain, accessToken);

  return new Response(JSON.stringify({ success: true, connection: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleSync(supabase: any, userId: string, body: any) {
  const { connectionId } = body;

  // Get connection
  const { data: conn, error: connErr } = await supabase
    .from("shopify_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .single();

  if (connErr || !conn) {
    return new Response(JSON.stringify({ error: "Connection not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await syncProducts(supabase, userId, conn.id, conn.shop_domain, conn.access_token);

  return new Response(JSON.stringify({ success: true, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDisconnect(supabase: any, userId: string, body: any) {
  const { connectionId } = body;

  // Delete products first (cascade should handle but be explicit)
  await supabase
    .from("shopify_products")
    .delete()
    .eq("shopify_connection_id", connectionId)
    .eq("user_id", userId);

  const { error } = await supabase
    .from("shopify_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function syncProducts(
  supabase: any,
  userId: string,
  connectionId: string,
  shopDomain: string,
  accessToken: string
) {
  let allProducts: any[] = [];
  let pageInfo: string | null = null;
  let hasMore = true;

  // Paginate through all products
  while (hasMore) {
    const url = pageInfo
      ? `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`
      : `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`;

    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    if (!res.ok) {
      console.error("Shopify API error:", res.status, await res.text());
      break;
    }

    const data = await res.json();
    allProducts = allProducts.concat(data.products || []);

    // Check for next page via Link header
    const linkHeader = res.headers.get("link");
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>;\s*rel="next"/);
      pageInfo = match ? match[1] : null;
      hasMore = !!pageInfo;
    } else {
      hasMore = false;
    }
  }

  // Upsert products
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
