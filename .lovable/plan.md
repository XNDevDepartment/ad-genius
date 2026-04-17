

## Fix Collections Bugs + Library Header Sizing

### Issues to fix

**1. Emoji selection closes the Create Collection modal**
- Root cause: emoji and color `<button>` elements call `setEmoji(e)` / `setColor(c)` which trigger a re-render, and because of how the controlled/uncontrolled `open` state is computed (`isControlled = open !== undefined`), the dialog incorrectly toggles closed in some render paths. Also clicks may be propagating to outer handlers.
- Fix in `src/components/library/CreateCollectionDialog.tsx`:
  - Add `e.preventDefault()` and `e.stopPropagation()` to every emoji and color button click handler.
  - Stabilize the controlled/uncontrolled detection so `setOpen` does not flip dialog state during selection.

**2. Selecting a collection shows "X images" but loads nothing**
- Root cause: in `LibraryCatalog.tsx → CollectionImageGrid`, images come from `useLibraryImages({ limit: 100 })` and are filtered client-side by `contentIds`. But:
  - Collection items can include sources beyond the first 100 returned images.
  - Filter/sort/search defaults may exclude items.
  - IDs from photoshoots / product views are composite (`${photoshoot.id}_${angle}`), so a stored `content_id` from a generated image will not match unless saved with the same composite key.
- Fix:
  - Increase fetch limit and pass `filter: 'all'`, no search, no date filter, sort newest, so the union covers everything.
  - Add a fallback lookup: when a `content_id` doesn't match any loaded library image, attempt a direct lookup by ID across `ugc_images` / `generated_images` / `outfit_swap_results` / `bulk_background_results` to surface the URL.
  - Show a clear empty/partial-load message when items exist in DB but cannot be resolved (so it never silently shows "0").

**3. Add a "select multiple" mode to perform bulk actions (add to collection / delete)**
- `ImageLibraryGrid` already supports `selectionMode`, `selectedIds`, and `onBulkDelete`. We need to:
  - Add an entry button "Select" in the Generated Images card header that toggles `genSelectionMode`.
  - Extend `ImageLibraryGrid`'s selection-mode header with a new "Add to Collection" action that opens a dedicated bulk dialog.
  - Create `BulkAddToCollectionDialog` (a small variation of `AddToCollectionDialog`) that accepts an array of `{ id, type }` and adds all selected images to the chosen collection in one batch via `useCollectionItems.addItem` looped per id (or a small helper `addItems`).
  - Wire it up in `LibraryCatalog.tsx` for the generated-images grid.

**4. "Source Images" and "Collections" buttons in the library are too large; align with search & filters row**
- Currently the Collections and Source Images entries are big full-width `<Card>` blocks with a 12×12 icon, padding, and right-side action.
- Replace them with a compact horizontal toolbar placed directly above (or merged into) the `LibrarySearchBar` row:
  - Two pill-style buttons (`📁 Collections (n)` and `🖼 Source Images (n)`), height matched to the search input, plus their inline secondary actions (`+ New`, `Upload`).
  - Keep the same navigation behavior (clicking the pill opens the corresponding view).
  - On small screens they wrap below the search row.

### Files to change
- `src/components/library/CreateCollectionDialog.tsx` — fix emoji/color click handlers and controlled-state detection.
- `src/components/library/AddToCollectionPopover.tsx` — extract / extend to support a bulk variant; load existing memberships when opened single-item.
- `src/components/library/BulkAddToCollectionDialog.tsx` — new small component for multi-image add.
- `src/hooks/useCollectionItems.ts` — add `addItems(contentIds, contentType, collectionId)` helper.
- `src/components/ImageLibraryGrid.tsx` — add "Add to Collection" button to the bulk selection-mode header (when an `onBulkAddToCollection` prop is provided).
- `src/components/departments/LibraryCatalog.tsx`:
  - Replace the two big `<Card>` shortcuts with a compact toolbar row above `LibrarySearchBar`.
  - Add a "Select" toggle in the Generated Images card header.
  - Wire bulk add-to-collection and improve `CollectionImageGrid` data loading + fallback resolution.

### Out of scope
- No DB schema changes needed.
- No changes to source image cards (download already added).

