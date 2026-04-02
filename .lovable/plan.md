

## Fix: 4K Image Generation Always Times Out

### Root Cause

Database evidence is conclusive:
- **4K + `source`**: completes (but `imageConfig` is actually empty — no 4K is sent to Gemini)
- **4K + any aspect ratio**: always times out (all 5 recent attempts failed)
- **2K + any aspect ratio**: always works (5+ recent successes)

The `use4kFallback` pattern (sending `imageSize: '4K'` without aspect ratio, then cropping locally) was the previous fix attempt, but the **model itself hangs on `imageSize: '4K'`** regardless of whether aspect ratio is included. The `gemini-3.1-flash-image-preview` model simply does not handle 4K generation reliably — it causes the request to hang past the 90s timeout.

### Fix Strategy

Since the Gemini model cannot reliably produce 4K images, the edge function should **request 2K from Gemini and then upscale server-side to 4K dimensions** using canvas-based scaling in Deno. This way:

1. The Gemini call succeeds (2K works reliably)
2. The output image is at 4K pixel dimensions
3. The user gets a noticeably larger image than 2K
4. No timeout issues

**Implementation:**

1. When `imageSize === '4K'`, send `imageSize: '2K'` + native aspect ratio to Gemini
2. After receiving the image, upscale it to 4K target dimensions using a pure-Deno PNG decode → resize → re-encode pipeline (using `ImageMagick` WASM or simple bilinear resize)
3. If upscaling fails for any reason, still save the 2K image (graceful degradation)

Actually, Deno edge functions don't have canvas or ImageMagick. A simpler and honest approach:

**Revised strategy — cap at 2K, remove 4K option or relabel:**

Since the Gemini Flash model doesn't support 4K and there's no server-side upscaling available in edge functions, the options are:

**Option A (recommended):** When 4K is selected, silently send `2K` to Gemini with native aspect ratio. The image generates successfully. The user gets 2K quality. Adjust credit cost so 4K doesn't overcharge (or keep it as a "premium" tier that provides 2K).

**Option B:** Remove the 4K option from the UI entirely until a model that supports it is available.

### Proposed Changes (Option A)

**File: `supabase/functions/ugc-gemini/index.ts`**

In both image-edit and text-to-image code paths, replace the 4K fallback logic:

```text
Before:
  if (use4kFallback) {
    imageConfig.imageSize = '4K';
  }

After:
  if (use4kFallback) {
    imageConfig.imageSize = '2K';          // Gemini Flash can't do 4K reliably
    if (useNativeAspect) imageConfig.aspectRatio = aspectRatio;
    log("4K requested but downgraded to 2K (model limitation)", ...);
  }
```

This change affects **3 locations** in the file (image-edit mode, text-to-image mode, and the post-generation crop logic which checks `was4kFallback`).

**File: `supabase/functions/ugc-gemini-v3/index.ts`** — same fix applied.

The post-generation crop section (`was4kFallback`) should be updated to skip the special crop path since we're now sending native aspect ratio with 2K.

### Files Modified
1. `supabase/functions/ugc-gemini/index.ts` — downgrade 4K requests to 2K + native aspect ratio
2. `supabase/functions/ugc-gemini-v3/index.ts` — same fix

