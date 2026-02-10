

# Replace Review Section with Settings Section in Bulk Background

## Overview
Replace the current "Review & Start" section (Section 3) with a "Settings" section where the user picks image resolution and aspect ratio before processing. start button remain with the credits count in it. The product count / background name cards are replaced by resolution and aspect ratio selectors.

## Changes

### 1. Add new settings state and selectors to BulkBackground page
**File:** `src/pages/BulkBackground.tsx`

- Add two new state variables:
  - `imageSize: '1K' | '2K' | '4K'` (default `'1K'`)
  - `aspectRatio` with options `'1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'` (default `'1:1'`)
- Replace the review section content (the product count / background name stat cards) with:
  - **Image Size** selector: a ToggleGroup with 3 options (1K, 2K, 4K)
  - **Aspect Ratio** selector: a ToggleGroup grid with all 10 ratio options, each showing a visual box icon representing the ratio
- Add the credit cost summary to the "Start Processing" button below the selectors
- Pass `imageSize` and `aspectRatio` into the `createJob` call via the `settings` object
- Reset `imageSize` and `aspectRatio` in `handleNewBatch`; preserve them in `handleChangeBackground`
- Rename the ref from `reviewRef` to `settingsRef`

### 2. Update section title and scroll triggers
- Change section 3 title from `t("bulkBackground.review.title")` to `t("bulkBackground.settings.title")`
- Scroll trigger remains the same (appears when background is selected)

### 3. Add translation keys
**Files:** All 5 locale files (`en.json`, `pt.json`, `es.json`, `de.json`, `fr.json`)

Add under `bulkBackground.settings`:
- `title`: "Settings" / "Definicoes" / "Configuracion" / "Einstellungen" / "Parametres"
- `imageSize`: "Image Size" + translations
- `aspectRatio`: "Aspect Ratio" + translations
- Size labels: `1K`, `2K`, `4K` (same across languages)

### 4. Update createJob payload
Currently:
```
settings: { outputFormat: 'webp', quality: 'high', customPrompt: ... }
```
Will become:
```
settings: { outputFormat: 'webp', quality: 'high', customPrompt: ..., imageSize, aspectRatio }
```

No backend changes needed -- `settings` is stored as a JSONB column so new keys are accepted automatically.

## Technical Notes
- The aspect ratio selector will use a `grid grid-cols-5` layout on desktop and `grid-cols-3` on mobile
- Each ratio option shows a small rectangular box with proportional dimensions to visually represent the ratio
- Image size options are simple text toggles: "1K", "2K", "4K"
- The `handleChangeBackground` function preserves the selected resolution and aspect ratio so the user only needs to pick a new background

