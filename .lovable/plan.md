

## Plan: Replace AI Fashion Detection with Manual Product Type Selection Step

### Problem
The `analyze-product-type` edge function (Gemini-based) frequently misclassifies clothing as non-fashion, causing wrong packs to show. Replace it with a simple user choice screen.

### New Flow
```text
Step 0: Welcome
Step 1: Upload image
Step 2: NEW — "What type of product?" (Fashion / General Product)
Step 3: Pack selection (filtered by user's choice)
Step 4: Results
```

### Changes

**1. Create `src/components/onboarding/OnboardingProductType.tsx`** (NEW)
- Simple screen with two large tappable cards:
  - 👗 **Fashion & Apparel** — "Clothing, shoes, accessories worn by people"
  - 📦 **General Product** — "Electronics, cosmetics, food, home goods, etc."
- On select, calls `onNext(isFashion: boolean)`

**2. Edit `src/components/onboarding/OnboardingWizard.tsx`**
- Remove `analyze-product-type` edge function call and `detectingFashion` state
- Remove Loader2 import (no longer needed for detection)
- `handleImageUploaded` simply calls `nextStep({ imageUrl, sourceImageId })` — no detection
- Insert new step 2 → `OnboardingProductType` component
- Shift pack select to step 3, results to step 4
- Update `totalSteps` from 3 to 4

**3. Add i18n keys** to `en.json`, `pt.json`, `es.json`, `fr.json`, `de.json`
- `onboarding.productType.title`: "What are you selling?"
- `onboarding.productType.subtitle`: "This helps us pick the best styles for you"
- `onboarding.productType.fashion`: "Fashion & Apparel"
- `onboarding.productType.fashionDesc`: "Clothing, shoes, accessories"
- `onboarding.productType.product`: "General Product"
- `onboarding.productType.productDesc`: "Electronics, cosmetics, home, food..."

### Files

| File | Action |
|------|--------|
| `src/components/onboarding/OnboardingProductType.tsx` | **Create** — two-card selection screen |
| `src/components/onboarding/OnboardingWizard.tsx` | Edit — remove AI detection, add step 2 |
| `src/i18n/locales/en.json` | Add `productType` keys |
| `src/i18n/locales/pt.json` | Add `productType` keys |
| `src/i18n/locales/es.json` | Add `productType` keys |
| `src/i18n/locales/fr.json` | Add `productType` keys |
| `src/i18n/locales/de.json` | Add `productType` keys |

