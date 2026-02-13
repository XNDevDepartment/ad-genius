

# Fix: Reference Image Reproducing Previous Product

## Problem
The "first image as reference" pattern is sending the complete generated result (product + background) as the reference for subsequent images. Gemini sees the scarf in the reference and reproduces it instead of only extracting the background scene. This caused:
- 4 products uploaded (jacket, scarf, jeans, shoes)
- Result: scarf appears twice, jacket is missing

## Root Cause
The follow-up prompt says "use this as the EXACT background/scene" but the reference image contains both the product AND the background. Gemini interprets the product-in-scene as part of the scene and replicates it.

## Solution
Rewrite the follow-up prompt to explicitly instruct Gemini to:
1. IGNORE any product/object visible in the reference image
2. Extract ONLY the background, lighting, surface, and color palette
3. Replace whatever is in the reference scene with the NEW product from the first image

## Changes

### File: `supabase/functions/bulk-background/index.ts`

Update the `isFollowUp` prompt text in `buildPrompt` (appears twice -- once for custom prompt path, once for preset path). Replace the current instruction:

**Current:**
> "A second reference image is provided showing the EXACT background/scene to use. Place the product in this EXACT same environment, maintaining identical lighting, surface, color tones and composition. Do NOT alter the background in any way. The background must be pixel-perfect consistent with the reference."

**New:**
> "A second reference image is provided. This reference contains a PREVIOUSLY GENERATED scene with another product in it. You MUST:
> 1. IGNORE and COMPLETELY REMOVE any product/object visible in the reference image
> 2. Extract ONLY the background environment, lighting, surface texture, and color palette from the reference
> 3. Place the NEW product (from the first image) into this extracted background scene
> 4. The background must match the reference exactly -- same lighting direction, same surface, same tones, same composition
> 5. The ONLY product visible in the final image must be the one from the first uploaded image
> 6. Do NOT duplicate, replicate, or include any trace of the product that was in the reference image"

This makes it unambiguous that the reference is for scene extraction only, not product replication.

## Technical Details
- Two occurrences of the `isFollowUp` prompt in `buildPrompt` need updating (line 176 for custom prompt path, line 183 for preset path)
- No other files need changes
- Edge function will be redeployed after the edit

