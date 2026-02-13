
# Consistent Backgrounds via "First Image as Reference" Pattern

## Problem
When using prompt-based backgrounds (presets), each product image is generated independently by Gemini. Since AI interpretation varies per call, each product ends up with a slightly different background -- different lighting, textures, tones, etc. This makes collections look inconsistent.

## Solution
Process the first image as usual (prompt-generated), then use that completed result as the **reference background image** for all subsequent products. This guarantees visual consistency across the entire batch.

```text
Image 1: Product + Prompt  -->  Gemini  -->  Result 1 (becomes the reference)
Image 2: Product + Result 1 as background  -->  Gemini  -->  Result 2
Image 3: Product + Result 1 as background  -->  Gemini  -->  Result 3
...
```

## Changes

### 1. Edge Function: `supabase/functions/bulk-background/index.ts`

**Modify `processSingleResult` to return the generated image bytes** (not just success/fail), so the caller can capture the first result's image data.

**Update the sequential loop in `processJob`**:
- After the **first image** completes successfully, capture its result image as base64
- Store it in a `referenceBackgroundBase64` variable
- For all subsequent images, pass this reference as the `backgroundBase64` parameter instead of null
- Adjust the prompt for subsequent images: append a note telling Gemini to use the provided reference image as the exact background/scene, placing the new product in the same environment

**Prompt adjustment for images 2+**:
The prompt will include an instruction like:
> "Use the reference image as the EXACT background scene. Place the new product in the same environment, maintaining identical lighting, surface, and color tones. Do NOT alter the background."

This ensures Gemini treats the first result as a fixed scene reference rather than generating a new interpretation each time.

**Edge case handling**:
- If the first image fails, try the second image as the reference source instead (use the first successful result)
- For custom background jobs (user uploads a background image), behavior stays the same -- the uploaded image is already used as reference for all images, so no change needed
- The reference image is kept in memory (already within the 150MB limit since we process sequentially)

### 2. No Database Changes Needed
The existing schema supports this without modifications. The reference background is held in memory during the processing loop -- it does not need to be persisted.

### 3. No Frontend Changes Needed
The UI and API contract remain identical. The improvement is entirely server-side.

## Technical Details

**Modified function signature**:
```typescript
// Before: returns { success, error }
// After:  returns { success, error, imageData? }
async function processSingleResult(...): Promise<{
  success: boolean;
  error?: string;
  imageData?: Uint8Array;  // NEW: raw generated image for reference
}>
```

**Updated loop logic** (pseudocode):
```text
let referenceBase64 = null;

for each result in pendingResults:
  // For preset backgrounds: use reference if available
  bgToUse = referenceBase64 || backgroundBase64 (custom) || null
  isFollowUp = (referenceBase64 != null)

  processResult = processSingleResult(result, job, adminClient, bgToUse, isFollowUp)

  if processResult.success AND referenceBase64 == null:
    // First success becomes the reference
    referenceBase64 = base64Encode(processResult.imageData)
```

**Prompt for follow-up images**:
A new flag `isFollowUp` is passed to `buildPrompt`. When true, the prompt emphasizes using the provided image as the exact background scene rather than generating from a text description.

## Files Modified
- `supabase/functions/bulk-background/index.ts` -- modify `processSingleResult` return type, update `processJob` loop, adjust prompt logic
