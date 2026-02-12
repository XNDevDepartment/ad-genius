# Fix Mobile Image Layout + Add Inline Animate Modal

## Problem 1: Mobile Image Layout Broken

The `GeneratedImagesRows` component uses fixed pixel widths for image thumbnails (`w-80`, `w-72`, `w-[22rem]`) that overflow on small screens, causing the layout shown in the screenshot where the image and action buttons are misaligned.

## Problem 2: Animate Button Missing / Requires Page Navigation

Currently, `CreateUGCGeminiBase` does not pass `onAnimateImage` to `GeneratedImagesRows`, so there is no "Animate" button. Users must navigate to a separate Video Generator page. We will add an inline modal that embeds the full video creation flow.

---

## Changes

### 1. Fix `GeneratedImagesRows.tsx` -- Mobile-Responsive Thumbnails

`**classesFor` function** (line 122-127): Replace fixed widths with responsive classes that constrain to the container width on mobile.

```
Before:
  w-80 h-80          (320px square -- overflows mobile)
  w-72 aspect-[2/3]  (288px -- overflows)
  w-[22rem]           (352px -- overflows)

After:
  w-full sm:w-80 h-auto aspect-square
  w-full sm:w-72 aspect-[2/3]
  w-full sm:w-[22rem] aspect-[3/2]
```

**Row layout** (lines 190, 276): The `flex-col sm:flex-row` is correct, but on mobile the image `shrink-0` div needs `w-full` so the image fills the card width. Action buttons should sit below the image on mobile as a horizontal row instead of a vertical stack.

On mobile: buttons grid switches to `grid-cols-2` for a compact 2x2 layout. On desktop stays `grid-cols-1` vertical stack.

### 2. Add Animate Image Modal to `CreateUGCGeminiBase.tsx`

**New state variables**:

- `animateModalOpen: boolean`
- `animateImageUrl: string | null`
- `animateImageId: string | null`

**Wire `onAnimateImage` prop** to `GeneratedImagesRows`:

```tsx
onAnimateImage={(imageId, imageUrl) => {
  setAnimateImageId(imageId);
  setAnimateImageUrl(imageUrl);
  setAnimateModalOpen(true);
}}
```

**New `AnimateImageModal` component** (inline or separate file):
A Dialog that contains a self-contained version of the video generation flow:

- Shows the pre-selected image (read-only)
- AI-suggested prompt (calls `analyze-image-for-motion` edge function)
- Prompt textarea
- Duration selector (5s / 10s)
- Video settings (camera movement, intensity, style) via `VideoSettingsPanel`
- Generate button
- Progress/status display
- Video playback when complete
- Uses the existing `kling` API functions directly

This modal follows the mobile-fullscreen pattern: `h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0` with a sticky footer for the generate button.

### 3. New Component: `src/components/AnimateImageModal.tsx`

A self-contained modal component that accepts:

- `open`, `onClose`
- `imageUrl`, `imageId`

Internally manages:

- Video job creation via `createVideoJob` / `getVideoJob` / `subscribeVideoJob` from `@/api/kling`
- AI motion analysis via `analyze-image-for-motion` edge function
- `VideoSettings` state
- Job status, progress, and video playback

This avoids duplicating the full VideoGenerator page -- it reuses the same API layer but presents a focused, modal-based UI.

## Files Modified

- `src/components/GeneratedImagesRows.tsx` -- responsive mobile layout
- `src/pages/CreateUGCGeminiBase.tsx` -- add animate modal state + pass `onAnimateImage` prop
- `src/components/AnimateImageModal.tsx` -- new component for inline video generation

## Technical Notes

- The modal reuses existing API functions from `@/api/kling.ts` (no backend changes needed)
- The `analyze-image-for-motion` edge function is already deployed and working
- Mobile-fullscreen pattern applied consistently with other optimized modals
- The `VideoSettingsPanel` component is reused inside the modal