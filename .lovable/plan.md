

# Fix: Animate Image from Outfit Swap (and other panels)

## Problem

When clicking "Animate" on an outfit swap result, the user is navigated to `/create/video` with `preselectedImageUrl` set to the result's `public_url`. However:

1. **Frontend**: `onCreate()` requires `selectedImage` to be non-null (line 392), but for outfit swap results only `preselectedImageUrl` is set -- `selectedImage` stays `null`. The image shows visually but the system won't submit.
2. **Edge function**: The `createVideoJob` handler only resolves images via `source_image_id` or `ugc_image_id` DB lookups. Outfit swap results live in `outfit_swap_results`, which is never checked. There is no `image_url` passthrough.

## Solution

Add support for a direct `image_url` parameter in both the frontend and edge function.

### 1. `src/pages/VideoGenerator.tsx` -- Fix `onCreate()`

Update the `onCreate` function to handle the case where `selectedImage` is null but `preselectedImageUrl` exists:

- Change the guard at line 392 from `if (!selectedImage || !prompt.trim())` to `if (!selectedImage && !preselectedImageUrl) || !prompt.trim()`
- When `selectedImage` is null but `preselectedImageUrl` is set, pass `image_url: preselectedImageUrl` in the payload instead of `source_image_id` or `ugc_image_id`

### 2. `src/api/kling.ts` -- Update payload type

Add `image_url?: string` to `CreateVideoJobPayload` interface so the direct URL can be passed through.

### 3. `supabase/functions/kling-video/index.ts` -- Accept `image_url`

In the `createVideoJob` function (line 126+), add a third fallback after the `source_image_id` and `ugc_image_id` checks:

- Extract `image_url` from the payload
- If neither `source_image_id` nor `ugc_image_id` is provided but `image_url` is, use it directly as the image URL
- This handles outfit swap results, and any future panel that provides a direct URL

### 4. `src/components/BatchSwapPreview.tsx` -- Also pass `result_id` (already does)

Already passes `result_id` in state -- no change needed.

### 5. `src/components/OutfitSwapPreview.tsx` -- Also pass `result_id`

Add `result_id: results.id` to the navigation state for consistency.

## Technical Details

| File | Change |
|---|---|
| `src/pages/VideoGenerator.tsx` | Fix `onCreate` guard to accept `preselectedImageUrl`; pass `image_url` in payload when no `selectedImage` |
| `src/api/kling.ts` | Add `image_url?: string` to `CreateVideoJobPayload` |
| `supabase/functions/kling-video/index.ts` | Accept `image_url` as fallback in `createVideoJob` after source/ugc lookups |
| `src/components/OutfitSwapPreview.tsx` | Add `result_id` to navigate state |

This approach is generic -- any panel that passes a direct `preselectedImageUrl` (outfit swap, future panels) will work without needing a specific DB record in `ugc_images` or `source_images`.

