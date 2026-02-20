
# Fix Source Image Bucket Mismatch Across Application

## Problem

New source images are uploaded to the `source-images` bucket, but most read/delete/signed-URL operations still hardcode `ugc-inputs`. This means newly uploaded images silently fail to display, delete, or be used in generation.

## Solution

Apply the same smart bucket detection pattern already used in `ugc-gemini-v3`: parse the `public_url` from the database record to determine whether the file is in `ugc-inputs` (legacy) or `source-images` (current).

### Helper Pattern

```typescript
function detectBucket(publicUrl: string): string {
  return publicUrl?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';
}
```

---

## Files to Change

### Frontend (4 files)

**1. `src/hooks/useSourceImages.ts`**
- Add bucket detection helper using `public_url` from the DB row
- Update `fetchSourceImages`: use detected bucket for `createSignedUrl` instead of hardcoded `ugc-inputs`
- Update `deleteSourceImage`: use detected bucket for `remove` call
- Update `deleteSourceImages`: same bucket detection for batch deletes
- Store `public_url` in the SourceImage interface so the bucket can be derived

**2. `src/components/MultiGarmentUploader.tsx`**
- Where signed URLs are created (line ~137), detect bucket from the image's `public_url` or `storage_path`

**3. `src/pages/CreateUGCGeminiBase.tsx`**
- Where signed URLs are created (line ~208), apply same bucket detection

**4. `src/hooks/useLibraryImages.ts`**
- Where signed URLs are created for source images (line ~373), apply bucket detection

### Edge Functions (4 files)

**5. `supabase/functions/ugc/index.ts`**
- In `getSignedSourceUrl` (line ~707-710), query `public_url` alongside `storage_path`, then detect bucket

**6. `supabase/functions/outfit-swap/index.ts`**
- Where person source image bucket is set (line ~713), detect bucket from `public_url` instead of hardcoding `ugc-inputs`

**7. `supabase/functions/upload-source-image-from-url/index.ts`**
- Change upload destination from `ugc-inputs` to `source-images` to match the new standard
- Update all references (upload, getPublicUrl, cleanup) to use `source-images`

**8. `supabase/functions/public-gallery/index.ts`**
- Add bucket detection when creating signed URLs for source images (line ~52)

**9. `supabase/functions/delete-account/index.ts`**
- Add `source-images` to the `storageBuckets` array so new images are cleaned up on account deletion

---

## Technical Details

### Smart Bucket Detection (reused pattern from ugc-gemini-v3)

For frontend:
```typescript
const detectBucket = (publicUrl: string): string =>
  publicUrl?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';
```

For edge functions (Deno):
```typescript
function detectBucket(publicUrl: string): string {
  return publicUrl?.includes("/ugc-inputs/") ? "ugc-inputs" : "source-images";
}
```

### useSourceImages.ts Changes (most impactful)

The `SourceImage` interface will add a `publicUrl` field. The `fetchSourceImages` function will pass each image's `public_url` through `detectBucket()` before calling `createSignedUrl`. Delete operations will do the same.

### upload-source-image-from-url Edge Function

This is the Shopify/URL import path. It currently writes to `ugc-inputs`, creating a mismatch with the frontend upload path. Changing it to `source-images` aligns all upload paths. Legacy images already in `ugc-inputs` remain accessible via smart detection on the read side.

---

## No Database or Schema Changes Required

The `source_images` table already stores `public_url` which contains the bucket name. No migrations needed.

## No New Dependencies

All changes use existing Supabase SDK methods.
