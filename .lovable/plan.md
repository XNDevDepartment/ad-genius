

## Plan: Complete ProduktPix API & Generate Integration Documentation

### Current State

The API infrastructure is already well-built:
- **Edge functions**: `api-gateway` (routing + handlers), `api-keys` (CRUD), `api-webhook-dispatcher` (delivery + retries)
- **Database**: `api_keys`, `api_rate_limits`, `api_usage_logs`, `api_webhook_events` tables all exist
- **Endpoints**: UGC generate, Video create, Fashion swap, Credits balance + job status polling
- **Docs page**: Basic docs at `/help/api-docs` (still branded "Genius UGC")

### What Needs Work

**1. Rebrand & expand API docs page** (`src/pages/help/APIDocsPage.tsx`)
- Rename from "Genius UGC API" → "ProduktPix API"
- Add missing endpoint: product background swap (`/v1/product/background`)
- Add dedicated sections: Authentication deep-dive, Error handling guide, Pagination
- Add response schema examples for each endpoint (currently only request examples exist)
- Add Shopify integration guide section

**2. Add Product Background endpoint to API gateway** (`supabase/functions/api-gateway/index.ts`)
- New endpoint `/v1/product/background` — triggers `bulk-background` function for single image
- New endpoint `/v1/product/background/jobs/{job_id}` — check status
- Add `product_background` permission type

**3. Create dedicated Integrations docs page** (`src/pages/help/IntegrationsDocsPage.tsx`)
- Shopify integration guide (App Proxy, Shopify Flow, product import → generate → push back)
- Generic webhook integration guide
- Zapier/Make integration patterns
- Code examples for common e-commerce workflows

**4. Update HelpLayout navigation** (`src/components/help/HelpLayout.tsx`)
- Uncomment and enable the API Documentation nav item
- Add new "Integrations" nav item

**5. Update ApiKeysPanel** (`src/components/account/ApiKeysPanel.tsx`)
- Add `product_background` permission checkbox
- Rebrand "Genius UGC" → "ProduktPix"

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/api-gateway/index.ts` | Add product background endpoints + permission |
| `src/pages/help/APIDocsPage.tsx` | Full rewrite — rebrand, add response schemas, expand docs |
| `src/pages/help/IntegrationsDocsPage.tsx` | **New** — Shopify + generic integration guides |
| `src/components/help/HelpLayout.tsx` | Enable API docs + add Integrations nav |
| `src/components/account/ApiKeysPanel.tsx` | Add product_background permission, rebrand |
| `src/App.tsx` | Add route for integrations docs page |

### Shopify Integration Guide Content

The docs will cover:
1. **Import products** → Use Shopify Admin API to list products, send images to ProduktPix API
2. **Generate images** → Call `/v1/ugc/generate` or `/v1/product/background` with product images
3. **Push back** → Use webhook to receive results, then update Shopify product images via Admin API
4. **Bulk workflow** — iterate over catalog with rate limiting
5. **Code example** — complete Node.js script for Shopify → ProduktPix → Shopify roundtrip

