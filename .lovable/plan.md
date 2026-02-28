# Refactor Ecommerce Photo to Use Scenario + UGC-Gemini Pipeline

## Current Flow

1. User clicks "E-commerce Photo" on an outfit swap result
2. `EcommerceIdeasModal` opens → calls `generateEcommerceIdeas` (Gemini Flash, custom prompt, returns JSON ideas)
3. User picks an idea → calls `createEcommercePhoto` with `stylePrompt`
4. `processEcommercePhoto` uses a custom fashion-magazine prompt + Gemini 3 Pro to generate 1 image
5. Result stored in `outfit_swap_ecommerce_photos` table

## Problem

The custom prompt in `processEcommercePhoto` produces inferior results compared to the UGC-Gemini module's battle-tested prompt structure.

## New Flow

1. User clicks "E-commerce Photo" on an outfit swap result
2. `EcommerceIdeasModal` opens → calls `scenario-generate` edge function (OpenRouter/Claude) with audience="photo for ecommerce store" instead of `generateEcommerceIdeas`
3. User picks a scenario → calls `createEcommercePhoto` with the scenario description as `stylePrompt`
4. `processEcommercePhoto` uses the **UGC-Gemini prompt template** (the `highlightYes` structure from CreateUGCGeminiBase) instead of its current custom prompt

## Changes

### 1. `src/components/EcommerceIdeasModal.tsx`

- Replace `generateEcommerceIdeas` call with `generateScenarios` from `src/api/scenario-api.ts`
- Use hardcoded audience `"`General consumer who appreciates good quality garments and likes fashion. Final image for e-commerce store. Preferable magazine photography but with UGC context`"`
- Pass `imageUrl` as the image for context
- Map returned `AIScenario[]` to the existing ideas UI (idea.idea → title, idea.description → description)
- When user selects a scenario, pass `idea.description` as the style prompt (full scenario description)

### 2. `supabase/functions/outfit-swap/index.ts` — `processEcommercePhoto`

Replace the current prompt (lines 2101-2124) with the UGC-Gemini prompt structure:

```
TASK: Create authentic UGC photo featuring this product.

SCENARIO: ${stylePrompt || 'Natural lifestyle moment'}
AUDIENCE: General consumer who appreciates good quality garments and likes fashion. Final image for e-commerce store. Preferable magazine photography but with UGC context

MANDATORY RULES:
1. PRODUCT INTEGRITY:
   - Use EXACT product from reference image
   - Keep all labels, colors, shapes, branding unchanged
   - Product is hero - 60-75% of frame

2. AUTHENTICITY:
   - 4k-professional-quality photography
   - Natural lighting, real environments
   - Slight imperfections (soft focus, natural shadows)
   - Casual, off-center framing

3. STYLE:
   - lifestyle photography aesthetic
   - natural lighting

4. QUALITY:
   - No AI artifacts, watermarks, text
   - Natural human anatomy if people appear
   - No invented branding

--negative "AI artifacts, text overlays, watermark, ..."

OUTPUT: Single authentic UGC photo ready for social media.
```

### Files to modify

1. `src/components/EcommerceIdeasModal.tsx` — switch from `generateEcommerceIdeas` to `scenario-generate` via `generateScenarios` API
2. `supabase/functions/outfit-swap/index.ts` — replace `processEcommercePhoto` prompt with UGC-Gemini template