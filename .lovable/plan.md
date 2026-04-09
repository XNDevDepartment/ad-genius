

## Switch Library: Generated Images First, Source Images in Folder

### Current behavior
When you open the Library, you see **source images** as cards (Level 1). Clicking one opens its **generated images** (Level 2).

### New behavior
When you open the Library, you see **all generated images** directly in a grid (Level 1) — same as the old `EmbeddedLibrary` flat view. A "Source Images" folder/button takes you to the source image catalog (Level 2), where clicking a source shows its generated images (Level 3).

### Implementation

**File: `src/components/departments/LibraryCatalog.tsx`**

1. **Default view (Level 1)**: Show all generated images using the existing `useLibraryImages` hook (already used by `EmbeddedLibrary`). Display them in `ImageLibraryGrid` with load-more pagination. Add a prominent "Source Images" button/card at the top that navigates to the source catalog view.

2. **Source catalog view (Level 2)**: The current source-image grid (with `SourceCard` components). Accessed by clicking the "Source Images" button. Has a back arrow to return to the generated images view.

3. **Source detail view (Level 3)**: Same as current Level 2 — shows generated images for a specific source. Back arrow returns to source catalog.

**State changes:**
- Add a `viewLevel` state: `'generated' | 'sources' | 'sourceDetail'` (default: `'generated'`)
- Import and use `useLibraryImages` for the generated images view
- Keep `useLibraryBySource` for source catalog and detail views
- Move the "Upload Images" and "Shopify" buttons to the source catalog view (Level 2)

**Files Modified:**
1. `src/components/departments/LibraryCatalog.tsx` — restructure to show generated images first, sources as a sub-view

