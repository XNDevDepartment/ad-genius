

## Multi-Image Upload for UGC: Main + Reference Images

### What Changes

Split the single product image upload into two sections:
- **Left**: Main product image (1 image, required) — this is the product the AI must reproduce
- **Right**: Reference/guideline images (up to 2, optional) — these help the AI understand usage, scale, context

All images get uploaded as source images and sent to the edge function. The Gemini prompt is updated to distinguish the "main product" image from "reference/guideline" images.

### Frontend Changes

**1. `src/pages/CreateUGCGeminiBase.tsx`**

- Add new state: `guidelineImages: File[]` and `guidelineSourceIds: string[]`
- Change `maxImages={1}` on the existing `MultiImageUploader` (keep as-is for main image)
- Add a second upload area to the right of the main uploader for guideline images (using another `MultiImageUploader` with `maxImages={2}`)
- Layout: on desktop, use a 2-column grid (`grid-cols-2`); on mobile, stack vertically
- Label the left side "Main Product Image" and the right side "Reference Images (optional)" with a helper tooltip explaining the purpose
- When generating, merge IDs: `[mainSourceId, ...guidelineSourceIds]` into `source_image_ids`, and pass a new field `mainSourceImageIndex: 0` (or `guidelineImageIds: [...]`) so the edge function knows which is the main image
- Update `handleStartFromScratch` to also clear guideline state
- Update replicate mode to restore guideline images

**2. `src/api/ugc-gemini-unified.ts`**

- Add `guidelineImageIds?: string[]` to `CreateJobPayload`

**3. Add i18n keys** for the new labels in all 5 locale files (en, pt, es, fr, de)

### Backend Changes

**4. `supabase/functions/ugc-gemini/index.ts`**

- In `createImageJob`: pass `guidelineImageIds` into the job settings so it persists
- In `processImageJob`: fetch ALL source image URLs, but separate main vs. guideline based on `guidelineImageIds` from settings
- In `generateSingleImageWithGemini`: change signature to accept `mainImageUrl` + `guidelineImageUrls[]`
- In the Gemini API call body, send multiple `inlineData` parts:
  ```
  parts: [
    { text: prompt },
    { inlineData: { mimeType, data: mainImageBase64 } },      // main product
    ...guidelineImages.map(g => ({ inlineData: { ... } }))     // references
  ]
  ```
- Update the prompt text to instruct Gemini:
  - "The FIRST image is the main product — reproduce it exactly"
  - "Additional images are reference guidelines showing how the product is used, its scale, or context. Use them to understand the product better but always feature the product from the first image."

**5. `supabase/functions/ugc-gemini-v3/index.ts`**

- Apply the same multi-image changes for consistency

### UI Layout Detail

```text
┌─────────────────────────────────────────────┐
│  Product & Niche                            │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Main Product │  │ Reference Images     │ │
│  │ Image        │  │ (optional, up to 2)  │ │
│  │              │  │ ┌────┐ ┌────┐        │ │
│  │  [uploader]  │  │ │ +  │ │ +  │        │ │
│  │              │  │ └────┘ └────┘        │ │
│  └──────────────┘  └──────────────────────┘ │
│  [Library] [URL] [Shopify]                  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Files Modified
1. `src/pages/CreateUGCGeminiBase.tsx` — split upload UI, new guideline state, merge IDs on generate
2. `src/api/ugc-gemini-unified.ts` — add `guidelineImageIds` to payload type
3. `supabase/functions/ugc-gemini/index.ts` — multi-image Gemini call with role-aware prompt
4. `supabase/functions/ugc-gemini-v3/index.ts` — same multi-image support
5. `src/i18n/locales/*.json` (5 files) — new labels for reference images section

