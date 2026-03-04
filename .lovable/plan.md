

# Fix Maria's 3MESES Checkout — Two Issues Found

## Problem Analysis

**Issue 1 — Corrupted subscriber record:**  
Maria (`maria.peixoto2000@hotmail.com`, user_id `f787f7db-498b-4733-89ee-1d0aa11e2e9a`) has `subscription_tier = 'Starter'` but `subscribed = false` and `credits_balance = 0`. This inconsistent state was likely set by the webhook or a previous failed attempt. Since `tier` returns `'Starter'` (not `'Free'`), the promo banner won't even show for her. She also has 0 credits.

**Issue 2 — 3MESES still uses the restricted promotion code:**  
The `create-checkout` edge function (line 115-117) still uses `promotionCodeId = 'promo_1T6h1JCdNWwdXCd81janpcy5'` for 3MESES. This promotion code has a "first-time customer" restriction in Stripe, so it fails for users with prior transactions (like Maria, who has `stripe_customer_id: cus_U5TruFSYJf4d2t`). The approved ad-hoc coupon fix was never implemented.

## Plan

### 1. Reset Maria's subscriber record to Free tier (SQL migration)

```sql
UPDATE public.subscribers 
SET subscription_tier = 'Free',
    subscribed = false,
    subscription_status = 'inactive',
    credits_balance = 10,
    updated_at = now()
WHERE user_id = 'f787f7db-498b-4733-89ee-1d0aa11e2e9a';
```

This gives her a clean Free state with 10 credits so she can properly go through the 3MESES checkout flow.

### 2. Fix create-checkout to use ad-hoc coupon for 3MESES

In `supabase/functions/create-checkout/index.ts`, replace lines 115-117:

```typescript
} else if (promoCode === '3MESES') {
    promotionCodeId = 'promo_1T6h1JCdNWwdXCd81janpcy5';
    console.log('[create-checkout] Using existing 3MESES promotion code');
```

With the ad-hoc coupon approach (same pattern as 1MES):

```typescript
} else if (promoCode === '3MESES') {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: 901,
        currency: 'eur',
        duration: 'repeating',
        duration_in_months: 3,
        name: '3MESES — 3 Months Promo',
      });
      adHocCouponId = coupon.id;
      console.log('[create-checkout] Created ad-hoc coupon for 3MESES:', adHocCouponId);
    } catch (err) {
      console.error('[create-checkout] Failed to create ad-hoc coupon for 3MESES:', err);
    }
```

Then redeploy the `create-checkout` edge function.

### Summary of changes
- **1 SQL migration** — reset Maria to Free tier
- **1 edge function edit + deploy** — fix 3MESES to bypass Stripe restrictions

