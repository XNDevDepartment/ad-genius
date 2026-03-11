

## Fix API Gateway: Align with Internal System

### Issues Found

1. **Jobs stuck in "queued"**: `handleUgcGenerate` calls `ugc-gemini-v3` with `action: 'process_job'` — that action does not exist. Valid action is `generateImages`. Additionally, the job is inserted with `model_type: 'gemini'` but the worker filters by `model_type: 'gemini-v3'`.

2. **API bypasses the internal pipeline**: Instead of calling `createImageJob` (which handles idempotency, proper source image resolution, credit deduction), the API gateway duplicates all that logic incorrectly.

3. **No pack-based generation endpoint**: The Shopify app needs a `/v1/packs/generate` endpoint that accepts `pack_id` (`ecommerce` | `social` | `ads`), `product_type` (`fashion` | `product`), and `source_image_url`, and uses the exact same prompts as the onboarding system.

### Changes

**`supabase/functions/api-gateway/index.ts`**

1. **Fix `handleUgcGenerate`**: Stop duplicating job creation logic. Instead, upload the source image URL to storage, then call `ugc-gemini-v3` with `action: 'createImageJob'` using service auth. This ensures the job uses the correct `model_type: 'gemini-v3'`, proper idempotency, and triggers the worker correctly.

2. **Add new endpoint `/v1/packs/generate`**: New handler `handlePackGenerate` that:
   - Accepts `source_image_url`, `pack_id` (ecommerce/social/ads), `product_type` (fashion/product)
   - Embeds the pack prompt definitions (from `onboarding-packs.ts`) directly in the edge function
   - Calls `buildPackPrompt()` server-side to construct the exact same prompt
   - Generates 4 images per pack with the correct aspect ratio (1:1 for ecommerce, 3:4 for social/ads)
   - Credits cost: 4 per pack (1 per image)
   - Stores the source image, creates the job via `ugc-gemini-v3` `createImageJob`

3. **Add `/v1/packs/generate` route** in the switch statement and add `'packs'` permission check.

4. **Fix `handleVideoCreate`**: Same pattern — delegate to the actual edge function instead of duplicating logic.

### What the Shopify App Gets

```text
POST /v1/packs/generate
{
  "source_image_url": "https://...",
  "pack_id": "ecommerce" | "social" | "ads",
  "product_type": "fashion" | "product"
}

Response:
{
  "job_id": "...",
  "status": "queued",
  "pack": "ecommerce",
  "styles": ["hero_product", "catalog_clean", "detail_macro", "model_neutral"],
  "credits_used": 4
}

GET /v1/packs/jobs/{job_id}
→ Returns job status + 4 result images with style labels
```

### Files Modified
- `supabase/functions/api-gateway/index.ts` — fix UGC handler, add packs endpoint with embedded prompts

