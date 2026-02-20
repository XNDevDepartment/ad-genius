

# Add Translations and Paid-Only Access to Bulk Background

## Two changes

### 1. Make Bulk Background visible to all users, but locked for free tier

Currently the module is hidden behind `adminOnly` checks. The change makes it visible to everyone but restricts access to paid users.

**Files affected:**

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Remove `adminOnly: true` from the `bulk-background` entry in `mobileModules`. Add a `needsPaid: true` flag instead. Update the `MobileModuleGrid` filter to stop hiding it for non-admins, and show a lock icon + redirect to `/pricing` for free users. |
| `src/pages/ModuleSelection.tsx` | The bulk-background card already has `isBeta: true` and `locked: false`. Change `locked` to use `isFreeTier()` so free users see a lock overlay and get redirected to `/pricing` on click. |
| `src/pages/BulkBackground.tsx` | Add a paid-access gate at the top of the component: if `isFreeTier()`, show a locked message with a CTA button to `/pricing` instead of the full panel. Uses the `useCredits` hook already imported. |

### 2. Add missing translation keys across all 5 locales

The bulk background panel already uses `t()` for most strings, but a few keys have inline fallbacks and the import buttons borrow keys from `outfitSwap`. This adds dedicated keys.

**Keys to add in all 5 locale files** (EN, PT, ES, FR, DE):

```text
bulkBackground.buttons.photoshoot     -- "Photoshoot"
bulkBackground.importSources.library  -- "From Library"
bulkBackground.importSources.url      -- "From URL"
bulkBackground.importSources.shopify  -- "From Shopify"
bulkBackground.paidOnly.title         -- "Upgrade Required"
bulkBackground.paidOnly.description   -- "Upgrade to any paid plan to unlock Bulk Background."
bulkBackground.paidOnly.cta           -- "View Plans"
```

**Files affected:**

| File | Change |
|---|---|
| `src/i18n/locales/en.json` | Add 6 new keys under `bulkBackground` |
| `src/i18n/locales/pt.json` | Add 6 translated keys |
| `src/i18n/locales/es.json` | Add 6 translated keys |
| `src/i18n/locales/fr.json` | Add 6 translated keys |
| `src/i18n/locales/de.json` | Add 6 translated keys |

Then update `BulkBackground.tsx` to use the new dedicated keys instead of borrowing from `outfitSwap.garmentUploader.*`.

## Summary

| Item | Detail |
|---|---|
| Files changed | 8 (3 components + 5 locale JSON files) |
| New dependencies | None |
| Access pattern | `isFreeTier()` from `useCredits` hook |
| Free users see | Module card with lock icon; clicking goes to `/pricing` |
| Paid users see | Full bulk background panel, unchanged |

