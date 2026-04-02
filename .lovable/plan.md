

## Fix: Edit Image Not Saving to Database

### Root Cause

The `ugc_images` table has a **NOT NULL** constraint on `job_id`, but the `edit-image` edge function never provides a `job_id` when inserting the edited image record (line 232). The insert fails silently because the code doesn't check the insert result for errors. The function logs "Edit complete" and returns the URL to the frontend, but the image is orphaned in storage with no database record.

This is why:
- The edit appeared to succeed in the modal (the URL was returned)
- But the image is invisible in the Library (no DB record)
- And searching Supabase tables returns nothing

### Immediate Data Recovery

Your most recent edit exists in storage. A migration will insert the missing record with a generated `job_id`.

**URL:** `https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/public/ugc/4e962775-cb55-4301-bc33-081eacb96c46/edit-4e962775-cb55-4301-bc33-081eacb96c46-1775143978094.png`

### Code Fix

**File: `supabase/functions/edit-image/index.ts`**

Two changes:

1. **Generate a `job_id`** for the insert — use `crypto.randomUUID()` since edits don't have a real job
2. **Check the insert result** for errors and log them (so future failures aren't silent)

```typescript
// Before (line 232-243):
await supabaseAdmin.from("ugc_images").insert({
  user_id: userId,
  public_url: publicUrl,
  storage_path: storagePath,
  prompt: instruction,
  source_image_id: originalImageId || null,
  meta: { source: "edit", original_image_url: imageUrl, has_mask: !!maskBase64 },
});

// After:
const { error: insertError } = await supabaseAdmin.from("ugc_images").insert({
  job_id: crypto.randomUUID(),
  user_id: userId,
  public_url: publicUrl,
  storage_path: storagePath,
  prompt: instruction,
  source_image_id: originalImageId || null,
  meta: { source: "edit", original_image_url: imageUrl, has_mask: !!maskBase64 },
});

if (insertError) {
  console.error("Failed to insert edit record:", insertError);
}
```

### Files Modified
1. `supabase/functions/edit-image/index.ts` — add `job_id` to insert + error checking
2. New migration — insert the orphaned edit image record into `ugc_images`

