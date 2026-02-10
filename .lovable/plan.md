
# Mobile Promo Banner Strategy for Free Users (ONB1ST - 19.99 EUR)

## Overview

Create a time-limited promotional banner system that targets free-tier users on mobile, showing a 24-hour countdown offer for the Starter plan at 19.99 EUR (using the existing ONB1ST promo code). The strategy has three touchpoints:

1. **Sticky promo banner** above the bottom tab bar on mobile (most visible)
2. **Promo card on the home page** replacing the current subtle "Get More Credits" ghost button
3. **Highlighted promo badge on the Pricing page** for the Starter plan card

## Strategy Rationale

- Free users on mobile currently only see a small ghost "Get More Credits" button -- easy to miss
- A sticky banner with a live countdown creates urgency without being intrusive (dismissible)
- The 24h countdown starts from the user's first login (stored in localStorage), so each user gets their own window
- If dismissed, it stays hidden for the session but reappears next visit (soft persistence)
- Once the 24h window expires, the banner changes to a softer "Upgrade" nudge without the countdown

## Changes

### 1. New Component: `src/components/MobilePromoBanner.tsx`

A sticky banner positioned just above the BottomTabBar (bottom-20) on mobile only:

- **Visibility rules**: Only renders when user is authenticated, on Free tier, and on mobile
- **Countdown timer**: 24h countdown from first-seen timestamp (stored in localStorage as `promo_onb1st_start`)
- **Design**: Compact gradient bar (primary-to-purple) with:
  - Price highlight: "Starter plan -- 19.99 EUR/1st month"
  - Live countdown: "HH:MM:SS remaining"
  - CTA button: navigates to `/promo/first-month` (reuses existing checkout page)
  - Dismiss X button (hides for current session via sessionStorage)
- **Post-expiry**: Shows a simpler "Upgrade from 19.99 EUR/mo" without countdown (the ONB1ST code remains valid, just no urgency)
- Fully translated (all 5 locales)

### 2. Update `src/components/AppLayout.tsx`

- Import and render `MobilePromoBanner` in the mobile layout section, between `<Outlet />` and `<BottomTabBar />`
- Only render when `user` exists

### 3. Update `src/pages/Index.tsx` -- Mobile Home Promo Card

Replace the current ghost "Get More Credits" button (lines 78-88) with a more prominent promo card for Free users:

- **For Free tier**: Show a compact card with gradient border, showing "Starter 19.99 EUR/1st month" with a "See Offer" button linking to `/promo/first-month`
- **For paid tiers**: Keep the existing "Get More Credits" ghost button as-is

### 4. Add translations to all locale files

Add `promo.mobile.*` keys to EN, PT, ES, DE, FR:

- `promo.mobile.starterOffer` -- "Starter Plan"
- `promo.mobile.firstMonth` -- "1st month"
- `promo.mobile.timeLeft` -- "left"
- `promo.mobile.getOffer` -- "Get Offer"
- `promo.mobile.upgradeFrom` -- "Upgrade from"
- `promo.mobile.perMonth` -- "/mo"
- `promo.mobile.limitedOffer` -- "Limited Offer"
- `promo.mobile.seeOffer` -- "See Offer"

### 5. No backend changes needed

- The ONB1ST promo code and `/promo/first-month` checkout page already exist and work
- The `create-checkout` edge function already handles ONB1ST

## Technical Details

**Countdown logic:**
```text
1. On first render, check localStorage for 'promo_onb1st_start'
2. If not set, store Date.now() as the start timestamp
3. Calculate remaining = start + 24h - now
4. Update every second via setInterval
5. If remaining <= 0, show post-expiry soft CTA
```

**Dismiss logic:**
```text
- sessionStorage key: 'promo_banner_dismissed'
- Dismissing hides banner for current browser session only
- Returns on next visit/session to maintain visibility
```

**Tier detection:**
```text
- Uses useCredits() hook to get 'tier'
- Banner only shows when tier === 'Free'
```

**Positioning:**
```text
- Banner: fixed bottom-20 (above BottomTabBar's bottom-0)
- z-index: z-40 (below BottomTabBar's z-50)
- Left/right padding with rounded corners for a floating card feel
```
