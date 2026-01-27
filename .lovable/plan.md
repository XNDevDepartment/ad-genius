

## Add First Month Promotional Offer to Desktop Onboarding Checklist

### Overview

When all 4 onboarding milestones are completed (20 credits earned), display a promotional offer for the first month at €19.99 to incentivize conversion. This mirrors the mobile onboarding flow's offer while integrating seamlessly with the desktop checklist UI.

---

### Current Behavior vs Proposed

**Current**: When all 4 milestones are credited, the checklist auto-completes and disappears.

**Proposed**: 
1. When all 4 milestones are credited AND user is on Free tier → Show promotional offer card
2. Add a teaser message during progress: "Complete all tasks to unlock a special first-month offer"
3. User clicks "Get This Offer" → Redirected to Stripe checkout with `ONB1ST` promo code pre-applied
4. User clicks "Start Creating (Free)" → Completes onboarding and card disappears

---

### UI Design

```text
+--------------------------------------------------+
| 🚀 Getting Started                         ⌄     |
|    Earn 20 free credits                          |
|    4 of 4 completed                   20/20 creds|
|    [========================================]    |
+--------------------------------------------------+
| ✓ Create your first UGC image        +5 ✓       |
+--------------------------------------------------+
| ✓ Animate your first image           +5 ✓       |
+--------------------------------------------------+
| ✓ Create your first Outfit Swap      +5 ✓       |
+--------------------------------------------------+
| ✓ Bonus: All steps completed!        +5 ✓       |
+--------------------------------------------------+
|                                                  |
| +----------------------------------------------+ |  ← NEW SECTION
| | 👑 First month only €19.99                   | |
| |    €29  [Save €10!]                          | |
| |                                              | |
| |    [        Get This Offer         ]         | |
| +----------------------------------------------+ |
|                                                  |
|         Start Creating (Free)                    |
+--------------------------------------------------+
```

**During Progress (not all complete):**
```text
...milestone items...

💡 Complete all tasks to unlock a special first-month offer!

    Skip and explore freely
```

---

### Technical Implementation

#### 1. Update `OnboardingChecklist.tsx`

**Changes:**
- Import `Crown`, `Loader2`, `Zap` icons
- Import `supabase` client
- Import `useAuth` for subscription tier check
- Add `isCheckingOut` state for checkout loading
- Add promo teaser when milestones incomplete
- Add full offer card when all milestones credited + user is Free tier
- Replace auto-complete logic with offer display logic
- Add `handleGetOffer()` function (reuse logic from `OnboardingResults.tsx`)
- Add `handleStartFree()` function to complete onboarding without offer

**New translations needed:**
```json
"offerTeaser": "Complete all tasks to unlock a special first-month offer!",
"offerCard": {
  "title": "First month only €19.99",
  "regularPrice": "€29",
  "badge": "Save €10!",
  "cta": "Get This Offer",
  "skipCta": "Start Creating (Free)"
}
```

#### 2. Update `FloatingOnboardingCard.tsx`

**Changes:**
- Adjust the auto-hide logic to only hide when onboarding is truly complete (not just all milestones credited)
- The `completed` flag from `useOnboarding()` will remain `false` until user either:
  - Clicks "Get This Offer" (redirect to checkout, then complete on return)
  - Clicks "Start Creating (Free)" (complete immediately)

#### 3. Update Translation Files (all 5 languages)

Add new keys to `onboarding.checklist`:
- `en.json`, `pt.json`, `es.json`, `de.json`, `fr.json`

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/onboarding/OnboardingChecklist.tsx` | Add offer card section, teaser message, checkout logic, and "Start Creating (Free)" option |
| `src/i18n/locales/en.json` | Add `offerTeaser` and `offerCard` translations |
| `src/i18n/locales/pt.json` | Add Portuguese translations |
| `src/i18n/locales/es.json` | Add Spanish translations |
| `src/i18n/locales/de.json` | Add German translations |
| `src/i18n/locales/fr.json` | Add French translations |

---

### Key Code Additions

**OnboardingChecklist.tsx - Offer Card Section:**
```typescript
// After MilestoneItem components, before skip link:

{/* Offer Teaser - show when not all complete */}
{!allCreditsAwarded && (
  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
    <p className="text-sm text-amber-700 dark:text-amber-300">
      {t('onboarding.checklist.offerTeaser')}
    </p>
  </div>
)}

{/* Promotional Offer - show when all complete and user is on Free tier */}
{allCreditsAwarded && subscriptionTier === 'Free' && (
  <Card className="p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Crown className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg">{t('onboarding.checklist.offerCard.title')}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold">€19.99</span>
          <span className="text-sm text-muted-foreground line-through">
            {t('onboarding.checklist.offerCard.regularPrice')}
          </span>
          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
            {t('onboarding.checklist.offerCard.badge')}
          </span>
        </div>
      </div>
    </div>

    <Button
      onClick={handleGetOffer}
      disabled={isCheckingOut}
      className="w-full mt-4"
      size="lg"
    >
      {isCheckingOut ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        t('onboarding.checklist.offerCard.cta')
      )}
    </Button>
    
    <Button
      onClick={handleStartFree}
      variant="ghost"
      className="w-full mt-2 text-muted-foreground"
    >
      {t('onboarding.checklist.offerCard.skipCta')}
    </Button>
  </Card>
)}
```

---

### Logic Changes

1. **Remove auto-complete on all milestones credited** - Instead of automatically calling `completeOnboarding()` when all 4 milestones are credited, show the offer card

2. **Add subscription tier check** - Only show the offer card if `subscriptionData?.subscription_tier === 'Free'`

3. **Handle checkout flow** - Use same `create-checkout` edge function with `ONB1ST` promo code as mobile flow

4. **Handle "Start Creating (Free)"** - Complete onboarding and navigate to `/create/ugc-gemini`

---

### Summary

This enhancement adds conversion incentive to the desktop onboarding flow by:
1. Showing a teaser during progress to motivate completion
2. Displaying a prominent €19.99 first-month offer when all milestones are done
3. Giving users the choice to subscribe or continue for free
4. Using the same `ONB1ST` promo code system as the mobile flow for consistency

