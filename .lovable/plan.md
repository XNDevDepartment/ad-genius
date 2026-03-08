

# Fix: Canvas Mask Drawing Not Working

## Root Cause

The image uses `w-full object-contain max-h-[50vh]`, which means when the image aspect ratio doesn't match the container, the actual rendered image is **smaller** than the container (letterboxed). But the canvas is positioned `absolute top-0 left-0 w-full h-full` — covering the **entire container**, not just the visible image area.

This causes two problems:
1. The canvas dimensions (`img.clientWidth`/`img.clientHeight`) reflect the CSS box, not the actual rendered image area
2. Drawing coordinates are offset from the image — strokes don't appear where expected, or the canvas may effectively have zero useful area

## Fix

### `src/components/EditImageModal.tsx`

**Image container**: Change from `w-full` + `object-contain` to a centered flex layout where the image sets its own natural size:

- Container: `flex justify-center` instead of `inline-block w-full`
- Wrap image + canvas in an inner `relative` div that shrink-wraps the image
- Image: `max-w-full max-h-[50vh]` (remove `w-full` and `object-contain`) so it renders at natural aspect ratio
- Canvas: stays `absolute top-0 left-0 w-full h-full` but now the parent matches the image exactly

**Canvas init**: In `handleImageLoad`, use `img.clientWidth` and `img.clientHeight` which will now correctly reflect the actual displayed image size since there's no `object-contain` distortion.

This is a ~10 line change in the JSX template and ensures the canvas overlay aligns pixel-perfectly with the image.

