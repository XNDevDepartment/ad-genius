

## Problem

The current edit-image prompt is too simple and doesn't instruct Gemini to preserve the original image content. This can lead to unwanted changes beyond the user's specific request.

Current prompt (line 119):
```typescript
text: `Edit this image: ${instruction}. Return only the edited image.`,
```

## Solution

Update the prompt to explicitly instruct Gemini to preserve everything except the specific edits requested, following the imperative style used in other Gemini functions.

## Implementation

**File: `supabase/functions/edit-image/index.ts`**

Replace the text prompt on line 119 with:

```typescript
text: `MANDATORY RULES:
- KEEP the entire image exactly as it is
- DO NOT change any elements, objects, backgrounds, colors, or composition
- The ONLY modifications allowed are: ${instruction}
- PRESERVE all product details, proportions, and image quality
- Return only the edited image with minimal changes`,
```

This structured approach:
1. Explicitly instructs to keep everything unchanged
2. Only allows the specific user-requested changes
3. Emphasizes preservation of product integrity
4. Follows the proven imperative pattern from other Gemini functions

## Files to Change
- `supabase/functions/edit-image/index.ts` — update prompt on line 119, then redeploy

