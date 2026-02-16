
# Product Views: Aspect Ratio, Library, and Admin Panel

## Overview
Three issues need to be addressed with the "Create Photoshoot" (Product Views) feature in the Bulk Background module:

1. **Photoshoot images must use the hero image's aspect ratio** (currently hardcoded to "1:1")
2. **Photoshoot results must appear in the Library panel**
3. **Photoshoot results must be visible in the Admin panel**

---

## 1. Use Hero Image Aspect Ratio for Product Views

**Problem:** In `supabase/functions/bulk-background/index.ts` (line 392), the `processProductViews` action hardcodes `aspectRatio: "1:1"` for all product view generations. It should instead use the aspect ratio from the parent bulk background job's settings.

**Solution:**

### Frontend: Pass aspect ratio when creating product views

**File:** `src/api/product-views-api.ts`
- Update the `create` method to accept an optional `aspectRatio` parameter and send it in the payload.

**File:** `src/components/ProductViewsModal.tsx`
- Accept an optional `aspectRatio` prop.
- Pass it through to `productViewsApi.create()`.

**File:** `src/pages/BulkBackground.tsx`
- When rendering the `ProductViewsModal`, pass the current `aspectRatio` from the job settings.

### Backend: Use the passed aspect ratio

**File:** `supabase/functions/bulk-background/index.ts`
- In the `createProductViews` action: read `aspectRatio` from the request body and store it in `metadata` on the product views record.
- In the `processProductViews` action (line 392): read the aspect ratio from `pv.metadata.aspectRatio` instead of hardcoding `"1:1"`.

---

## 2. Show Product View Images in the Library Panel

**Problem:** `useLibraryImages.ts` queries multiple tables (ugc_images, outfit_swap_results, bulk_background_results, etc.) but does NOT query `bulk_background_product_views`.

**Solution:**

**File:** `src/hooks/useLibraryImages.ts`
- Add a new query for `bulk_background_product_views` with `status = 'completed'`.
- Query it in the `bulk_background` filter and in the `all` filter.
- Normalize the results into `LibraryImage` objects. Each completed view (macro, angle, environment) becomes a separate library entry, similar to how photoshoot angles are handled.
- Add `'product_views'` to the `source_type` union.
- Include product view images in the combined/sorted results array.
- Add product view deletion support in `deleteImage`.

---

## 3. Show Product View Images in the Admin Panel

**Problem:** `AdminImagesList` only queries `generated_images` and `ugc_images`. It doesn't include product views.

**Solution:**

**File:** `src/components/admin/AdminImagesList.tsx`
- Add a query for `bulk_background_product_views` (all users, since admin).
- Add a new filter option `'product_views'` to the filter dropdown.
- Normalize each completed view (macro/angle/environment) into the `GeneratedImage` format for display.
- Join with profiles for user info.

---

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/bulk-background/index.ts` | Read aspectRatio from request/metadata instead of hardcoded "1:1" |
| `src/api/product-views-api.ts` | Add aspectRatio parameter to create method |
| `src/components/ProductViewsModal.tsx` | Accept and pass aspectRatio prop |
| `src/pages/BulkBackground.tsx` | Pass aspectRatio to ProductViewsModal |
| `src/hooks/useLibraryImages.ts` | Add bulk_background_product_views query and normalization |
| `src/components/admin/AdminImagesList.tsx` | Add product views query and filter option |

## Technical Details

### Aspect Ratio Flow
The aspect ratio is already stored in `bulk_background_jobs.settings.aspectRatio`. The flow will be:
1. Frontend reads aspectRatio from job settings and passes it to the create API call
2. Edge function stores it in `metadata.aspectRatio` on the product views record
3. During processing, the function reads `pv.metadata.aspectRatio` and uses it in the Gemini `imageConfig`

### Library Normalization
Each product view record can have up to 3 URLs (macro_url, angle_url, environment_url). Each non-null URL will become a separate `LibraryImage` entry with:
- `source_type: 'product_views'`
- A descriptive prompt like "Product View - Macro"
- The view's URL as the image URL

### Admin Panel
Product views will appear as a new filter option alongside "All", "Generated", and "UGC". Each view image will be shown with the user profile, creation date, and view type label.
