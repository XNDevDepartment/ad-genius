

## Problem: `shopify-sync` edge function uses the wrong table and requires an access token

The sync button calls `shopify-sync`, which:
1. Looks up the connection in the **old** `shopify_connections` table (has `access_token`)
2. Uses that `access_token` to call Shopify's Admin API directly

But the dashboard now uses `shopify_store_connections` (the new integration table), which does **not** store an `access_token`. The old table likely has no matching record for the current connection, so the function returns "Connection not found" or fails.

Additionally, the new architecture doesn't store Shopify Admin API tokens — the connection is established via the ProduktPix Shopify App using API keys, not OAuth tokens.

## Solution: Update `shopify-sync` to use the public products.json endpoint

Shopify stores expose a public `/products.json` endpoint that doesn't require authentication. The `firecrawl-shopify` function already uses this approach successfully. We should update `shopify-sync` to:

1. **Query `shopify_store_connections`** instead of `shopify_connections`
2. **Fetch products via the public `products.json` endpoint** (same as `firecrawl-shopify`) instead of using an access token
3. **Update `last_sync_at`** on the `shopify_store_connections` record after sync
4. **Use the connection ID from `shopify_store_connections`** for the `shopify_connection_id` foreign key in `shopify_products`

### Changes

**`supabase/functions/shopify-sync/index.ts`** — Rewrite the sync function:
- `handleSync`: Query `shopify_store_connections` by `id` + `user_id` instead of `shopify_connections`
- `syncProducts`: Use `https://{domain}/products.json?limit=250&page={n}` (public, no auth needed) instead of the Admin API with access token
- Map the public JSON response format (slightly different field names than Admin API) to the `shopify_products` table schema
- Update `last_sync_at` on the connection record after successful sync
- Remove `handleConnect` and `handleDisconnect` actions (managed by `shopify-integration` now)
- Keep only the `sync` action

**`src/hooks/useShopifyDashboard.ts`** — Minor fix:
- `handleDisconnect` currently calls `shopify-integration` edge function, but that function expects API key auth (not user JWT). Update to call it differently or use direct DB update for disconnect from the dashboard.

### Data mapping (public products.json → shopify_products)

Public endpoint returns: `id`, `title`, `body_html`, `vendor`, `product_type`, `status`, `handle`, `images[]`, `variants[]` — same fields as Admin API, so the existing mapping logic works with minimal changes (just remove the auth header).

