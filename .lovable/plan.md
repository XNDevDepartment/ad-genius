

## Remove Last Job Recovery & Fix Replicate Mode to Load Source Image

### Problem
1. The `loadLastJob` call on mount conflicts with replicate mode — it can overwrite the replicate state or cause race conditions.
2. When replicating, only the result image loads. The source image (product image) isn't loaded, so the upload/background/settings sections don't appear, and users can't start a new generation with a different background.

### Changes

**`src/pages/BulkBackground.tsx`**

1. **Remove last job recovery entirely**:
   - Remove `loadLastJob` from the destructured hook
   - Remove `hasCheckedLastJob` and `lastJobAvailable` state variables
   - Remove the `useEffect` that calls `loadLastJob` on mount (lines 81-92)

2. **Enhance replicate mode to load the source image**:
   - In the replicate `useEffect` (lines 71-79), also read `state.sourceImageId`
   - When `sourceImageId` is present, fetch the source image from `source_images` table (get its signed URL), then fetch it as a blob and convert to a `File` object
   - Call `setProductImages([file])` so the upload section shows the product image, and the background/settings sections become visible
   - This lets users click "Change Background" and re-process the same product with different settings

**`src/hooks/useBulkBackgroundJob.ts`**

3. **Remove `loadLastJob` from the hook** (lines 136-149):
   - Remove the `loadLastJob` callback
   - Remove it from the return object

