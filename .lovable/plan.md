

# Fix: URL Import Returns Success but No Image Appears

## Root Cause
The edge function `upload-source-image-from-url` returns `{ success: true, sourceImage: { id: "..." } }`, but the `BulkUrlImportModal` reads `data.id` instead of `data.sourceImage.id` on line 94. This pushes `undefined` into the `importedIds` array, so when `onImportComplete` fires with those IDs, the database query in `handleUrlImportComplete` finds nothing.

## Fix

### `src/components/BulkUrlImportModal.tsx` — line 94
Change:
```typescript
importedIds.push(data.id);
```
To:
```typescript
importedIds.push(data.sourceImage?.id || data.id);
```

This handles both the actual response shape (`data.sourceImage.id`) and any future change where the edge function might return `data.id` directly.

