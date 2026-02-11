

# Bulk Background: Result Cards Redesign

## Overview
Replace the current simple image grid in the results section with proper cards matching the Outfit Swap module style. Each result gets its own Card with the image displayed larger, and 4 action buttons below.

## Layout Changes

**Results grid (`src/pages/BulkBackground.tsx`, lines ~446-491)**

Current: Small square thumbnails in a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` grid with only a hover overlay link.

New: Card-based layout matching Outfit Swap:
- Mobile: `grid-cols-1` (one card per row, full width)
- Desktop: `grid-cols-2 lg:grid-cols-3` (matching Outfit Swap's `md:grid-cols-2 lg:grid-cols-3`)
- Each card is a `Card` component with `overflow-hidden`
- Image displayed in `aspect-square` container
- Below the image, 4 action buttons

## Card Structure (per result)

Each completed result card will contain:

```text
+---------------------------+
|                           |
|      Result Image         |
|    (aspect-square)        |
|                           |
+---------------------------+
| [Detailed Image]  (CTA)  |  <-- gradient button like photoshoot
| [Preview] [UGC] [Download]|  <-- 3-col icon grid
+---------------------------+
```

### Button Details

1. **Detailed Image** (highlighted, full-width)
   - Gradient style: `bg-gradient-to-r from-purple-500 to-pink-500` (same as "Create Photoshoot" in Outfit Swap)
   - Navigates to the Product Studio Background single-image mode with the result image pre-loaded
   - Icon: `Sparkles`

2. **UGC Image** (outline, in grid)
   - Navigates to the UGC module (`/create/ugc`) with the result image URL in state
   - Icon: `Camera`

3. **Download** (outline, in grid)
   - Downloads the result image directly
   - Icon: `Download`

4. **Preview** (outline, in grid)
   - Opens the `ImagePreviewModal` to view the image in a larger dialog
   - Icon: `Eye`

## Technical Changes

### File: `src/pages/BulkBackground.tsx`

1. Add imports: `ImagePreviewModal`, `Eye`, `Camera`, `Sparkles`, `useIsMobile`
2. Add state for `previewImage` (same pattern as BatchSwapPreview)
3. Replace the results grid (lines 446-491) with the new card-based layout:
   - Change grid classes to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
   - Each result wrapped in a `Card` with image + action buttons
   - Failed/processing states remain inside their respective cards
4. Add `downloadImage` helper function (fetch + blob + anchor click)
5. Add `ImagePreviewModal` component at the bottom of the return
6. Navigation handlers for "Detailed Image" and "UGC Image" buttons

### File: `src/i18n/locales/en.json` (+ pt, es, de, fr)

Add keys under `bulkBackground.buttons`:
- `detailedImage`: "Detailed Image" / translations
- `ugcImage`: "UGC Image" / translations
- `preview`: "Preview" / translations
- `download`: "Download" / translations

