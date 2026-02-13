# Product Views Feature — Replace "Detailed Image" in Bulk Background

## Overview

Replace the single "Detailed Image" button on each completed Bulk Background result with a "Create Photoshoot" feature that generates 3 product photography views via a modal (similar to the Photoshoot modal pattern in outfit-swap). The three views are:

1. **Macro-Style View** — Close-up focusing on material quality and texture
2. **Environment View** — Product in a realistic usage environment
3. **Angle View** — 3/4 angled product photo for catalog use

## Architecture

The implementation follows the existing **Photoshoot pattern** from outfit-swap: a modal with view selection, processing state, and results display. The backend reuses the existing `bulk-background` edge function with a new action.

## Database Changes

### New table: `bulk_background_product_views`

Similar to `outfit_swap_photoshoots`, stores the 3 generated images per result:


| Column           | Type        | Description                                     |
| ---------------- | ----------- | ----------------------------------------------- |
| id               | UUID        | Primary key                                     |
| user_id          | UUID        | Owner                                           |
| result_id        | UUID        | FK to bulk_background_results                   |
| status           | TEXT        | queued/processing/completed/failed/canceled     |
| progress         | INTEGER     | 0-100                                           |
| selected_views   | TEXT[]      | Array of selected view types                    |
| image_1_url/path | TEXT        | Macro view                                      |
| image_2_url/path | TEXT        | Environment view                                |
| image_3_url/path | TEXT        | Angle view                                      |
| metadata         | JSONB       | Extra data                                      |
| error            | TEXT        | Error message                                   |
| timestamps       | TIMESTAMPTZ | created_at, updated_at, started_at, finished_at |


With RLS policies, realtime, and update trigger matching the photoshoot table pattern.

### Storage bucket

Create `bulk-background-product-views` public bucket with appropriate policies.

## Edge Function Changes

### File: `supabase/functions/bulk-background/index.ts`

**Remove** the `generateDetailedImage` action.

**Add** two new actions:

1. `**createProductViews**` — Validates input, deducts credits (1 per selected view), creates DB record, triggers async processing via self-invocation
2. `**processProductViews**` — Fetches the result image, generates each selected view using specific prompts, uploads to storage, updates DB record with URLs

**Prompts** (as specified by user):

- **Macro**: Close-up/macro focusing on material, texture, finish. Shallow DOF, ultra-sharp, clean background.
- **Environment**: Product in realistic use within appropriate environment. Natural lighting, no people, no text.
- **Angle**: 3/4 view, camera slightly above, 25-35 degrees rotation. Clean premium surface, neutral background.

**Add** two helper actions:

- `**getProductViews**` — Fetch product views record by ID
- `**cancelProductViews**` — Cancel processing

## Frontend Changes

### New file: `src/api/product-views-api.ts`

API client for product views CRUD and realtime subscriptions (mirrors `photoshoot-api.ts` pattern).

### New file: `src/components/ProductViewsModal.tsx`

Modal component with 3 stages:

1. **View Selection** — Checkboxes for Macro, Environment, Angle views (all selected by default). Shows cost (1 credit per view). Preview of the source image.
2. **Processing** — Progress bar, loading indicators per view.
3. **Results** — Grid showing generated images with download buttons.

Follows the mobile-optimized modal pattern (h-[100dvh], flex flex-col, sticky bottom CTA).

### Modified file: `src/pages/BulkBackground.tsx`

- Replace the "Detailed Image" gradient button with a "Create Photoshoot" gradient button
- Remove `detailedLoading` state
- Add `productViewsModal` state (same pattern as photoshoot modal in BatchSwapPreview)
- Render `ProductViewsModal` at the bottom of the component

### Modified file: `src/hooks/useBulkBackgroundJob.ts`

- Remove `generateDetailedImage` function (no longer needed)

### Modified file: `src/api/bulk-background-api.ts`

- Remove `generateDetailedImage` method
- Add `createProductViews`, `getProductViews`, `cancelProductViews` methods

### i18n

- Add translation keys for the new modal in `en.json` (and other locale files)

## Cost

- 1 credit per selected view (same as photoshoot pattern)
- Default: 3 views selected = 3 credits
- Users can deselect views to reduce cost
- Admin bypass for credits (consistent with existing pattern)
- Refund on failure (partial or complete, matching photoshoot logic)

## Files to Create/Modify


| File                                          | Action                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Migration SQL                                 | Create table, bucket, policies                                                    |
| `supabase/functions/bulk-background/index.ts` | Add createProductViews, processProductViews actions; remove generateDetailedImage |
| `src/api/product-views-api.ts`                | New API client                                                                    |
| `src/components/ProductViewsModal.tsx`        | New modal component                                                               |
| `src/pages/BulkBackground.tsx`                | Replace detail button with product views button + modal                           |
| `src/hooks/useBulkBackgroundJob.ts`           | Remove generateDetailedImage                                                      |
| `src/api/bulk-background-api.ts`              | Remove generateDetailedImage, add new methods                                     |
| `src/i18n/locales/en.json`                    | Add productViews translation keys                                                 |
