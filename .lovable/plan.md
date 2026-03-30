

## Fix Image Animator Translation Issues

### Problem
Two issues identified:

1. **VideoGenerator page showing raw i18n keys** (as shown in the screenshot) — The translation JSON files contain all the correct `videoGenerator.*` keys with no duplicates. The structure is valid. This is most likely a build/cache issue from the previous duplicate-key fix. A rebuild should resolve it, but to be safe we should verify the JSON files parse correctly.

2. **AnimateImageModal has zero i18n** — The modal component (`src/components/AnimateImageModal.tsx`) has every string hardcoded in English: "Animate Image", "Motion Prompt", "AI Suggest", "Duration", "5 seconds", "10 seconds", "Generate Video", "Download", "New Video", "Generating...", etc. This needs full internationalization.

### Changes

#### 1. Add i18n to AnimateImageModal (`src/components/AnimateImageModal.tsx`)
- Import `useTranslation` from react-i18next
- Replace all 20+ hardcoded English strings with `t()` calls using `videoGenerator.*` keys that already exist, plus new `animateImage.*` keys for modal-specific strings

Strings to translate (new keys under `animateImage`):
- "Animate Image" (title)
- "Generate a video from your image using AI" (description)
- "Video preview is not available on this device."
- "Download Video" / "Download"
- "Your video is generating..." (processing message)
- "Got it"
- "Video generation failed." (error)
- "Motion Prompt"
- "AI Suggest"
- "Describe the motion you want..."
- "Duration"
- "5 seconds" / "10 seconds"
- "Generate Video (Xs)"
- "Generating..." / "Starting..."
- "New Video"

#### 2. Add translation keys to all 5 locale files
Add `animateImage` block with all keys to:
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`
- `src/i18n/locales/es.json`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/de.json`

### Files Modified
1. `src/components/AnimateImageModal.tsx` — add `useTranslation`, replace all hardcoded strings
2. `src/i18n/locales/en.json` — add `animateImage` keys
3. `src/i18n/locales/pt.json` — add `animateImage` keys (Portuguese)
4. `src/i18n/locales/es.json` — add `animateImage` keys (Spanish)
5. `src/i18n/locales/fr.json` — add `animateImage` keys (French)
6. `src/i18n/locales/de.json` — add `animateImage` keys (German)

