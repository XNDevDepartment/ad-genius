

# Fix Build Error + Add One-Time Payment for Plus & Pro Plans

## 1. Fix Build Error in `check-subscription/index.ts`
The TypeScript error is on lines 64-65 where `s` has implicit `any` type. Add explicit type annotation: `(s: any)`.

## 2. The `create-checkout` Already Supports One-Time Payments
The existing code already handles `paymentMode: 'one_time'` — it sets `mode: "payment"`, removes `recurring`, and stores `payment_mode: 'one_time'` in metadata. The `stripe-webhook` and `check-subscription` also already handle this flow. So Plus and Pro one-time payments work **out of the box** by calling:

```typescript
// Plus one-time (€49)
await supabase.functions.invoke('create-checkout', {
  body: { planId: 'plus', interval: 'month', paymentMode: 'one_time' }
});

// Pro one-time (€99)
await supabase.functions.invoke('create-checkout', {
  body: { planId: 'pro', interval: 'month', paymentMode: 'one_time' }
});
```

No backend changes needed for Plus/Pro one-time — the system maps `planId` to the correct price and tier automatically.

## 3. Optionally: Enable Multibanco as Payment Method
Stripe Checkout supports Multibanco for one-time payments in EUR. To enable it, add `payment_method_types` to the session when `isOneTime` is true. However, Multibanco can also be enabled directly in the Stripe Dashboard under Settings → Payment Methods — no code change needed. The simpler approach is to enable it in the Stripe Dashboard.

## Implementation Steps

### A. Fix build error (`check-subscription/index.ts`, lines 64-65)
```typescript
const activeSub = subscriptions.data.find((s: any) => ['active', 'trialing'].includes(s.status));
const pendingSub = subscriptions.data.find((s: any) => ['incomplete', 'past_due'].includes(s.status));
```

### B. No changes needed to `create-checkout` or `stripe-webhook`
Plus and Pro one-time payments already work. The webhook will:
- Detect `payment_mode: 'one_time'` in metadata
- Set `subscription_tier` to "Plus" or "Pro" based on `plan_id`
- Calculate 30-day `subscription_end`
- Allocate 200 credits (Plus) or 400 credits (Pro)

### C. Enable Multibanco in Stripe Dashboard
Go to Stripe Dashboard → Settings → Payment Methods → Enable "Multibanco". This applies to all Checkout sessions in `payment` mode automatically.

### Technical Note
To create a direct checkout link for the client wanting Plus one-time, you can either:
1. Use the existing Promo1MesCheckout pattern to create a dedicated route
2. Or manually invoke the edge function with the right params from admin

