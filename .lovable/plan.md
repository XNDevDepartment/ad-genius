

# Dynamic Credits + Detailed Image Generation

## Overview
Two changes: (1) credits per image vary by resolution (1K=1, 2K=2, 4K=4), and (2) the "Detailed Image" button triggers a Gemini macro/close-up generation and stores the result linked to the original image.

## 1. Dynamic Credits by Image Size

### Frontend (`src/pages/BulkBackground.tsx`)
- Replace the fixed `CREDITS_PER_IMAGE = 2` constant with a function:
  ```
  getCreditsPerImage(size): 1K -> 1, 2K -> 2, 4K -> 4
  ```
- `totalCost` becomes `productImages.length * getCreditsPerImage(imageSize)`
- Pass `imageSize` into settings (already done) so the backend can compute correctly

### Backend (`supabase/functions/bulk-background/index.ts`)
- Replace `CREDITS_PER_IMAGE = 2` with a helper function that reads `settings.imageSize`
- Update all credit calculations (createJob, cancelJob, retryResult, recoverJobs) to use dynamic cost
- The `settings.imageSize` is already stored in the job record

## 2. Detailed Image Generation

### New Database Column
Add `detailed_result_url TEXT` to `bulk_background_results` to store the enhanced close-up image linked to the original result.

### New Edge Function Action: `generateDetailedImage`
Add a new action to `supabase/functions/bulk-background/index.ts`:
- Accepts `resultId` from the frontend
- Validates ownership and that the result is completed
- Deducts 1 credit (admin-exempt)
- Fetches the result image (not source -- the already-generated background image)
- Sends it to Gemini with the macro/close-up prompt:
  ```
  Create a close-up or macro-style view of the uploaded product focusing on material quality, texture, and finish. Preserve exact product details and proportions. Use soft, controlled lighting to enhance surface characteristics without distortion. Shallow depth of field, ultra-sharp focus on key materials, clean background. High-end product photography style, ultra-realistic. Without affecting the product shape.
  ```
- Uploads the result to storage: `{user_id}/{job_id}/{index}-detailed.webp`
- Updates `detailed_result_url` on the `bulk_background_results` row
- Returns the URL

### Frontend API (`src/api/bulk-background-api.ts`)
Add a new method:
```typescript
async generateDetailedImage(resultId: string): Promise<{ detailedUrl: string }>
```

### Frontend UI (`src/pages/BulkBackground.tsx`)
- "Detailed Image" button behavior changes:
  - If `result.detailed_result_url` exists: open the detailed image in `ImagePreviewModal`
  - If not: call `generateDetailedImage(result.id)`, show a loading spinner on the button, and on success update the result in local state with the new URL
- Add a loading state map: `detailedLoading: Record<string, boolean>`
- Once generated, the gradient button changes to "View Detailed" and opens the preview

### Hook Update (`src/hooks/useBulkBackgroundJob.ts`)
- Add `generateDetailedImage` method that calls the API and updates the local results state

### API Type Update (`src/api/bulk-background-api.ts`)
- Add `detailed_result_url?: string` to `BulkBackgroundResult` interface

## Technical Details

### Credit Cost Function (shared frontend + backend pattern)
```
function getCreditsForSize(imageSize: string): number {
  switch (imageSize) {
    case '4K': return 4;
    case '2K': return 2;
    default: return 1; // 1K
  }
}
```

### Detailed Image Prompt (hardcoded in edge function)
```
Create a close-up or macro-style view of the uploaded product focusing on material quality, texture, and finish. Preserve exact product details and proportions. Use soft, controlled lighting to enhance surface characteristics without distortion. Shallow depth of field, ultra-sharp focus on key materials, clean background. High-end product photography style, ultra-realistic. Without affecting the product shape.
```

### Files Modified
- `src/pages/BulkBackground.tsx` -- dynamic credits + detailed image button logic
- `src/api/bulk-background-api.ts` -- new method + type update
- `src/hooks/useBulkBackgroundJob.ts` -- new generateDetailedImage wrapper
- `supabase/functions/bulk-background/index.ts` -- dynamic credits + generateDetailedImage action
- Database migration: add `detailed_result_url` column

### Translation Keys
Add under `bulkBackground.buttons`:
- `viewDetailed`: "View Detail" / translations
- `generating`: "Generating..." / translations

