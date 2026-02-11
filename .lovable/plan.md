

# Mobile-Optimized Modals: Fullscreen Layout with Sticky Action Buttons

## Problem
On mobile, the PhotoshootModal (and several other modals) get cut off because the dialog is centered with `translate-y-[-50%]` and has no height constraint. The "Start Photoshoot" button scrolls out of view, making it impossible for users to proceed.

## Solution Strategy
Apply a consistent mobile-fullscreen pattern across all content-heavy modals. On mobile (`< sm`), modals will stretch to fill the viewport using `h-[100dvh]` with a flex column layout: a scrollable content area and a sticky footer for action buttons. On desktop, the existing centered dialog behavior is preserved with `max-h-[90vh]`.

## Changes

### 1. PhotoshootModal (`src/components/PhotoshootModal.tsx`)

**DialogContent classes** (line 272):
- Change from `max-w-4xl overflow-y-auto` to `max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col`
- This makes it fullscreen on mobile, auto-height (capped at 90vh) on desktop

**Content structure** - for each of the 3 stages (setup, angle-selection, processing):
- Wrap the scrollable content in a `<div className="flex-1 overflow-y-auto p-6 space-y-6">` container (remove the default p-6 from DialogContent by adding `p-0` to the className)
- Move the action buttons into a sticky footer: `<div className="sticky bottom-0 border-t bg-background p-4 flex gap-2 justify-end">`
- This ensures the "Continue" / "Start Photoshoot" / "Done" buttons are always visible at the bottom of the screen

**Specific layout tweaks**:
- Original image preview: reduce `max-h-64` to `max-h-40` on mobile via `max-h-40 sm:max-h-64`
- Angle selection image: reduce `max-h-48` to `max-h-32` via `max-h-32 sm:max-h-48`
- Cost summary bar stays inline with scrollable content (above the sticky footer)

### 2. EcommercePhotoModal (`src/components/EcommercePhotoModal.tsx`)

Apply the same pattern:
- DialogContent: `max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0`
- Scrollable content area: `flex-1 overflow-y-auto p-6 space-y-6`
- Sticky footer for action buttons: `sticky bottom-0 border-t bg-background p-4`
- Image grid on mobile: change from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` so images stack vertically and are larger

### 3. ImagePreviewModal (`src/components/ImagePreviewModal.tsx`)

Apply the same pattern:
- DialogContent: `max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0`
- Image container: `flex-1 overflow-hidden flex items-center justify-center p-4`
- Header stays at top with existing styling

### 4. Dialog base component -- no changes
The base `DialogContent` in `src/components/ui/dialog.tsx` remains untouched. All customizations are applied per-modal via className overrides, which is the existing pattern used throughout the project.

## Visual Result (Mobile)

```text
+---------------------------+
| Header / Title            |  <- fixed top
+---------------------------+
|                           |
|  Scrollable content:      |
|  - Image preview          |
|  - Angle selection cards  |
|  - Cost summary           |
|                           |
+---------------------------+
| [Back]  [Start Photoshoot]|  <- sticky bottom, always visible
+---------------------------+
```

## Files Modified
- `src/components/PhotoshootModal.tsx` -- fullscreen mobile + sticky footer for all 3 stages
- `src/components/EcommercePhotoModal.tsx` -- fullscreen mobile + sticky footer + stacked images
- `src/components/ImagePreviewModal.tsx` -- fullscreen mobile + proper image sizing

