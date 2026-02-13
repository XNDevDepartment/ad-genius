
# New Promo Page: First Month at 9.99 EUR with code 1MES

## Overview
Create a new promotional landing page at `/promo/1mes` for a more aggressive offer: Starter plan for 9.99 EUR in the first month with only 35 credits (instead of the usual 80). Also provide a direct checkout link that skips the landing page entirely.

## Changes

### 1. New Page: `src/pages/Promo1Mes.tsx`
A copy of `PromoFirstMonth.tsx` adapted for this offer:
- Price: 9.99 EUR (instead of 19.99 EUR)
- Regular price: 29 EUR (same Starter plan)
- Discount badge: -66%
- Promo code: `1MES` (auto-applied)
- Feature list updated: "35 creditos no primeiro mes" (instead of 80)
- Meta Pixel tracking with "First Month Promo - 1MES"
- Auth redirect stores `/promo/1mes` for post-login return
- Portuguese copy matching the existing page style

### 2. New Route + Direct Checkout Route in `src/App.tsx`
- `/promo/1mes` -- landing page with offer details
- `/promo/1mes/checkout` -- a lightweight page that immediately redirects authenticated users to Stripe checkout with the `1MES` code pre-applied (no landing page needed). Unauthenticated users are sent to `/account` first with a redirect back.

### 3. Update `supabase/functions/stripe-webhook/index.ts`
In the `checkout.session.completed` handler, after detecting the promo code, add logic:
```
if (promoCodeUsed === '1MES') {
  credits = 35;
  console.log('[WEBHOOK] 1MES promo: limiting credits to 35');
}
```
This overrides the default 80 Starter credits when the `1MES` code is detected.

### 4. Update `supabase/functions/create-checkout/index.ts`
No structural changes needed -- the existing promo code lookup logic already handles any Stripe promotion code string. The `1MES` code (Stripe ID: `promo_1T09lfCdNWwdXCd8M1oHVhIG`) will be resolved automatically via `stripe.promotionCodes.list({ code: '1MES' })`.

## Direct Checkout Link
After implementation, you can use this URL to send users directly to checkout:
`https://produktpix.com/promo/1mes/checkout`

This will authenticate the user if needed and then redirect them straight to Stripe with the `1MES` code applied.

## Files Modified
- `src/pages/Promo1Mes.tsx` -- new landing page
- `src/pages/Promo1MesCheckout.tsx` -- new direct-to-checkout redirect page
- `src/App.tsx` -- add both new routes
- `supabase/functions/stripe-webhook/index.ts` -- override credits to 35 for `1MES` promo

## Technical Notes
- The Stripe promotion code `1MES` (ID: `promo_1T09lfCdNWwdXCd8M1oHVhIG`) must already exist and be active in Stripe for the checkout to apply the discount
- The webhook detects the promo code from the Stripe session discounts breakdown (existing logic) and overrides credits accordingly
- On renewal (next month), `reset_user_monthly_credits` will give the full 80 Starter credits since it reads from the tier, not the promo -- this is correct behavior (promo only affects the first month)
