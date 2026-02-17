

# Mobile Conversion Optimization: Free to Paid

## Overview

Five targeted changes to the mobile experience, all scoped to mobile viewports only. Desktop remains untouched.

---

## 1. Dynamic Credit Card Component (Home Screen)

**File:** New component `src/components/MobileCreditCard.tsx`
**Displayed in:** `src/pages/Index.tsx` (mobile layout section, replacing the current promo/credits area)

**What it does:**
- Shows a progress bar that changes color dynamically based on remaining credits percentage:
  - Green (>70% remaining)
  - Yellow (30-70% remaining)
  - Red (<30% remaining)
- Displays urgency copy based on remaining credits count:
  - 7+: "You still have room to test."
  - 3-6: "You're almost out of images."
  - 1-2: "Last images available."
  - 0: "Generation locked. Upgrade to continue."
- Large, thumb-friendly CTA button: **"Unlock More Images"** linking to `/pricing`
- Uses `useCredits()` hook for `remainingCredits`, `getRemainingCredits()`, `getTotalCredits()`, `isFreeTier()`
- Only visible on mobile (`lg:hidden`) and only for Free tier users

**File changes:**
- `src/pages/Index.tsx`: Replace the existing promo banner block in the mobile layout with the new `MobileCreditCard` component (for Free users) while keeping the existing promo banner for non-free users

---

## 2. Sticky Upgrade Bar (Mobile Only)

**File:** New component `src/components/StickyUpgradeBar.tsx`
**Displayed in:** `src/pages/Index.tsx` (inside mobile layout)

**Conditions to show:**
- User is on Free plan (`isFreeTier()`)
- User has generated at least 1 image (check via `useUserStats` -> `stats.totalImages > 0`)
- Remaining credits < 50% of total

**UI:**
- Fixed to bottom of viewport (`fixed bottom-0 left-0 right-0 z-40`)
- Subtle background with blur (`bg-background/95 backdrop-blur-md border-t`)
- Copy: "You're generating results. Ready to scale?"
- Button: "Unlock 200 credits -- 49 euros" linking to `/pricing`
- Dismiss button (X) that hides it for the session (useState)
- Respects safe-area-bottom for iOS

---

## 3. Post-Generation Upgrade Modal

**File:** New component `src/components/PostGenerationUpgradeModal.tsx`

**Trigger:** After image generation completes successfully. Hooked into:
- `src/hooks/useImageJob.ts` -- expose an `onComplete` callback
- `src/hooks/useGeminiImageJobUnified.ts` -- same pattern

**Integration approach:** Rather than modifying the hooks directly, add the modal to the UGC creation pages (`CreateUGCGemini.tsx`, `CreateUGCGeminiV3.tsx`, `CreateUGCGeminiBase.tsx`) and trigger it when `job?.status === 'completed'` and `isFreeTier()` and `isMobile`.

**UI (Dialog component):**
- Header: "This image was created with the Free plan."
- Body: "With Plus, you can generate 200 images this month."
- Primary CTA: "Upgrade and Scale My Store" -> `/pricing`
- Secondary CTA: "Continue with Free" -> closes modal
- Only shows once per generation session (tracked with a ref)
- Only shows on mobile and only for Free tier

---

## 4. Account Page Mobile Billing Redesign

**File:** `src/components/account/BillingPanel.tsx`

**Changes (mobile only, wrapped in `lg:hidden` / `hidden lg:block`):**

Mobile layout reorder:
1. **Current Plan badge** -- large, visually highlighted (gradient background card with tier name)
2. **"What you unlock with Plus" section** (only shown if Free tier):
   - 200 credits/month
   - High resolution
   - Priority support
3. **Primary CTA:** "Unlock Plus" button (large, full-width, gradient)
4. **Billing details** -- wrapped in a Collapsible component, collapsed by default on mobile
   - Credit usage, payment methods, invoices, transactions

Desktop layout remains completely unchanged (existing code wrapped in `hidden lg:block`).

---

## 5. Pricing Page Mobile Swipe Layout

**File:** `src/pages/Pricing.tsx`

**Changes (mobile only):**

- Replace the `grid md:grid-cols-3` with a horizontal swipeable carousel on mobile using the existing `embla-carousel-react` dependency
- Each plan takes full width of the viewport (one plan per screen)
- Emphasize cost per image as the largest text element:

```text
  0.24 euros per image      <- large, bold
  49 euros/month             <- smaller
  200 credits                <- medium
  [ Unlock Plus ]            <- full-width CTA
```

- Remove the comparison table on mobile (`lg:hidden` on the table section)
- Add dot indicators for swipe position
- Desktop grid layout remains unchanged (`hidden lg:grid`)

---

## Technical Details

### New Files
| File | Purpose |
|---|---|
| `src/components/MobileCreditCard.tsx` | Dynamic credit usage card with urgency copy |
| `src/components/StickyUpgradeBar.tsx` | Conditional sticky bottom upgrade bar |
| `src/components/PostGenerationUpgradeModal.tsx` | Post-generation soft upgrade modal |

### Modified Files
| File | Change |
|---|---|
| `src/pages/Index.tsx` | Add MobileCreditCard and StickyUpgradeBar to mobile layout |
| `src/components/account/BillingPanel.tsx` | Mobile-specific reordered layout with upgrade focus |
| `src/pages/Pricing.tsx` | Mobile swipeable single-plan cards, hide comparison table |
| `src/pages/CreateUGCGemini.tsx` | Add PostGenerationUpgradeModal |
| `src/pages/CreateUGCGeminiV3.tsx` | Add PostGenerationUpgradeModal |
| `src/pages/CreateUGCGeminiBase.tsx` | Add PostGenerationUpgradeModal |
| `src/components/ui/progress.tsx` | Accept optional `indicatorClassName` prop for dynamic color |

### Dependencies
- Uses existing `embla-carousel-react` (already installed) for pricing swipe
- Uses existing `@radix-ui/react-dialog` for the post-generation modal
- Uses existing `@radix-ui/react-collapsible` for billing details collapse
- No new dependencies needed

### Hooks Used
- `useCredits()` -- remaining credits, tier, isFreeTier
- `useUserStats()` -- totalImages for sticky bar condition
- `useIsMobile()` -- guard all mobile-only components

