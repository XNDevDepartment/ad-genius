

# Fix Model Image Cropping on iOS Mobile

## Problem
The model card images use `object-cover` in an `aspect-[3/4]` container. For full-body portrait images (like Amanda's), `object-cover` crops aggressively — on iOS it shows only the forehead/top of head because the image is much taller than the container.

## Fix
Change system model images (line 383) and user model images (line 333) from `object-cover` to `object-contain`. This displays the full body within the card with a neutral background, which is correct for model selection where seeing the full pose matters.

### `src/components/BaseModelSelector.tsx`

**Line 333** (user models):
```
object-cover object-top  →  object-contain
```

**Line 383** (system models):
```
object-cover  →  object-contain
```

Also add a `bg-muted` class to the `aspect-[3/4]` container divs (lines 329 and 379) so the letterbox area has a clean background instead of being transparent.

