

## Three Changes

### 1. Rename "Pricing" tab to "Upgrade" + highlight for free users

**Files:** `AppSidebar.tsx`, `BottomTabBar.tsx`, all 5 locale JSON files

- In `AppSidebar.tsx` line 41: change `id: "pricing"` to `id: "upgrade"`
- In `AppSidebar.tsx` line 177: the label already uses `t('navigation.${item.id}')`, so it will automatically pick up `navigation.upgrade`
- Add conditional styling: when the user is on a free tier, apply a highlight style (e.g., `bg-primary/10 text-primary font-semibold` or a pulsing dot) to the upgrade nav item
- In `BottomTabBar.tsx`: add an "Upgrade" tab for free-tier users (replacing or adding alongside existing tabs), with `Crown` icon and highlighted styling
- In all 5 locale files, add `"upgrade": "Upgrade"` (en), `"upgrade": "Upgrade"` (pt), `"upgrade": "Mejorar"` (es), `"upgrade": "Améliorer"` (fr), `"upgrade": "Upgraden"` (de) under the `navigation` section

### 2. Add translations for ProductViewsModal (the "Photoshoot" modal in Bulk Background)

**Files:** `ProductViewsModal.tsx`, all 5 locale JSON files

The `ProductViewsModal.tsx` has ~15 hardcoded English strings:
- "Create Photoshoot" (header title)
- "Select views to generate:" 
- View option labels: "Macro View", "Environment View", "3/4 Angle View" and their descriptions
- "Retry Photoshoot" / "Create Photoshoot" button text
- "Not enough credits (X available)"
- "Generating product views... X%"
- "Taking longer than expected..."
- "Cancel"
- "Preview" / "Save"
- "Product views ready!" / "Generation failed"
- "Failed to create product views" / "Please try again"

Replace all with `t('productViews.xxx')` keys and add corresponding entries in all 5 locale files with proper translations.

### 3. Fix onboarding bottom button overlap with device navigation bar

**Files:** `OnboardingWizard.tsx`, `OnboardingWelcome.tsx`, `OnboardingStep1.tsx`, `OnboardingPackSelect.tsx`

The issue: On devices with bottom navigation bars (iOS home indicator, Android gesture bar), the "Next"/"Get Started" button sits at the very bottom of the scrollable content. The system nav bar overlaps it.

Fix approach:
- In `OnboardingWizard.tsx`: add `pb-[env(safe-area-inset-bottom,16px)]` to the content container to ensure bottom padding accounts for the device's safe area
- In each step component, the bottom button areas (`OnboardingWelcome` line 94, `OnboardingStep1` line 71, `OnboardingPackSelect` line 73) should use `pb-safe` or explicit `pb-[calc(env(safe-area-inset-bottom)+16px)]` to push the button above the device navigation bar

### Files modified
1. `src/components/AppSidebar.tsx` — rename pricing to upgrade, add free-tier highlight
2. `src/components/BottomTabBar.tsx` — add upgrade tab for free users with highlight
3. `src/components/ProductViewsModal.tsx` — replace hardcoded strings with i18n keys
4. `src/components/onboarding/OnboardingWizard.tsx` — add safe area bottom padding
5. `src/components/onboarding/OnboardingWelcome.tsx` — bottom safe area padding
6. `src/components/onboarding/OnboardingStep1.tsx` — bottom safe area padding
7. `src/components/onboarding/OnboardingPackSelect.tsx` — bottom safe area padding
8. `src/i18n/locales/en.json` — add navigation.upgrade + productViews keys
9. `src/i18n/locales/pt.json` — same translations in Portuguese
10. `src/i18n/locales/es.json` — same translations in Spanish
11. `src/i18n/locales/fr.json` — same translations in French
12. `src/i18n/locales/de.json` — same translations in German

