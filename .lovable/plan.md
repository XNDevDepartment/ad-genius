

# Pass Quality & Aspect Ratio to Gemini in Outfit Swap

## Problem
The OutfitSwap page sends `imageSize` and `aspectRatio` in `settings`, and these are correctly stored in `job.settings` in the database. However, the `processOutfitSwap` function in the edge function ignores them when calling the Gemini API — the `generationConfig` at line 889 only has `responseModalities` but no `imageConfig`.

The bulk-background module already does this correctly at line 117:
```
generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: settings?.aspectRatio, imageSize: settings?.imageSize } }
```

Additionally, the credit calculation at line 1199 is hardcoded to 1 credit per garment, ignoring the `imageSize` (should be 1/2/4 for 1K/2K/4K).

## Changes

### `supabase/functions/outfit-swap/index.ts`

**1. Fix Gemini API call (line 889-894)** — Add `imageConfig` with `aspectRatio` and `imageSize` from `job.settings`:
```typescript
generationConfig: {
  responseModalities: ['TEXT', 'IMAGE'],
  imageConfig: {
    aspectRatio: (job.settings as any)?.aspectRatio || undefined,
    imageSize: (job.settings as any)?.imageSize || undefined,
  }
}
```

**2. Fix credit calculation (line 1198-1201)** — Use `imageSize` from settings to determine per-image cost (matching bulk-background pattern):
```typescript
const sizeMultiplier = settings?.imageSize === '4K' ? 4 : settings?.imageSize === '2K' ? 2 : 1;
const baseCreditsNeeded = garmentIds.length * sizeMultiplier;
```

### Files to modify
1. `supabase/functions/outfit-swap/index.ts` — two changes: add imageConfig to generationConfig, fix credit calculation

