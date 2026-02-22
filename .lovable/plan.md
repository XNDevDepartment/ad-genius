

# Audit Results + Fixes

## Audit Findings

### Issue 1: ModuleSelection DemoMedia condition (MINOR - already fixed)
The last diff changed `isMobile || id !== "video"` to `isMobile && id !== "video"`, but the current file shows `if (isMobile)` without the `id` check at all. This means on mobile, ALL module cards show static PNG images instead of video -- this is correct behavior since hover-to-play doesn't work on touch.

**Status: OK, no fix needed.**

### Issue 2: AnimateImageModal video not loading on mobile (BUG)
The `<video>` element in `AnimateImageModal.tsx` (line 141-149) has the correct attributes (`muted`, `playsInline`, `autoPlay`, `controls`). However, there's no `crossOrigin` attribute, which can cause issues when the video URL is hosted on a different domain (Kling CDN). On some mobile browsers, this can silently fail to load.

**Fix: Do NOT add `crossOrigin` (it can break loading from CDNs without CORS). Instead, add a `preload="auto"` attribute and an `onError` handler to show a fallback download link if the video fails to render inline.**

### Issue 3: Activation gate removal (CLEAN)
- `useCredits.tsx`: `canAccessVideos()` no longer checks activation -- correct
- `kling-video/index.ts`: Server-side activation block removed -- correct
- `Index.tsx`: `needsVideoAccess` removed from video module -- correct
- `ModuleSelection.tsx`: Video module has `locked: false` -- correct

**Status: OK.**

### Issue 4: OnboardingChecklist email step (CLEAN)
Non-blocking email verification step added correctly with `useAccountActivation`.

**Status: OK.**

### Issue 5: Hardcoded "In Progress" strings in ModuleSelection (MINOR)
Lines 122-126 have untranslated English strings: `"In Progress"` and the description.

**Fix: Use translation keys.**

---

## Changes to Implement

### File 1: `src/components/AnimateImageModal.tsx`

Add mobile-friendly video rendering with error fallback:
- Add `preload="auto"` to the video element
- Add an `onError` state that shows a "Download Video" link as fallback when the video fails to load inline on mobile
- Keep `muted`, `playsInline`, `controls` as-is (they're correct)

### File 2: `src/pages/ModuleSelection.tsx`

- Translate the hardcoded "In Progress" title and description using `t()` keys

### File 3: `src/i18n/locales/[en,pt,es,fr,de].json`

- Add `createSelection.inProgress.title` and `createSelection.inProgress.description` keys in all locales

---

## Files Changed

| File | Change |
|---|---|
| `src/components/AnimateImageModal.tsx` | Add video error fallback for mobile + preload attribute |
| `src/pages/ModuleSelection.tsx` | Translate "In Progress" strings |
| `src/i18n/locales/en.json` | Add `createSelection.inProgress.*` keys |
| `src/i18n/locales/pt.json` | Portuguese translations |
| `src/i18n/locales/es.json` | Spanish translations |
| `src/i18n/locales/fr.json` | French translations |
| `src/i18n/locales/de.json` | German translations |

