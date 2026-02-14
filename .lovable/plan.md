

# Fix Product Views: Use Hero Image as Reference + Reorder Views

## Problem

The prompts treat the input as a raw "uploaded product" and ask Gemini to create new backgrounds from scratch. But the input IS already the hero image (bulk background result) with its styled background. Gemini ignores the existing background and invents a new one.

## Changes

### File: `supabase/functions/bulk-background/index.ts` (lines 373-388)

**1. Reorder processing: Macro, Angle, then Environment last**

Sort `selViews` into fixed order `['macro', 'angle', 'environment']` before the loop.

**2. Rewrite prompts to treat the input as a reference hero image**

Current prompts say "uploaded product" which causes Gemini to discard the background. New prompts will explicitly instruct Gemini to use the provided image as the styled reference and only change the camera perspective:

- **Macro**: "Using this product photo as reference, create a close-up macro shot of the same product in the same setting. Focus on material quality, texture and finish details. Maintain the same background, lighting and color palette. Shallow depth of field, ultra-sharp on product surface."
- **Angle**: "Using this product photo as reference, create a 3/4 angled catalog view of the same product. Camera slightly above, 25-35 degree rotation. Keep the exact same background, lighting and environment. Soft studio lighting with realistic contact shadows. No text."
- **Environment**: "Using this product photo as reference, create a wide lifestyle shot showing the same product in a premium, realistic environment matching the image style. Soft natural lighting, sophisticated professional photography. Product is the clear focal point. Maintain the same product proportions, textures and branding. No people, no text overlays."

**3. No frontend changes needed**

The modal, API client, and page remain unchanged -- this is purely a backend prompt and ordering fix.

