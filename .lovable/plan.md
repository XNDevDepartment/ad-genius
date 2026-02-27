

# Plan: 2 Fixes

## 1. Photoshoot stuck: Auth mismatch on self-call

**Root cause:** In `supabase/functions/outfit-swap/index.ts`, line 1504 triggers `processPhotoshoot` using `SUPABASE_ANON_KEY`, but line 424-428 requires `SUPABASE_SERVICE_ROLE_KEY` for processing actions. The call gets a 403 Forbidden, so the photoshoot stays "queued" forever.

**Fix in `supabase/functions/outfit-swap/index.ts` line 1504:**
Change `Deno.env.get("SUPABASE_ANON_KEY")` to `SUPABASE_SERVICE_ROLE_KEY` (which is already a const at the top of the file).

## 2. Missing translations for new photoshoot categories and poses

The `en.json` has the full `photoshootModal` section with categories + new angle keys (`armsCrossed`, `handOnHip`, `overShoulder`, `seated`, `crossLegged`, `lowerBodyDetail`). The other 4 locale files (`pt.json`, `es.json`, `fr.json`, `de.json`) are missing:

- `categorySelectionDescription` key
- `selectCategoryLabel` key
- The entire `categories` object (top, bottom, footwear, fullBody)
- New angle keys: `armsCrossed`, `handOnHip`, `overShoulder`, `seated`, `crossLegged`, `lowerBodyDetail`

**Fix:** Add the missing keys to all 4 locale files with proper translations inside their existing `photoshootModal` sections.

### Files to modify
1. `supabase/functions/outfit-swap/index.ts` -- fix auth key on line 1504
2. `src/i18n/locales/pt.json` -- add missing photoshoot translations
3. `src/i18n/locales/es.json` -- add missing photoshoot translations
4. `src/i18n/locales/fr.json` -- add missing photoshoot translations
5. `src/i18n/locales/de.json` -- add missing photoshoot translations

