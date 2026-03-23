

## Feature Gating & UGC Settings Expansion

### Summary
Three areas of work: (1) block videos and gate catalog features for free users, (2) add resolution + missing aspect ratios to the UGC module with same gating, (3) block photoshoot buttons for free users. All locked items show a Crown icon.

### 1. Enable Catalogs for Free Users, Block Videos

**`src/pages/ModuleSelection.tsx`**
- Remove `locked: false` from video workflow, add `locked: isFreeTier()` instead
- Remove `locked: isFreeTier()` from bulk-background (product catalog) — make it available to all
- Remove `locked: false` from outfit-swap — keep available to all

**`src/pages/Index.tsx`** (mobile modules)
- Add `needsPaid: true` to the video module entry so free users see it locked
- Remove `needsPaid: true` from bulk-background

**`src/hooks/useCredits.tsx`**
- Change `canAccessVideos()` to return `!isFreeTier()` instead of `true`

**`src/pages/ModuleSelection.tsx`** — change Lock icon to Crown icon for locked modules

### 2. Block 2K/4K Resolution + 9:16 & 4:5 Aspect Ratios for Free Users

**`src/pages/BulkBackground.tsx`** (Product Catalog)
- In image size toggle group: disable 2K and 4K for free users, show Crown icon
- In aspect ratio Select: disable `9:16` and `4:5` for free users, show Crown icon
- Block photoshoot button for free users (show Crown + redirect to /pricing)

**`src/pages/OutfitSwap.tsx`** (Fashion Catalog)
- Same: disable 2K/4K with Crown, disable 9:16 and 4:5 with Crown
- Already has photoshoot in BatchSwapPreview — block there too

**`src/components/BatchSwapPreview.tsx`**
- Block the "Create Photoshoot" button for free users — show Crown + navigate to /pricing

### 3. Add Resolution + Missing Aspect Ratios to UGC Module

The UGC module currently has `AspectRatioSelector` (source, 1:1, 3:4, 9:16, 4:3, 16:9) but no resolution selector and is missing ratios like 2:3, 4:5, 5:4, 21:9.

**`src/pages/CreateUGCGeminiBase.tsx`** (desktop sidebar)
- Add a resolution toggle (1K / 2K / 4K) above or below the aspect ratio section
- Add state `imageSize` defaulting to '1K'
- Gate 2K/4K for free users with Crown icon
- Pass `imageSize` to the generation API call

**`src/components/AspectRatioSelector.tsx`**
- Add missing ratios: `2:3`, `4:5`, `5:4`, `21:9`
- Update the `AspectRatio` type
- Accept optional `lockedRatios` prop — array of ratio values to show as locked (Crown icon + disabled)

**`src/components/departments/ugc/SettingsForm.tsx`** (mobile settings)
- Add the same resolution toggle (1K / 2K / 4K)
- Gate 2K/4K with Crown for free users

**`src/lib/aspectSizes.ts`**
- Add SIZE_MAP entries for new ratios: `2:3`, `4:5`, `5:4`, `21:9`

### 4. Consistent Crown Icon on All Locked Items

All blocked features use `Crown` from lucide-react (same as the Upgrade tab), shown inline on:
- Disabled toggle items (2K, 4K resolutions)
- Disabled aspect ratio options (9:16, 4:5)
- Disabled photoshoot buttons
- Locked module cards

### Files Modified
1. `src/hooks/useCredits.tsx` — block video access for free tier
2. `src/pages/ModuleSelection.tsx` — unlock catalogs, lock videos, Crown icon
3. `src/pages/Index.tsx` — mobile module grid: lock video, unlock catalog
4. `src/pages/BulkBackground.tsx` — gate 2K/4K, 9:16/4:5, photoshoot button
5. `src/pages/OutfitSwap.tsx` — gate 2K/4K, 9:16/4:5
6. `src/components/BatchSwapPreview.tsx` — gate photoshoot button
7. `src/components/AspectRatioSelector.tsx` — add missing ratios + lockedRatios prop
8. `src/lib/aspectSizes.ts` — add new ratio size entries
9. `src/pages/CreateUGCGeminiBase.tsx` — add resolution selector, gate 2K/4K
10. `src/components/departments/ugc/SettingsForm.tsx` — add resolution selector, gate 2K/4K

