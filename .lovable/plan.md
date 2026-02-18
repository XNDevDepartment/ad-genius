
# Pricing Page Update: Annual Default, Tags, and Vertical Mobile Scroll

## Summary

Three changes based on the Higgsfield reference screenshots:

1. **Annual billing as default** -- toggle starts on "Yearly" instead of "Monthly"
2. **Add tags/badges** to plan cards (like "MOST POPULAR", "BEST VALUE", savings tags like "Save EUR58 compared to monthly")
3. **Mobile: vertical scroll** instead of horizontal swipe carousel

---

## 1. Annual as Default

**File:** `src/pages/Pricing.tsx` (line 86)

Change `useState(false)` to `useState(true)` so the yearly toggle is active by default.

---

## 2. Add Tags/Badges to Plan Cards

Inspired by the Higgsfield screenshots, each plan card will show contextual tags:

| Plan | Tags |
|---|---|
| Starter | (none -- cheapest plan, no special tag) |
| Plus | "MOST POPULAR" badge (already exists), + savings tag: "Save EUR98 compared to monthly" |
| Pro | "BEST VALUE" badge (new), + savings tag: "Save EUR198 compared to monthly" |

### Savings calculation
When annual is selected, show a small pill/badge below the price:
- **Starter:** Save EUR58 (29x12 - 24.17x12 = 348-290 = 58)
- **Plus:** Save EUR98 (49x12 - 40.83x12 = 588-490 = 98)
- **Pro:** Save EUR198 (99x12 - 82.50x12 = 1188-990 = 198)

The savings badge will use a subtle primary-tinted background like `bg-primary/10 text-primary` with a small text.

### "BEST VALUE" badge for Pro
Add a `bestValue` flag to the Pro plan data and render a `Badge` similar to "Most Popular" but with different styling (e.g., `bg-accent text-accent-foreground`).

### Strikethrough monthly price when annual is selected
Like Higgsfield shows `$29` crossed out next to `$23`, show: `~~EUR49~~ EUR40.83/month` when yearly is active.

### New translation keys needed

Add to all 5 locale files under `pricing`:
- `pricing.bestValue`: "Best Value"
- `pricing.saveCompared`: "Save EUR{{amount}} vs monthly"

---

## 3. Mobile: Vertical Scroll Instead of Horizontal Carousel

Replace the Embla carousel mobile section with a simple vertical stack:

```
<div className="space-y-4 mb-20">
  {plans.map((plan) => (
    <div key={plan.id} className="...card styles...">
      ...same card content...
    </div>
  ))}
</div>
```

This removes:
- The `emblaRef` div wrapper
- The `flex` horizontal layout
- The dot indicators
- The `flex-[0_0_85%]` sizing

The Embla carousel import can stay (no harm) but its ref will no longer be attached on mobile.

---

## Technical Changes

| File | Change |
|---|---|
| `src/pages/Pricing.tsx` | 1. `isYearly` default to `true`. 2. Add `bestValue` flag to Pro plan. 3. Show strikethrough monthly price when yearly is selected. 4. Add savings badge when yearly is active. 5. Add "Best Value" badge to Pro. 6. Replace mobile carousel with vertical stack of cards. |
| `src/i18n/locales/en.json` | Add `pricing.bestValue` and `pricing.saveCompared` keys |
| `src/i18n/locales/pt.json` | Add same keys in Portuguese |
| `src/i18n/locales/es.json` | Add same keys in Spanish |
| `src/i18n/locales/fr.json` | Add same keys in French |
| `src/i18n/locales/de.json` | Add same keys in German |

### Desktop card structure (updated)

```
+------------------------------------------+
|  Plan Name     [MOST POPULAR] [BEST VALUE]|
|  Short description                        |
|                                           |
|  ~~EUR49~~ EUR40.83 /month               |
|  Billed annually (EUR490/year)            |
|  [Save EUR98 vs monthly]  <-- green tag   |
|  EUR0.20 per image                        |
|                                           |
|  [ Select Plan ]                          |
|                                           |
|  -----------------------------------------|
|                                           |
|  What's included                          |
|  [check] 200 credits per month            |
|  [check] Generate up to 3 simultaneously  |
|  [check] Unlimited Scenarios              |
|  [check] Priority + Live chat             |
|  [check] Commercial usage                 |
+------------------------------------------+
```

### No new dependencies needed
