

# Fix Module Selection Images + Video Library Mobile Performance

## Problem 1: Module Selection images don't load on mobile

The `DemoMedia` component on line 61 does:
```
src.replace("mp4","png")
```
This tries to swap the extension in the Vite-bundled URL (e.g. `/assets/ugc-a1b2c3.mp4`), but the PNG file has a completely different bundled hash, so the resulting URL is invalid and the image never loads.

**Fix**: Import the PNG fallback images explicitly and pass them as a separate prop.

- Import the 4 PNG files: `ugc.png`, `video.png`, `fashion_catalog.png`, `product_catalog.png`
- Add a `fallbackImage` property to each workflow object
- In `DemoMedia`, use the `fallbackImage` prop on mobile instead of string-replacing the video URL

## Problem 2: Video Library renders slowly on mobile

Two locations need fixing:

### VideoCard.tsx (thumbnail previews)
- Line 78-86: The `<video>` element has no `preload` attribute, so the browser doesn't start loading until interaction
- Add `preload="metadata"` so thumbnails load the first frame quickly
- Add `playsInline` (already present, confirmed OK)

### VideoLibrary.tsx (viewer modal)
- Line 308-314: The modal video player has no `preload`, `playsInline`, or `muted` attributes
- Add `preload="auto"`, `playsInline`, and `muted` for reliable mobile playback
- Add a `videoError` state with a fallback download button, matching the pattern in `AnimateImageModal`

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/ModuleSelection.tsx` | Import PNG fallbacks, add `fallbackImage` prop, use it on mobile instead of string replace |
| `src/components/VideoCard.tsx` | Add `preload="metadata"` to video element for faster thumbnail loading |
| `src/pages/VideoLibrary.tsx` | Add `preload="auto"`, `playsInline`, `muted` to modal video; add error fallback with download button |

---

## Technical Details

### ModuleSelection.tsx

Add imports:
```typescript
import demoUgcImg from "@/assets/module_icons/ugc.png";
import demoVideoImg from "@/assets/module_icons/video.png";
import demoOutfitImg from "@/assets/module_icons/fashion_catalog.png";
import demoBulkImg from "@/assets/module_icons/product_catalog.png";
```

Update each workflow entry to include `fallbackImage`:
```typescript
{ id: "ugc", demoImage: demoUgc, fallbackImage: demoUgcImg, ... }
```

Update `DemoMedia` to accept and use `fallbackImage` on mobile:
```typescript
if (isMobile) {
  return <img src={fallbackImage} alt={alt} className="w-full h-full object-cover" />;
}
```

### VideoCard.tsx

Add `preload="metadata"` to the video element (line 78-86):
```tsx
<video
  ref={videoRef}
  src={videoUrl}
  className="w-full h-full object-cover"
  muted
  loop
  playsInline
  preload="metadata"
  onError={() => setVideoError(true)}
/>
```

### VideoLibrary.tsx

Update the modal video player (lines 308-314) with mobile-friendly attributes and error fallback:
```tsx
const [modalVideoError, setModalVideoError] = useState(false);

// In the modal:
{videoUrl && !modalVideoError ? (
  <video
    key={viewingVideo.id}
    src={videoUrl}
    controls
    playsInline
    muted
    preload="auto"
    className="w-full rounded-lg bg-black"
    onError={() => setModalVideoError(true)}
  />
) : videoUrl && modalVideoError ? (
  <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-3">
    <p className="text-sm text-muted-foreground">Video preview unavailable on this device</p>
    <Button variant="outline" size="sm" onClick={() => downloadVideo(viewingVideo)}>
      Download Video
    </Button>
  </div>
) : (
  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
    <p className="text-muted-foreground">Video not available</p>
  </div>
)}
```

Reset `modalVideoError` when opening a new video.

