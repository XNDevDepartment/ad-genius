

## Add Catalog Photoshoot Endpoint to API Gateway

### Overview

Add a new `/v1/catalog/generate` endpoint (and `/v1/catalog/jobs/{id}` for status) to the existing API gateway. This endpoint generates a hero image first, then dispatches 3 parallel view generations (macro, angle, environment) from that hero — reusing the existing `bulk_background_product_views` table and `processSingleView` action in the `bulk-background` edge function.

No new database tables needed — we reuse `bulk_background_product_views` which already has `macro_url`, `angle_url`, `environment_url` columns and the full processing pipeline.

### How It Works

```text
POST /v1/catalog/generate
  ├─ Validate: source_image_url, product_type (fashion|product)
  ├─ Upload source image → source_images
  ├─ Deduct 4 credits (1 hero + 3 views)
  ├─ Step 1: Generate hero image via ugc-gemini-v3 (1 image, using product rules)
  │   └─ Store as bulk_background_result
  ├─ Step 2: Create bulk_background_product_views record
  │   └─ Dispatch processSingleView × 3 (macro, angle, environment)
  │       Each uses the hero image as reference input
  └─ Return { job_id, status: "processing" }

GET /v1/catalog/jobs/{jobId}
  └─ Read bulk_background_product_views record
      Return hero_url + macro_url + angle_url + environment_url + status
```

### Technical Changes

#### 1. `supabase/functions/api-gateway/index.ts`

**Add to permissions block** (~line 468):
- Add `catalog` permission check for `/v1/catalog` endpoints

**Add to switch statement** (~line 503):
- `/v1/catalog/generate` → `handleCatalogGenerate()`
- Match `/v1/catalog/jobs/{id}` in the default block → `handleGetCatalogJob()`

**New handler: `handleCatalogGenerate()`**:
1. Validate `source_image_url` and `product_type` (fashion | product)
2. Deduct 4 credits
3. Upload source image from URL
4. Generate 1 hero image via `ugc-gemini-v3` (using appropriate fashion/product hero prompt from existing pack definitions — specifically the `hero_product` or `hero_packshot` style prompt)
5. Wait for hero job completion (poll `image_jobs` table, max ~120s)
6. Get hero image URL from `ugc_images` table
7. Create a `bulk_background_result` record with the hero URL
8. Create a `bulk_background_product_views` record with `selected_views: ['macro', 'angle', 'environment']`
9. Fire-and-forget: call `bulk-background` function with `action: 'processProductViews'` which dispatches the 3 parallel `processSingleView` workers
10. Return `{ job_id: productViewsId, hero_job_id, status: 'processing' }`

**New handler: `handleGetCatalogJob()`**:
- Query `bulk_background_product_views` by ID and user
- Return hero_url (from linked result), macro_url, angle_url, environment_url, status, progress

#### 2. View Prompts

Reuses the existing prompts in `bulk-background/index.ts` line 479-482 (macro, angle, environment). For fashion products, we can optionally pass metadata so the view prompts are fashion-aware, but the existing prompts are product-generic and work for both.

#### 3. Credit Cost
- 4 credits total: 1 for the hero image (via ugc-gemini-v3 which handles its own deduction), + 3 for views (deducted upfront)
- Refund logic for failed views already exists in `checkAndFinalizeProductViews`

#### 4. No Database Migration Needed
- Reuses `bulk_background_product_views` table (has macro_url, angle_url, environment_url, status, progress)
- Reuses `bulk_background_results` for the hero image record
- Reuses `image_jobs` + `ugc_images` for the hero generation

### Files Modified
1. **`supabase/functions/api-gateway/index.ts`** — Add `handleCatalogGenerate`, `handleGetCatalogJob`, routing, and permission

