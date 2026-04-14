

## Add Download Button to Source Image Cards

### Problem
The Source Images view uses a custom `SourceCard` component that only shows a Delete button on hover. There is no Download button, unlike the generated images grid.

### Fix
Add a Download button to the `SourceCard` component in `src/components/departments/LibraryCatalog.tsx`.

**Changes:**
1. Add `onDownload` prop to `SourceCardProps` interface
2. Add a Download button next to the existing Delete button in the hover overlay
3. Pass `handleDownload` (adapted for source images) when rendering `SourceCard` in the catalog grid

The download button will appear on hover alongside the existing delete button, positioned at `top-2 left-2` (or next to the delete button at `top-2 right-2` with a small gap).

Since `handleDownload` expects a `LibraryImage` but source entries are `SourceCatalogEntry` (with `signedUrl` and `fileName`), I will create a lightweight adapter that maps the source entry fields to what the download handler needs.

### File Modified
- `src/components/departments/LibraryCatalog.tsx` — add `onDownload` to `SourceCard`, render Download button, pass handler from parent

