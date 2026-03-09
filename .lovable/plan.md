

## Fix: Photoshoot Library Showing Only 4 Images

### Problem

In `src/hooks/useLibraryImages.ts` (lines 258-279), photoshoot images are extracted using only the fixed `image_${index+1}_url` columns. The database table only has 4 image columns (`image_1_url` through `image_4_url`), but photoshoots can generate up to 7 images. The edge function already stores all results in `metadata.generated_images` JSONB array — but the library ignores it.

The `PhotoshootModal.tsx` already handles this correctly by reading from `metadata.generated_images` first, falling back to the 4 columns. The library just needs the same logic.

### Fix

**File: `src/hooks/useLibraryImages.ts`** — lines 258-279

Replace the photoshoot normalization to prioritize `metadata.generated_images`:

```ts
const photoshootImages: LibraryImage[] = (photoshootResult.data || []).flatMap((photoshoot: any) => {
  // Prioritize metadata.generated_images (stores ALL images including 5+)
  const metaImages = photoshoot.metadata?.generated_images as Array<{ angleId: string; url: string; path: string }> | undefined;
  
  if (metaImages && metaImages.length > 0) {
    return metaImages.map((img, index) => ({
      id: `${photoshoot.id}_${img.angleId || index}`,
      url: img.url,
      prompt: `Photoshoot - ${(img.angleId || `image_${index+1}`).replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} View`,
      created_at: photoshoot.created_at,
      settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
      source_type: 'photoshoot' as const,
      photoshoot_id: photoshoot.id,
      angle_type: img.angleId as any,
      original_result_id: photoshoot.result_id
    }));
  }
  
  // Fallback: read from fixed columns (backward compat, max 4)
  const selectedAngles = photoshoot.selected_angles || ['front', 'three_quarter', 'back', 'side'];
  return selectedAngles
    .map((angle: string, index: number) => {
      const imageUrl = photoshoot[`image_${index + 1}_url`];
      if (!imageUrl) return null;
      return {
        id: `${photoshoot.id}_${angle}`,
        url: imageUrl,
        prompt: `Photoshoot - ${angle.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} View`,
        created_at: photoshoot.created_at,
        settings: { size: '1024x1024', quality: 'high', numberOfImages: 1, format: 'png' },
        source_type: 'photoshoot' as const,
        photoshoot_id: photoshoot.id,
        angle_type: angle as any,
        original_result_id: photoshoot.result_id
      };
    })
    .filter(Boolean);
});
```

This is a single-file fix. No database or edge function changes needed — the backend already stores all images in `metadata.generated_images`.

