

# Fix: AnimateImageModal Two Bugs

## Bug 1: AI Suggestion Not Appearing
**Root cause**: `analyze-image-for-motion` edge function returns `{ suggestedPrompt }` but `AnimateImageModal.tsx` line 62 checks `data.prompt`.

**Fix**: `src/components/AnimateImageModal.tsx` line 62
- Change `if (data?.prompt) setPrompt(data.prompt)` to `if (data?.suggestedPrompt) setPrompt(data.suggestedPrompt)`

## Bug 2: Video Generation Fails With "No Source Image"
**Root cause**: `handleGenerate` passes `ugc_image_id: imageId` where `imageId` is the outfit swap result ID. The kling-video function looks it up in `ugc_images` table, finds nothing, and fails.

When called from BatchSwapPreview, the `imageId` is an outfit swap result ID — not a UGC image ID. The modal should pass `image_url` directly instead.

**Fix**: `src/components/AnimateImageModal.tsx` line 80-84
- Change `createVideoJob` call from:
  ```ts
  await createVideoJob({ ugc_image_id: imageId || undefined, prompt, duration });
  ```
  to:
  ```ts
  await createVideoJob({ image_url: imageUrl || undefined, prompt, duration });
  ```

This uses the `direct_image_url` fallback path in kling-video (line 193-196) which already works for outfit swap results.

### Files to modify
1. `src/components/AnimateImageModal.tsx` — two line fixes

