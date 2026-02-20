

# Fix: Starter Plan Button Not Working on Mobile

## Root Cause

In `src/pages/Pricing.tsx` line 116, the checkout redirect uses:

```js
window.open(data.url, '_blank');
```

On mobile browsers, `window.open` with `_blank` is **silently blocked** as a popup when called after an `await` (the async `supabase.functions.invoke` call breaks the "user gesture" chain). The browser blocks it without any visible error -- the user taps the button and nothing happens.

This affects **all three plan buttons** on mobile, not just Starter.

## Fix

Replace `window.open(data.url, '_blank')` with `window.location.href = data.url` in `handlePlanSelect()`. This navigates in the same tab, which is never blocked by popup blockers and is the standard pattern for payment redirects on mobile.

This is the same approach already used in `src/pages/Promo1MesCheckout.tsx` (line 35).

## File Changed

| File | Change |
|---|---|
| `src/pages/Pricing.tsx` | Line 116: change `window.open(data.url, '_blank')` to `window.location.href = data.url` |

One line change. No other files affected.
