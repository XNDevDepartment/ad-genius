
# Outfit-Swap Panel Diagnostic Report

## Problem Identified

**Error Message**: "Garment image file 'WhatsApp Image 2026-02-05 at 12.31.47.jpeg' does not exist in storage. Please re-upload the garment image."

## Root Cause: Bucket Mismatch

The outfit-swap edge function is looking for garment images in the **wrong storage bucket**.

### Current Flow (With Bug)

```text
Frontend (useSourceImageUpload.ts)          Edge Function (outfit-swap)
        |                                            |
        | 1. User uploads garment image              |
        |    Bucket: "source-images" ✓               |
        |                                            |
        | 2. Database record created                 |
        |    storage_path saved ✓                    |
        |                                            |
        +------------------------------------------->|
        |                                            |
        |                                            | 3. Edge function tries to
        |                                            |    download garment from
        |                                            |    bucket: "ugc-inputs" ✗
        |                                            |
        |                                            | 4. File not found!
        |                                            |    (wrong bucket)
        |                                            |
        |                                            | 5. FAILURE: "Garment image
        |                                            |    does not exist in storage"
```

### Evidence from Database

| Source Image ID | public_url (actual bucket) | storage_path |
|-----------------|----------------------------|--------------|
| `6ad07a6e-...` | `.../source-images/...` | `6c61d374-.../1770295846841-9c46gm.jpeg` |

The public_url clearly shows the file is in the **`source-images`** bucket.

### Evidence from Edge Function Logs

```
ERROR [processOutfitSwap] Job f5f8cb28-...: Garment file not found in storage:
{
  bucket: "ugc-inputs",    // <-- WRONG BUCKET!
  path: "6c61d374-.../1770295846841-9c46gm.jpeg"
}
```

### Code Location (Line 724)

```typescript
// supabase/functions/outfit-swap/index.ts
const garmentBucket = "ugc-inputs";  // ❌ Should be "source-images"
```

---

## Fix Required

### File: `supabase/functions/outfit-swap/index.ts`

**Line 724**: Change the bucket name from `"ugc-inputs"` to `"source-images"`.

```typescript
// BEFORE (incorrect):
const garmentBucket = "ugc-inputs";

// AFTER (correct):
const garmentBucket = "source-images";
```

This single-line change will fix all garment image verification failures.

---

## Why This Happened

The frontend upload hook (`useSourceImageUpload.ts`) correctly uploads to `source-images` bucket (line 40):
```typescript
.from('source-images')
.upload(storagePath, file, {...})
```

But the edge function was hardcoded to look in `ugc-inputs` - likely a legacy bucket name that was never updated after the frontend was changed.

---

## Impact After Fix

| Before Fix | After Fix |
|------------|-----------|
| All garment uploads fail with "does not exist" | Garments found successfully |
| Users cannot use outfit-swap | Outfit-swap works correctly |
| Jobs immediately fail | Jobs process normally |

---

## Files to Modify

- `supabase/functions/outfit-swap/index.ts` - Change bucket name on line 724

---

## Estimated Time

**1 minute** - Single line change + redeploy

