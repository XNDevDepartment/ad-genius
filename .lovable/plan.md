

## Add Shopify Store Connection and Product Sync

### Current State

ProduktPix is **not ready** to accept a full Shopify integration with inventory sync. Here is what exists and what is missing:

**Exists:**
- A `/import/shopify` page that scrapes public Shopify stores via `products.json` (read-only, no auth)
- An API gateway with `/v1/packs/generate` and `/v1/auth/verify` endpoints
- Source image upload pipeline

**Missing (required for this feature):**
- No database tables for connected Shopify stores or synced products
- No OAuth or API token storage for Shopify Admin API access
- No product catalog concept (SKU, title, description, variants) in the database
- No "Shopify" section in the user-facing sidebar/navigation
- The current import page only scrapes public storefronts — it cannot access a user's private inventory via the Shopify Admin API

### What to Build

#### 1. Database Tables (2 new tables via migration)

**`shopify_connections`** — stores the user's connected Shopify store
- `id`, `user_id` (refs auth.users), `shop_domain`, `access_token` (encrypted), `scopes`, `connected_at`, `updated_at`
- RLS: users can only see/manage their own connection

**`shopify_products`** — synced product catalog
- `id`, `user_id`, `shopify_connection_id`, `shopify_product_id`, `title`, `description`, `sku`, `vendor`, `product_type`, `status` (active/draft/archived), `image_url`, `images` (jsonb array), `variants` (jsonb), `synced_at`, `created_at`, `updated_at`
- RLS: users can only see their own products

#### 2. Edge Function: `shopify-sync` 

Handles two actions:
- **`connect`**: Receives shop domain + access token (from the Shopify app's OAuth callback), stores it in `shopify_connections`, then triggers initial sync
- **`sync`**: Calls Shopify Admin API (`GET /admin/api/2024-01/products.json`) using the stored access token, upserts products into `shopify_products`. Paginated with `since_id` for incremental sync.

#### 3. New Page: `/shopify/products` — Shopify Product Admin

A table view showing:
- Product image thumbnail
- Title
- SKU (from first variant)
- Description (truncated)
- Status badge (active/draft/archived)
- Sync status timestamp
- Action button: "Generate Pack" → opens pack selector, then triggers `/v1/packs/generate` with the product's image

Header includes:
- Connected store domain display
- "Sync Now" button
- "Disconnect" button
- Last synced timestamp

#### 4. Navigation Updates

- Add "Shopify" item to `AppSidebar` content nav items (with Store icon)
- Add route `/shopify/products` in `App.tsx`

#### 5. Connect Flow

For now, the connection page will accept a Shopify store domain and Admin API access token (which the user generates from their Shopify app). Full OAuth can be added later when the standalone Shopify app is ready.

### Files to Create/Edit

- **Migration**: Create `shopify_connections` and `shopify_products` tables with RLS
- **`supabase/functions/shopify-sync/index.ts`**: New edge function for connect + sync
- **`src/pages/ShopifyProducts.tsx`**: New product admin page with table view
- **`src/components/shopify/ShopifyConnectCard.tsx`**: Connection setup card
- **`src/App.tsx`**: Add route
- **`src/components/AppSidebar.tsx`**: Add nav item

