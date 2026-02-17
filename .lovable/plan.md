
# Add i18n Translations for Mobile Conversion Components

## Summary

All 3 new mobile conversion components (`MobileCreditCard`, `StickyUpgradeBar`, `PostGenerationUpgradeModal`) and the mobile section of `BillingPanel` have hardcoded English strings. These need to use `useTranslation()` with proper keys, and the keys need to be added to all 5 locale JSON files (EN, PT, ES, FR, DE).

---

## Hardcoded Strings to Translate

### MobileCreditCard.tsx (6 strings)
- "You still have room to test."
- "You're almost out of images."
- "Last images available."
- "Generation locked. Upgrade to continue."
- "Free Plan"
- "Unlock More Images"

### StickyUpgradeBar.tsx (2 strings)
- "You're generating results. Ready to scale?"
- "Unlock 200 credits -- 49 euros"

### PostGenerationUpgradeModal.tsx (4 strings)
- "This image was created with the Free plan."
- "With Plus, you can generate 200 images this month."
- "Upgrade and Scale My Store"
- "Continue with Free"

### BillingPanel.tsx mobile section (6 strings)
- "Current Plan"
- "What you unlock with Plus"
- "200 credits/month"
- "High resolution"
- "Priority support"
- "Unlock Plus"
- "Billing details"

### Pricing.tsx mobile section (2 strings)
- "/image" suffix
- "credits" label

---

## Technical Changes

### New translation key namespace: `mobileUpgrade`

All keys will live under a single `mobileUpgrade` object in each locale file.

### Modified files (4 components)

| File | Change |
|---|---|
| `src/components/MobileCreditCard.tsx` | Add `useTranslation`, replace 6 hardcoded strings with `t()` calls |
| `src/components/StickyUpgradeBar.tsx` | Add `useTranslation`, replace 2 hardcoded strings with `t()` calls |
| `src/components/PostGenerationUpgradeModal.tsx` | Add `useTranslation`, replace 4 hardcoded strings with `t()` calls |
| `src/components/account/BillingPanel.tsx` | Replace 7 hardcoded strings in the mobile layout section with `t()` calls |
| `src/pages/Pricing.tsx` | Replace 2 hardcoded strings in mobile carousel with `t()` calls |

### Locale files (5 files)

Each file gets the same `mobileUpgrade` block added, translated into its respective language:

| File | Language |
|---|---|
| `src/i18n/locales/en.json` | English |
| `src/i18n/locales/pt.json` | Portuguese |
| `src/i18n/locales/es.json` | Spanish |
| `src/i18n/locales/fr.json` | French |
| `src/i18n/locales/de.json` | German |

### Translation key structure

```json
{
  "mobileUpgrade": {
    "freePlan": "Free Plan",
    "urgency": {
      "roomToTest": "You still have room to test.",
      "almostOut": "You're almost out of images.",
      "lastImages": "Last images available.",
      "locked": "Generation locked. Upgrade to continue."
    },
    "unlockMoreImages": "Unlock More Images",
    "stickyBar": {
      "message": "You're generating results. Ready to scale?",
      "cta": "Unlock 200 credits — €49"
    },
    "postGeneration": {
      "title": "This image was created with the Free plan.",
      "description": "With Plus, you can generate 200 images this month.",
      "upgradeCta": "Upgrade and Scale My Store",
      "continueFree": "Continue with Free"
    },
    "billing": {
      "currentPlan": "Current Plan",
      "whatYouUnlock": "What you unlock with Plus",
      "creditsPerMonth": "200 credits/month",
      "highResolution": "High resolution",
      "prioritySupport": "Priority support",
      "unlockPlus": "Unlock Plus",
      "billingDetails": "Billing details"
    },
    "pricing": {
      "perImage": "/image",
      "credits": "credits"
    }
  }
}
```

### No new dependencies

All components already have access to `react-i18next` -- only `MobileCreditCard` and `StickyUpgradeBar` need the import added.
