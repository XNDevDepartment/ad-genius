

# Library Panel: Pagination Fix and Category Navigation

## Problem
1. The library bugs when loading images because all image types are fetched simultaneously with overlapping pagination, causing issues when datasets exceed Supabase's row limits.
2. Users cannot filter between Outfit-Swap, UGC, and Bulk Background images -- everything is mixed together.

## Build Error Fix (Prerequisite)
The `supabase/functions/bulk-background/index.ts` has a type error at line 811: `settings` is not included in the select query (line 725) or the type cast (line 734). Both need to be updated to include `settings`.

## Changes

### 1. Fix bulk-background edge function build error
**File:** `supabase/functions/bulk-background/index.ts`
- Add `settings` to the select query on line 725
- Add `settings` to the type cast on line 734

### 2. Add "Bulk Background" as a new category in `useLibraryImages`
**File:** `src/hooks/useLibraryImages.ts`
- Expand the `filter` type from `'all' | 'ugc' | 'outfit_swap'` to `'all' | 'ugc' | 'outfit_swap' | 'bulk_background'`
- Add a new query for `bulk_background_results` table when filter is `'all'` or `'bulk_background'`
- Normalize bulk background results into `LibraryImage` format with `source_type: 'bulk_background'`
- **Fix pagination**: When a specific filter is active (not "all"), only query that single table, making pagination accurate and preventing the current bug where offset/limit is applied to each table separately and then merged

### 3. Replace the ToggleGroup navigation in the Library component
**File:** `src/components/departments/LibraryOld.tsx`
- Replace the current "AI Generated / Source Images" toggle with a category tab bar:
  - **All** (default) -- shows everything mixed, sorted by date
  - **UGC** -- only UGC-generated images
  - **Outfit Swap** -- outfit swap results, photoshoots, e-commerce photos
  - **Bulk Background** -- bulk background results
  - **Source Images** -- uploaded product images (existing behavior)
- The filter value is passed to `useLibraryImages` which fetches only the relevant table(s)
- Keep the existing "Show Source Thumbnails" toggle for AI image categories

### 4. Add Bulk Background images query
**File:** `src/hooks/useLibraryImages.ts`
- Query `bulk_background_results` table filtered by `status = 'completed'` and joining via `bulk_background_jobs` for `user_id`
- Map results to `LibraryImage` format using the `result_url` field

### 5. Add translations for new category tabs
**Files:** `src/i18n/locales/en.json`, `pt.json`, `es.json`, `de.json`, `fr.json`
- Add keys: `library.categories.all`, `library.categories.ugc`, `library.categories.outfitSwap`, `library.categories.bulkBackground`, `library.categories.sourceImages`

### 6. Redeploy the bulk-background edge function

## Technical Notes
- When filtering by a specific category, pagination works correctly because we query only one table with proper `.range()` offsets
- The "All" view combines results from all tables, sorted by `created_at` descending -- pagination here is approximate but sufficient for infinite scroll
- The `LibraryImage` interface already has `source_type` which supports identifying image origins
- The existing `ImageLibraryGrid` component with infinite scroll (`useInView`) remains unchanged

