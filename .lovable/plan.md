

## Fix: Edited Images Not Appearing in Library

### Root Cause

The edge function `edit-image` already inserts edited images into the `ugc_images` table — so they **are** stored in the database. The problem is that none of the components using `EditImageModal` pass the `onEditComplete` callback, so the library view never refreshes after an edit completes. The user has to manually reload the page to see their edited image.

### Fix

Add an `onEditComplete` callback to every `EditImageModal` usage that triggers a data refresh:

**1. `src/components/ImageLibraryGrid.tsx`** (Library page)
- Add `onRefresh` prop to `ImageLibraryGridProps`
- Pass `onEditComplete={() => { setEditingImage(null); onRefresh?.(); }}` to the `EditImageModal`

**2. `src/components/departments/LibraryOld.tsx`** (parent that renders `ImageLibraryGrid`)
- Pass the existing `fetchImages` function as `onRefresh` to `ImageLibraryGrid`

**3. `src/components/GeneratedImagesRows.tsx`** (UGC results)
- Pass `onEditComplete` that triggers a toast confirming the edit was saved to library

**4. `src/components/BatchSwapPreview.tsx`** (Outfit Swap results)
- Same pattern — close modal + toast confirmation

**5. `src/pages/BulkBackground.tsx`** (Bulk Background results)
- Same pattern — close modal + toast confirmation

### Files Modified
1. `src/components/ImageLibraryGrid.tsx` — add `onRefresh` prop, wire `onEditComplete`
2. `src/components/departments/LibraryOld.tsx` — pass `onRefresh` to grid
3. `src/components/GeneratedImagesRows.tsx` — wire `onEditComplete`
4. `src/components/BatchSwapPreview.tsx` — wire `onEditComplete`
5. `src/pages/BulkBackground.tsx` — wire `onEditComplete`

