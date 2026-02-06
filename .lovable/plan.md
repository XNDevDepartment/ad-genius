

# UGC-Gemini Module: Source Image Bucket Mismatch Fix

## Problem Identified

The UGC-Gemini module is generating invented products instead of using uploaded images because of a **bucket mismatch** when fetching source images.

### Evidence

| Metric | Value |
|--------|-------|
| Source images in `ugc-inputs` bucket | 2,537 (94%) |
| Source images in `source-images` bucket | 144 (6%) |
| Edge function looking in | `source-images` only ❌ |

**Log showing the bug:**
```
"usingSourceImage":false  <-- Should be true!
```

The user's source image (`867f6811-9d01-4f5a-b33c-ba27e3c1be96`) is stored in the **`ugc-inputs`** bucket, but the edge function's `getSignedSourceUrls` function is hardcoded to look in `source-images` - causing the signed URL to fail and returning an empty array.

---

## Root Cause

The `getSignedSourceUrls` function in both `ugc-gemini` and `ugc-gemini-v3` edge functions uses a hardcoded bucket name:

```typescript
// Current code (lines 882 and 836)
const { data: signed } = await supabase.storage
  .from("source-images")  // ❌ Hardcoded - doesn't work for legacy images
  .createSignedUrl(src.storage_path, 3600);
```

But the `public_url` in the database actually contains the real bucket information:
- `https://.../storage/v1/object/public/ugc-inputs/...` → use `ugc-inputs`
- `https://.../storage/v1/object/public/source-images/...` → use `source-images`

---

## Solution

Make the edge functions **detect the bucket from the `public_url`** in the database rather than hardcoding it.

### Technical Changes

**Files to modify:**
1. `supabase/functions/ugc-gemini/index.ts`
2. `supabase/functions/ugc-gemini-v3/index.ts`

**Updated `getSignedSourceUrls` function:**

```typescript
async function getSignedSourceUrls(
  source_image_ids: string[], 
  supabase: SupabaseClient
): Promise<string[]> {
  if (!source_image_ids || source_image_ids.length === 0) return [];
  
  const urls: string[] = [];
  for (const id of source_image_ids) {
    // Fetch both storage_path AND public_url to detect bucket
    const { data: src } = await supabase.from("source_images")
      .select("storage_path, public_url")
      .eq("id", id)
      .maybeSingle();
      
    if (src?.storage_path && src?.public_url) {
      // Detect bucket from public_url
      let bucket = "source-images"; // default
      if (src.public_url.includes("/ugc-inputs/")) {
        bucket = "ugc-inputs";
      } else if (src.public_url.includes("/source-images/")) {
        bucket = "source-images";
      }
      
      log("Signing source image URL", { 
        id, 
        bucket, 
        path: src.storage_path 
      });
      
      const { data: signed, error } = await supabase.storage
        .from(bucket)  // ✅ Dynamic bucket based on public_url
        .createSignedUrl(src.storage_path, 3600);
        
      if (error) {
        log("Failed to sign source image", { id, bucket, error: error.message });
        continue;
      }
      
      if (signed?.signedUrl) {
        urls.push(signed.signedUrl);
      }
    }
  }
  return urls;
}
```

---

## Impact

| Before Fix | After Fix |
|------------|-----------|
| 94% of source images fail to load | All source images work |
| AI invents products | AI uses uploaded products |
| Jobs show `usingSourceImage: false` | Jobs show `usingSourceImage: true` |

---

## Summary

1. **Update `ugc-gemini/index.ts`** - Modify `getSignedSourceUrls` (line 876-889) to detect bucket dynamically
2. **Update `ugc-gemini-v3/index.ts`** - Same change (line 825-844)
3. **Redeploy both edge functions**

This single-function fix will restore proper source image handling for all 2,537 legacy images in `ugc-inputs` while continuing to work with the 144 new images in `source-images`.

