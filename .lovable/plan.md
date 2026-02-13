

# Chain Previous Image as Reference for Consistent Proportions

## Problem
Currently the first successful image is used as reference for ALL subsequent images. When products are similar (same shape, different colors), Gemini has no size anchor from the previous result and renders them at inconsistent scales.

## Solution
Change from "first image as reference" to "previous image as reference" (chaining). Each image uses the immediately preceding successful result as its reference. This gives Gemini a much better size/proportion anchor since the previous product is visually similar.

```text
Image 1: Product + Prompt  -->  Result 1
Image 2: Product + Result 1 as ref  -->  Result 2
Image 3: Product + Result 2 as ref  -->  Result 3
Image 4: Product + Result 3 as ref  -->  Result 4
```

## Changes

### File: `supabase/functions/bulk-background/index.ts`

**1. Update the reference capture logic (lines 694-704)**

Instead of only capturing the first successful result, update `referenceBase64` after EVERY successful generation:

Current:
```typescript
if (isPresetJob && !referenceBase64 && processResult.imageData) {
  // Only captures first
```

New:
```typescript
if (isPresetJob && processResult.imageData) {
  // Always update to latest successful result
```

This is a one-line change: remove `!referenceBase64` from the condition on line 697.

**2. Update the follow-up prompt to add proportion guidance**

Add an explicit instruction about maintaining consistent product size/proportions relative to the frame. Append to the existing follow-up prompt:

> "7. MAINTAIN the same product SIZE and PROPORTIONS relative to the frame as shown in the reference. The product should occupy approximately the same percentage of the image area."

This goes in both occurrences of the `isFollowUp` prompt (lines 176 and 183).

## Technical Notes
- No database changes needed
- No frontend changes needed
- The chaining approach is safe for memory since we only hold one reference at a time (same as before)
- If an image fails, the chain continues using the last successful result
- Custom background jobs are unaffected (they already use a fixed uploaded background)
