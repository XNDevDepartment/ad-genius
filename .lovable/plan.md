

# Fix: 1MES Promo Code Not Applying at Checkout

## Root Cause

The `1MES` coupon in Stripe is restricted to specific Products ("Starter" and "Starter Anual"). However, the checkout creates **inline dynamic products** via `price_data`, which Stripe treats as a different product. Stripe silently rejects the coupon, the edge function throws an error, and the frontend swallows it with no user feedback.

## Solution

### 1. Edge Function (`supabase/functions/create-checkout/index.ts`)

For the `1MES` promo code specifically, bypass the restricted promotion code and instead create a **one-time ad-hoc coupon** via the Stripe API that has no product restriction:

```
if promoCode === '1MES':
  - Create coupon: stripe.coupons.create({ amount_off: 1901, currency: 'eur', duration: 'once', name: '1MES First Month' })
  - Use discounts: [{ coupon: newCoupon.id }] instead of promotion_code
```

This deducts 19.01 EUR from the 29.00 EUR first charge, resulting in exactly 9.99 EUR. Subsequent months charge the full 29.00 EUR automatically since the coupon duration is "once".

### 2. Frontend Error Feedback

**`src/pages/Promo1Mes.tsx`** and **`src/pages/Promo1MesCheckout.tsx`**:
- Import `toast` from `sonner`
- Show a toast error in catch blocks so users see feedback instead of a silent failure

### Files Changed
- `supabase/functions/create-checkout/index.ts` -- ad-hoc coupon for 1MES
- `src/pages/Promo1Mes.tsx` -- error toast
- `src/pages/Promo1MesCheckout.tsx` -- error toast

