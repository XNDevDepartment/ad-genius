

# Fix: Photoshoot Shows "Completed" With Missing Images

## Root Cause
The database table `outfit_swap_photoshoots` only has **4 image columns** (`image_1_url` through `image_4_url`), but the redesigned photoshoot allows up to **7 angles**. When the edge function writes `image_5_url`, `image_6_url`, `image_7_url`, those columns don't exist — the update silently succeeds but stores nothing. The frontend then reads `null` for those keys and shows "Pendente" even though the job is marked "completed".

## Solution
Switch from fixed columns to a **JSONB array** approach: store all image URLs in the existing `metadata` column, and read them from there in the frontend. This avoids needing a DB migration to add more columns.

## Changes

### 1. `supabase/functions/outfit-swap/index.ts`
**In `processPhotoshoot` (around line 1624):** Instead of writing to `image_${imageNum}_url` columns (which fail for indices > 4), accumulate all successful image URLs and store them as a `generated_images` array in the metadata field at the end.

- After all `Promise.allSettled` results are collected, build an array like:
  ```
  [{ angleId: "three_quarter", imageNum: 1, url: "...", path: "..." }, ...]
  ```
- Write this array into `metadata.generated_images` in the final status update (line 1662-1673)
- Still write to `image_1_url` through `image_4_url` for backward compatibility with the first 4 images

### 2. `src/components/PhotoshootModal.tsx`
**In the processing stage (line 533):** Instead of reading `photoshoot.image_${index+1}_url`, read from `photoshoot.metadata.generated_images[index]?.url`.

- Update the image URL lookup:
  ```typescript
  const generatedImages = (photoshoot?.metadata as any)?.generated_images || [];
  // Then in the map:
  const imageUrl = generatedImages[index]?.url || photoshoot?.[`image_${index + 1}_url` as keyof PhotoshootJob] as string | null;
  ```
- Update `handleDownloadAll` to also read from metadata

### 3. `src/api/photoshoot-api.ts`
- No schema change needed — `metadata` is already typed as `any`

### Files to modify
1. `supabase/functions/outfit-swap/index.ts` — store generated images in metadata array
2. `src/components/PhotoshootModal.tsx` — read images from metadata instead of fixed columns

