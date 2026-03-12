

## Remove Manual Connect Form, Use Integration-Based Connection

### Problem
The Shopify dashboard checks the old `shopify_connections` table and shows a manual form asking for store domain + API access token. The proper integration table is `shopify_store_connections`, populated when users connect from the Shopify app using their ProduktPix API key. The form is obsolete.

### Changes

**1. `src/hooks/useShopifyDashboard.ts`**
- Change `ShopifyConnection` interface to match `shopify_store_connections` schema (add `shop_name`, `is_connected`, `is_verified`, `connection_status`, `verified_at`, `last_sync_at`, `webhook_url`, `connection_id`; remove `access_token`, `scopes`)
- Change `fetchConnection` to query `shopify_store_connections` instead of `shopify_connections`, filtering by `user_id` and `is_connected = true`
- Update `handleDisconnect` to call the API endpoint (`/v1/shopify/disconnect`) via the `shopify-integration` edge function instead of the old `shopify-sync` function
- Keep `handleSync` and product fetching logic (still uses `shopify_products` table)

**2. `src/components/shopify/ShopifyConnectCard.tsx`**
- Remove the domain + access token form entirely
- Replace with an informational card that explains:
  - "Connect from the ProduktPix Shopify App" with instructions
  - Steps: Install the Shopify app → Use your ProduktPix API key → Store appears here
  - Link to Account Settings → API Keys so users can copy their key
  - Link to the Shopify product dashboard (`/shopify/products`) mentioned as where products will appear

**3. `src/components/shopify/ShopifyStoreHeader.tsx`**
- Update to use new `ShopifyConnection` fields
- Show `shop_name` alongside `shop_domain`
- Show verification badge when `is_verified` is true
- Show `connection_status` as a badge (connected/verified/pending/error)
- Use `verified_at` and `last_sync_at` from the connection record directly

**4. `src/pages/ShopifyProducts.tsx`**
- No structural changes needed — it already conditionally renders `ShopifyConnectCard` vs the dashboard based on `dashboard.connection`

