

# Add Missing Translations: Pricing Page + UGC Module

## Summary

Two categories of missing translations were found:

1. **Pricing page**: The entire `pricing.v2` namespace (used by the redesigned page) was never added to any locale file. All `pricing.v2.*` keys fall back to hardcoded English defaults or show raw keys.
2. **UGC module** (`CreateUGCGeminiBase.tsx`): Several strings are hardcoded in English instead of using `t()`.

## Changes

### File 1-5: All Locale Files

Add the `pricing.v2` object inside the existing `pricing` key in each locale file. This covers:

**Hero section (5 keys):**
- `pricing.v2.hero.badge`
- `pricing.v2.hero.titleLine1`
- `pricing.v2.hero.titleLine2`
- `pricing.v2.hero.subtitle`

**Trust chips (3 keys):**
- `pricing.v2.trustChips.trial`
- `pricing.v2.trustChips.noCard`
- `pricing.v2.trustChips.cancel`

**Plan cards (3 plans x bestFor + 7 features each = 24 keys):**
- `pricing.v2.plans.[starter|plus|pro].bestFor`
- `pricing.v2.plans.[starter|plus|pro].features.[images|scenarios|tryon|video|photoshoots|support|commercial|earlyAccess]`

**Value anchors (3 keys):**
- `pricing.v2.costPerImage` (with `{{price}}` interpolation)
- `pricing.v2.vsPhotographer`
- `pricing.v2.whatsIncluded`

**Value props section (5 keys):**
- `pricing.v2.valueProps.title`
- `pricing.v2.valueProps.subtitle`
- `pricing.v2.valueProps.[save|speed|results].title`
- `pricing.v2.valueProps.[save|speed|results].description`

**Credit explainer section (11 keys):**
- `pricing.v2.creditExplainer.title`
- `pricing.v2.creditExplainer.subtitle`
- `pricing.v2.creditExplainer.[image|video5|video10].credits`
- `pricing.v2.creditExplainer.[image|video5|video10].label`
- `pricing.v2.creditExplainer.[image|video5|video10].detail`
- `pricing.v2.creditExplainer.rollover`

**FAQ section (7 Q&A pairs = 14 keys):**
- `pricing.v2.faq.title`
- `pricing.v2.faq.questions.[0-6].question`
- `pricing.v2.faq.questions.[0-6].answer`

**Final CTA (4 keys):**
- `pricing.v2.finalCta.title`
- `pricing.v2.finalCta.subtitle`
- `pricing.v2.finalCta.primary`
- `pricing.v2.finalCta.secondary`

**Comparison table missing keys (2 keys):**
- `pricing.comparisonTable.features.earlyAccess`
- `pricing.comparisonTable.features.businessConsulting`

### File 6: `src/pages/CreateUGCGeminiBase.tsx`

Replace hardcoded English strings with `t()` calls using existing or new UGC translation keys:

| Line(s) | Hardcoded String | Translation Key |
|---|---|---|
| 1342 | `"Vibrant"` | `t('ugc.style.vibrant')` (already exists) |
| 1344 | `"Cinematic"` | `t('ugc.style.cinematic')` (already exists) |
| 1345 | `"Natural"` | `t('ugc.style.natural')` (already exists) |
| 1370 | `"Generating..."` | `t('ugc.generating')` (already exists) |
| 1375 | `"Generate Images (X credits)"` | `t('ugc.generateButton')` + credit info |
| 1382 | `"Insufficient credits..."` | New key `ugc.insufficientCredits` |
| 1383 | `"Generation typically takes 7-14 seconds"` | New key `ugc.generationTime` |
| 1393 | `"Upgrade for More Credits"` | New key `ugc.upgradeCredits` |
| 1409 | `"Open image settings"` | `t('ugc.settings.openSettings')` (already exists) |
| 1425 | `"Generating..."` (mobile) | Same as desktop |
| 1430 | `"Generate Images..."` (mobile) | Same as desktop |
| 1271 | `"Credits"` | `t('ugc.credits')` (already exists) |
| 1280 | `"Free for testing"` / `"Plan"` | New keys `ugc.freeForTesting` / `ugc.planLabel` |

Add these new keys to all 5 locale files inside the existing `ugc` object:
- `ugc.insufficientCredits`: "Insufficient credits ({{remaining}} remaining, need {{needed}})"
- `ugc.generationTime`: "Generation typically takes 7-14 seconds"
- `ugc.upgradeCredits`: "Upgrade for More Credits"
- `ugc.freeForTesting`: "Free for testing"
- `ugc.planLabel`: "{{tier}} Plan"
- `ugc.generateWithCredits`: "Generate Images ({{credits}} credit{{plural}})"
- `ugc.generateFree`: "Generate Images (Free)"

### Files Changed

| File | Change |
|---|---|
| `src/i18n/locales/en.json` | Add ~70 keys: `pricing.v2.*` namespace + new `ugc.*` keys |
| `src/i18n/locales/pt.json` | Portuguese translations for all new keys |
| `src/i18n/locales/es.json` | Spanish translations for all new keys |
| `src/i18n/locales/fr.json` | French translations for all new keys |
| `src/i18n/locales/de.json` | German translations for all new keys |
| `src/pages/CreateUGCGeminiBase.tsx` | Replace ~12 hardcoded English strings with `t()` calls |

