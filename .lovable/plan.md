

# Use Existing Stripe Promotion Code for 3MESES

## Change

In `supabase/functions/create-checkout/index.ts`, replace the ad-hoc coupon creation block for `3MESES` with a direct reference to the Stripe promotion code ID `promo_1T6ghXCdNWwdXCd8mF7Z2C7V`.

### `supabase/functions/create-checkout/index.ts`

Replace the `else if (promoCode === '3MESES')` block (lines ~80-91) that creates an ad-hoc coupon with:

```typescript
} else if (promoCode === '3MESES') {
  promotionCodeId = 'promo_1T6ghXCdNWwdXCd8mF7Z2C7V';
  console.log('[create-checkout] Using existing 3MESES promotion code');
}
```

### Pre-requisite (Stripe Dashboard)

The coupon shown in the screenshot is restricted to the "Starter 1 month" product. Since checkout uses dynamic `price_data`, the promotion code will fail unless you **remove the product restriction** from the coupon in Stripe Dashboard → Coupons → 3MESES → Edit → remove "Applies to specific products".

### Redeploy

Redeploy the `create-checkout` edge function.

