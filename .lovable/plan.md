

# Outfit Swap: Add Quality & Aspect Ratio Settings

## Overview

Replace the current review section (showing model name, garment count, and cost) with a settings card matching the Bulk Background pattern -- letting users choose image size (1K/2K/4K) and aspect ratio before starting the batch. The credit cost will be dynamic based on size selection and shown in the "Start Batch" button.

## Changes

### 1. `src/pages/OutfitSwap.tsx`

**Replace Section 3 (Review & Start)** -- remove the info rows (selected model, garments, cost) and replace with:

- **Image Size toggle** (1K / 2K / 4K) using `ToggleGroup`, same as BulkBackground
- **Aspect Ratio dropdown** using `Select` with visual ratio icons, same 10 options as BulkBackground (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9)
- **Start button** with dynamic cost in the label (credits = garments x cost-per-size)
- Insufficient credits warning below the button

**State additions:**
- `imageSize: '1K' | '2K' | '4K'` (default `'1K'`)
- `aspectRatio: string` (default `'1:1'`)

**Cost calculation update:**
- Add a `getCreditsPerImage(size)` helper (1K=1, 2K=2, 4K=4) -- same as BulkBackground
- Total cost = `garmentFiles.length * creditsPerImage` (replaces the current `calculateBatchCost` from hook)
- `canAfford` check uses `getRemainingCredits() >= totalCost`

**Pass settings to `createBatch`:**
- Include `imageSize` and `aspectRatio` in the settings object passed to `createBatch()`

### 2. `src/components/OutfitSwapSettings.tsx`

No changes needed -- it already returns `null` and can remain as-is (or be removed from the render, since the settings are now inline in the review card).

## What the New Section 3 Looks Like

```
+------------------------------------------+
|  Settings                                |
|                                          |
|  Image Size                              |
|  [1K]  [2K]  [4K]                        |
|                                          |
|  Aspect Ratio                            |
|  [ [box] 1:1          v ]                |
|                                          |
|  [ Start Batch -- X credits ]            |
|  (insufficient credits warning)          |
+------------------------------------------+
```

## Technical Details

| File | Change |
|---|---|
| `src/pages/OutfitSwap.tsx` | Add `imageSize`/`aspectRatio` state, replace review card content with size toggle + ratio dropdown + dynamic cost button, pass settings to `createBatch` |

- The `OutfitSwapSettings` component render call (line 296) will be removed since it returns null anyway
- Imports added: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `ToggleGroup`, `ToggleGroupItem` from existing UI components
- The `useOutfitSwapLimit` hook's `calculateBatchCost` and `getSavings` are no longer used for display; replaced by simple `garments * creditsPerImage`
- `canAffordBatch` replaced by direct `credits >= totalCost` check

