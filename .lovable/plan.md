

# Fix: AI Motion Prompt Should Match User's Language

## Root Cause
The `analyze-image-for-motion` edge function already supports a `language` parameter and uses it in the system prompt (`Write in ${language}`). However, `AnimateImageModal.tsx` never sends it — the request body only includes `{ imageUrl }`, so it defaults to `"en"`.

## Fix

### `src/components/AnimateImageModal.tsx`
1. Import `useLanguage` from `@/contexts/LanguageContext`
2. Get `const { language } = useLanguage()` inside the component
3. On line 58, change `body: JSON.stringify({ imageUrl })` to `body: JSON.stringify({ imageUrl, language })`
4. Add `language` to the `useCallback` dependency array (line 68)

That's it — the edge function already handles the `language` param correctly, generating the prompt in the specified language.

### Files to modify
1. `src/components/AnimateImageModal.tsx` — 4 small changes (import, hook, body, deps)

