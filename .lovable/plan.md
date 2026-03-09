

## Make €9.99 Offer a One-Time Purchase (Not Subscription)

### Problem
Currently, the €9.99 checkout creates a **subscription** with a coupon discount. It should be a **one-time payment** using the existing Stripe product `prod_U7RlMZUJGKXGza`.

### Changes

**1. `supabase/functions/create-checkout/index.ts`**
- Add `experiment` plan: `{ monthly: 999 }` (€9.99)
- When `planId === 'experiment'` and `paymentMode === 'one_time'`, use the existing Stripe product `prod_U7RlMZUJGKXGza` instead of inline `price_data`
- No promo code or coupon needed — the price IS €9.99

**2. `src/components/onboarding/OnboardingResults.tsx`** (line 132)
- Change checkout body from `{ planId: 'starter', interval: 'month', promoCode: '1MES' }` to `{ planId: 'experiment', paymentMode: 'one_time' }`

**3. `src/pages/Promo1MesCheckout.tsx`** (line 26-31)
- Same change: `{ planId: 'experiment', paymentMode: 'one_time' }` instead of the promoCode approach

### Result
- Clean one-time payment session at €9.99
- Uses the real Stripe product (`prod_U7RlMZUJGKXGza`)
- No coupon creation overhead
- Existing `stripe-webhook` already handles `payment_mode: 'one_time'` metadata for credit allocation

