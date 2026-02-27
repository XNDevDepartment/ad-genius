

# Add Background Selection to Outfit Swap Module

## Overview
Add a background picker section between garment upload and settings in the outfit swap flow. Uses a filtered version of the existing background presets (studio/magazine/seasonal only) plus custom upload. White studio is the default. The selected background prompt is appended to the Gemini swap prompt.

## Frontend Changes

### 1. New component: `src/components/outfit-swap/OutfitSwapBackgroundPicker.tsx`
A simplified version of `BackgroundPicker` + `BackgroundPresets` that:
- Only shows 3 tabs: Studio, Magazine, Seasonal
- Defaults to "white-seamless" preset on mount
- Includes custom upload option (same as bulk-background)
- Includes editable prompt field when a selection is made
- Reuses the same thumbnail images from `src/data/background-presets.ts`

### 2. Update `src/pages/OutfitSwap.tsx`
- Add state: `selectedPreset` (default `'white-seamless'`), `customBackground`, `backgroundPrompt` (default from white-seamless preset)
- Add new Section between garment upload (Section 2) and settings (Section 3): "Select Background"
- Import and render `OutfitSwapBackgroundPicker`
- On preset select, auto-populate `backgroundPrompt` from the preset's `promptKey` translation
- Pass `backgroundPrompt` and `customBackground` into `createBatch` settings
- Upload custom background to storage (same pattern as `BulkBackground.tsx`)
- Reset background state in `handleReset`

### 3. Update `src/hooks/useOutfitSwapBatch.ts` / `src/api/outfit-swap-api.ts`
- No API shape changes needed — background data flows through the existing `settings` object

## Backend Changes

### 4. Update `supabase/functions/outfit-swap/index.ts` — `processOutfitSwap`
Around line 808-809, after building the category prompt:
- Read `job.settings.backgroundPrompt` and `job.settings.backgroundImageUrl`
- If `backgroundPrompt` exists, append it to the prompt:
  ```
  \n\nBACKGROUND REQUIREMENT:\n{backgroundPrompt}
  ```
- If `backgroundImageUrl` exists (custom upload), fetch it, convert to base64, and add as a third `inlineData` part in the Gemini request with an instruction to use it as the background

## Files to modify
1. **New**: `src/components/outfit-swap/OutfitSwapBackgroundPicker.tsx` — filtered background picker with 3 tabs + custom upload
2. `src/pages/OutfitSwap.tsx` — add background section, state, upload logic
3. `supabase/functions/outfit-swap/index.ts` — append background prompt/image to Gemini call

