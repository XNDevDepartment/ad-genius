

## Update Edge Functions for New Aspect Ratios, Resolutions & Tiered Credit Costs

### Problem
Both UGC edge functions (`ugc-gemini`, `ugc-gemini-v3`) charge a flat 1 credit per image regardless of resolution. The frontend now has a resolution selector (1K/2K/4K) but doesn't pass it to the API, and the edge functions don't use it for pricing.

### Changes

#### 1. Edge Functions: Resolution-based credit pricing
**Files:** `supabase/functions/ugc-gemini/index.ts`, `supabase/functions/ugc-gemini-v3/index.ts`

Update `calculateImageCost()` in both functions:
```typescript
function calculateImageCost(settings: Record<string, unknown>): number {
  const size = (settings?.size as string) ?? '1024x1024';
  // Parse width from "WxH" format
  const width = parseInt(size.split('x')[0], 10) || 1024;
  if (width >= 2800) return 3;  // 4K (e.g. 2816x1536)
  if (width >= 1700) return 2;  // 2K (e.g. 1792x2560)
  return 1;                      // 1K (e.g. 1024x1024)
}
```

This applies to:
- Credit reservation on job creation (`totalCost = costPerImage * totalImages`)
- Partial refund on failed images
- Full refund on catastrophic failure

#### 2. Frontend: Pass resolution-mapped size to API
**File:** `src/pages/CreateUGCGeminiBase.tsx`

Currently the code always picks `SIZE_MAP[ratio]['large']`. Update to use `imageSize` state:
```typescript
const sizeTier = imageSize === '4K' ? 'large' : 'small';
const sizePx = aspectRatio === 'source'
  ? (imageSize === '4K' ? '2048x2048' : imageSize === '2K' ? '1536x1024' : '1024x1024')
  : SIZE_MAP[aspectRatio]['small' | 'large' based on imageSize];
```

Map: `1K` → `small`, `2K` → use small sizes (they're ~1K range, so we need a `medium` tier or adjust SIZE_MAP), `4K` → `large`.

Actually, looking at SIZE_MAP: `small` = ~1K (1024px), `large` = ~2K-3K (2048-2816px). So:
- `1K` → `small` 
- `2K` → `large` (these are actually ~1.7-2K range)
- `4K` → we need a new tier or double the large values

Simpler approach: add a `medium` tier to SIZE_MAP for 2K, or just pass the resolution tier string to the edge function and let it handle sizing. The edge function already receives `size` as a pixel string — the pricing logic will just read the width.

**Updated SIZE_MAP** in `src/lib/aspectSizes.ts`: Add a `medium` tier:
```
'1:1':  { small: '1024x1024', medium: '1536x1536', large: '2048x2048' },
'2:3':  { small: '896x1280',  medium: '1344x1920', large: '1792x2560' },
...
```

Map: `1K` → `small`, `2K` → `medium`, `4K` → `large`

#### 3. Client-side cost display
**File:** `src/hooks/useCredits.tsx`

Update `calculateImageCost` to accept resolution:
```typescript
const calculateImageCost = (quality, numberOfImages, imageSize = '1K') => {
  const costPerImage = imageSize === '4K' ? 3 : imageSize === '2K' ? 2 : 1;
  return costPerImage * numberOfImages;
};
```

Also update `useImageLimit.ts` to pass resolution through.

#### 4. Edge functions: Accept new aspect ratios gracefully
Both functions already handle non-native ratios via fallback crop. The new ratios (2:3, 4:5, 5:4, 21:9) will automatically go through the crop path since they're not in `NATIVE_ASPECT_RATIOS`. No edge function changes needed for aspect ratios.

#### 5. Mobile settings form
**File:** `src/components/departments/ugc/SettingsForm.tsx`

Ensure `imageSize` is passed through to the parent and included in the API call.

### Files Modified
1. `supabase/functions/ugc-gemini/index.ts` — resolution-based `calculateImageCost`
2. `supabase/functions/ugc-gemini-v3/index.ts` — resolution-based `calculateImageCost`
3. `src/lib/aspectSizes.ts` — add `medium` tier to SIZE_MAP
4. `src/pages/CreateUGCGeminiBase.tsx` — pass correct size based on `imageSize` state
5. `src/hooks/useCredits.tsx` — update `calculateImageCost` for resolution tiers
6. `src/hooks/useImageLimit.ts` — pass resolution to cost calculation
7. `src/api/ugc-gemini-unified.ts` — update size type to include medium sizes

