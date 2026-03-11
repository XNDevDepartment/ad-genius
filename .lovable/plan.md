

## Add "Replicate" Button for Bulk Background Results

### What
Add a Copy/replicate button to Bulk Background images in the library grid, so users can click it and navigate to the Bulk Background page with that result pre-loaded — ready for Photoshoot, Edit, UGC, or Download actions.

### Changes

**1. `src/components/ImageLibraryGrid.tsx`**
- Add `handleReplicateBulkBackground(image)` function that navigates to `/create/bulk-background` with state: `{ replicateMode: true, resultId: image.id, resultUrl: image.url, sourceImageId: image.source_image_id, jobId: image.job_id }`
- Add a Copy button for `source_type === 'bulk_background'` images (same pattern as outfit_swap button, line ~313)

**2. `src/pages/BulkBackground.tsx`**
- Handle `location.state.replicateMode` — when detected:
  - Skip upload/settings steps
  - Set `processingStarted = true`
  - Create a synthetic single result object from the state data (`resultUrl`, `resultId`)
  - Show the results view with all action buttons (Photoshoot, Preview, UGC, Download, Edit)
- Add a "New Batch" button to exit replicate mode and start fresh

**3. `src/hooks/useLibraryImages.ts`**
- Ensure `job_id` is included in bulk_background library images (check if it's already fetched from the query)

