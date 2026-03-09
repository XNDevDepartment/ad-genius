
## Analysis

**Current state:**
- `EditImageModal` already exists and works — it calls `edit-image` Edge Function, deducts 1 credit, and saves the edited image to the `ugc` bucket + `ugc_images` table with `meta: { source: "edit", original_image_url: ... }`
- The edit button already exists in: `ImageLibraryGrid.tsx` (library), `GeneratedImagesRows.tsx` (UGC generation output)
- **Missing edit button in:** `BatchSwapPreview.tsx` (outfit-swap results), `BulkBackground.tsx` (bulk background results)
- **Version control / edit history:** not yet tracked — edits are stored as plain `ugc_images` rows with `meta.source = "edit"` but there is no link to parent versions and no dedicated UI to show the chain

**Performance-safe approach:**
No new tables needed. The existing `ugc_images` table already stores `source_image_id` (optional FK). We will use `meta.source = "edit"` and `meta.original_image_url` that are already being written by the Edge Function to establish parent→child relationships. The library already loads `ugc_images` — edits will naturally appear in the library grouped as `source_type: 'ugc'`.

The only data-layer addition needed is to pass the `originalImageId` more reliably so the link is stored. The edit-image function already writes `source_image_id: originalImageId || null` to `ugc_images`.

---

## What to Build

### 1. Edit button in `BulkBackground.tsx` results grid
Add an "Edit" button next to the existing action buttons for each completed bulk background result. Uses the existing `EditImageModal`.

### 2. Edit button in `BatchSwapPreview.tsx` result cards
Add an "Edit" button in the per-job action grid alongside Download, Open, Animate. Uses existing `EditImageModal`.

### 3. Version history panel in `EditImageModal`
When the modal opens, if `imageId` is provided, query `ugc_images` for rows where `meta->>'original_image_url'` matches the current image URL OR where `source_image_id` matches. Show a small "Edit history" strip at the bottom with thumbnail previews of previous edits. This is a lightweight read query — no schema change needed.

### 4. Library already shows edits — add a visual badge
In `ImageLibraryGrid.tsx`, images with `meta.source = "edit"` already appear. We'll add a small "Edited" badge so users can identify edited images. The library already reads `ugc_images.meta`.

---

## Files to Change

| File | Change |
|---|---|
| `src/pages/BulkBackground.tsx` | Import `EditImageModal`, add state `editingBgImage`, render `EditImageModal`, add Edit button to each result card |
| `src/components/BatchSwapPreview.tsx` | Import `EditImageModal`, add state `editingSwapImage`, render `EditImageModal`, add Edit button to per-job action grid |
| `src/components/EditImageModal.tsx` | Add version history strip — query `ugc_images` where `meta->>'original_image_url'` = current imageUrl, show thumbnail row if any edits exist |
| `src/components/ImageLibraryGrid.tsx` | Add "Edited" badge for images where the source_type is `ugc` and they have `meta.source = "edit"` (requires passing meta through; minor — add `meta` field to `LibraryImage` interface and normalize it in `useLibraryImages`) |
| `src/hooks/useLibraryImages.ts` | Add `meta` field to `LibraryImage` when normalizing `ugc_images` |

---

## Implementation Details

### BulkBackground.tsx
```tsx
// State
const [editingBgImage, setEditingBgImage] = useState<{ url: string; id: string } | null>(null);

// Button in result card (after existing Download button):
<Button variant="outline" size="sm" className="gap-1"
  onClick={() => setEditingBgImage({ url: result.result_url!, id: result.id })}>
  <Pencil className="h-4 w-4" />
  <span className="hidden sm:inline">Edit</span>
</Button>

// Modal at bottom:
{editingBgImage && (
  <EditImageModal
    isOpen={!!editingBgImage}
    onClose={() => setEditingBgImage(null)}
    imageUrl={editingBgImage.url}
    imageId={editingBgImage.id}
  />
)}
```

### BatchSwapPreview.tsx
Add state + button in the action grid (between Download and Animate), and modal at the bottom alongside the existing modals.

### EditImageModal.tsx — Version history strip
After a successful edit, or on open when `imageId` exists, fetch:
```ts
supabase.from('ugc_images')
  .select('id, public_url, created_at')
  .eq('user_id', ...) // can be omitted — RLS ensures user owns rows
  .filter('meta->>source', 'eq', 'edit')
  .filter('meta->>original_image_url', 'eq', imageUrl)
  .order('created_at', { ascending: false })
  .limit(5)
```
Show a scrollable row of small thumbnail buttons. Clicking one loads it as the new "current" image to edit from. This is a pure read with no extra table.

### ImageLibraryGrid.tsx — "Edited" badge
The `LibraryImage` interface needs a `meta?: any` field. Then in the grid render, if `image.meta?.source === 'edit'`, show a small pill badge "Edited" overlaid on the image thumbnail. Lightweight.

---

## What Does NOT Change
- No database schema changes needed
- No new Supabase tables
- Edge function prompt/logic stays the same
- No performance impact — all new queries are small reads with existing RLS
