
# Add Library, URL, and Shopify Import to Bulk Background

## What Changes

Add three import buttons (From Library, From URL, From Shopify) to the product image upload section of the Bulk Background module, matching the pattern already used in the Outfit Swap / UGC Gemini modules.

## How It Works

The existing `MultiImageUploader` component stays as-is for drag-and-drop file uploads. The three additional import sources are wired directly in `BulkBackground.tsx`, reusing the same modal components already available in the project:

- **From Library** -- opens `GarmentLibraryPicker`, fetches selected source images as Files
- **From URL** -- opens `BulkUrlImportModal`, imports images by URL then fetches them as Files
- **From Shopify** -- opens `ShopifyImportModal`, imports Shopify product images then fetches them as Files

## Technical Details

### File: `src/pages/BulkBackground.tsx`

1. Add imports for `GarmentLibraryPicker`, `BulkUrlImportModal`, `ShopifyImportModal`, and icons (`Images`, `Link`, `Store`)
2. Add three boolean state variables for modal visibility (`libraryPickerOpen`, `urlImportOpen`, `shopifyImportOpen`)
3. Add handler functions (same pattern as `MultiGarmentUploader`):
   - `handleLibrarySelect(images)` -- fetches signed URLs, converts to File objects, appends to `productImages`
   - `handleUrlImportComplete(imageIds)` -- queries `source_images` table for imported IDs, fetches via signed URLs with smart bucket detection, converts to Files
   - `handleShopifyImportComplete(imageIds)` -- delegates to URL import handler
4. Add three `Button` components (outline, sm) above the `MultiImageUploader` in the upload card, disabled when at max capacity
5. Add the three modal components at the bottom of the JSX

### No other files change

All modal components (`GarmentLibraryPicker`, `BulkUrlImportModal`, `ShopifyImportModal`) are already generic and accept `maxImages`/`currentCount` props. No modifications needed.

| Item | Detail |
|---|---|
| Files changed | 1 (`src/pages/BulkBackground.tsx`) |
| New dependencies | None |
| Reused components | `GarmentLibraryPicker`, `BulkUrlImportModal`, `ShopifyImportModal` |
| Smart bucket detection | Applied when fetching imported images via `public_url` check |
