

# Fix: UGC Modal Issue + Inline Animate Modal in Outfit Swap

## Issue 1: EcommerceIdeasModal loading/stuck
The `EcommerceIdeasModal` has `className="max-w-2xl h-full"` on its `DialogContent`, which can cause layout issues. The Gemini API call also takes ~10 seconds, leaving users staring at a spinner. The logs confirm the function works but is slow. The dialog's `h-full` stretches it to fill the viewport even when content is minimal.

**Fix in `src/components/EcommerceIdeasModal.tsx`:**
- Change `h-full` to `max-h-[85vh]` and add `overflow-y-auto` so the dialog sizes properly and scrolls if needed

## Issue 2: Animate button navigates away instead of opening inline modal
Currently `handleAnimate` in `BatchSwapPreview.tsx` navigates to `/create/video`. User wants the `AnimateImageModal` to open inline instead.

**Fix in `src/components/BatchSwapPreview.tsx`:**
- Import `AnimateImageModal`
- Add state: `animateModal: { open, imageUrl, imageId }`
- Replace `handleAnimate` navigation with setting this state
- Render `<AnimateImageModal>` alongside the other modals at the bottom

## Files to modify
1. `src/components/EcommerceIdeasModal.tsx` — fix dialog sizing
2. `src/components/BatchSwapPreview.tsx` — add inline AnimateImageModal, replace navigation

