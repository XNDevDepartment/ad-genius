# Fix: One-Time Payment Support & User [marisaisabelnevesribeiro@gmail.com](mailto:marisaisabelnevesribeiro@gmail.com)

## Root Cause Analysis

The user paid but her subscriber record shows:

- `stripe_customer_id: null` — webhook never linked her Stripe customer
- `subscribed: false`, `subscription_tier: Free` — payment was never activated
- 9 credits remaining (Free tier default of 10 minus 1 used)

The system has **zero support for one-time payments**. Every checkout uses `mode: "subscription"` with `recurring` pricing. The webhook at line 128 does `if (!session.subscription) break;` — meaning if a payment somehow came through without a subscription object, the webhook silently ignores it and the user is never activated.

Video generation itself has no tier restriction (both frontend `canAccessVideos()` and backend tier check are wide open). The user's actual blocker is likely **insufficient credits** — a 5-second video costs 5 credits (she has 9), but a 10-second video costs 10 (she can't afford it). She may also see Free-tier UI messaging that discourages her.

## Plan

### 1. Immediate: Fix this user via DB migration

Add a migration to:

- Update her `subscribers` record: set `subscription_tier = 'Starter'`, `subscribed = true`, `subscription_end` to 30 days from 23/02/2026, because admin has allocated manually 80 credits already

### 2. Add `payment_type` column to `subscribers`

New column `payment_type TEXT DEFAULT 'subscription'` to distinguish:

- `'subscription'` — recurring Stripe subscription (current default)
- `'one_time'` — single payment, no auto-renewal

### 3. Modify `create-checkout` edge function

Add a new `paymentMode` parameter. When `paymentMode === 'one_time'`:

- Use `mode: "payment"` instead of `mode: "subscription"`
- Remove `recurring` from `price_data`
- Store `payment_mode: 'one_time'` in session metadata

### 4. Modify `stripe-webhook` edge function

In the `checkout.session.completed` handler:

- When `session.subscription` is null (one-time payment), read `session.metadata.payment_mode`
- Calculate `subscription_end` as 30 days from now
- Set `payment_type = 'one_time'`, `subscribed = true`, tier from `plan_id`
- Allocate credits normally

### 5. Modify `check-subscription` edge function

Add logic for one-time payment users:

- If `payment_type === 'one_time'` and `subscription_end` is in the future → keep tier active
- If `payment_type === 'one_time'` and `subscription_end` is past → downgrade to Free
- Skip Stripe subscription lookup for one-time users (they have no Stripe subscription)

### Files to modify

1. **New migration** — add `payment_type` column, fix Marisa's record
2. `**supabase/functions/create-checkout/index.ts**` — add one-time payment mode
3. `**supabase/functions/stripe-webhook/index.ts**` — handle null subscription in checkout.session.completed
4. `**supabase/functions/check-subscription/index.ts**` — respect one-time payment expiry
5. `**src/integrations/supabase/types.ts**` — auto-updated after migration

### Technical details

**create-checkout one-time path:**

```typescript
if (paymentMode === 'one_time') {
  session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: planName },
        unit_amount: unitAmount,
        // NO recurring
      },
      quantity: 1,
    }],
    metadata: { plan_id: planId, user_id: user.id, payment_mode: 'one_time' },
    // ...
  });
}
```

**stripe-webhook one-time handler:**

```typescript
if (!session.subscription && session.metadata?.payment_mode === 'one_time') {
  const subscriptionEnd = new Date();
  subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
  
  await supabase.from("subscribers").update({
    subscribed: true,
    subscription_tier: tier,
    subscription_end: subscriptionEnd.toISOString(),
    stripe_customer_id: session.customer,
    payment_type: 'one_time',
    last_reset_at: new Date().toISOString(),
  }).eq("user_id", userId);
  
  // Allocate credits
  await supabase.rpc("refund_user_credits", { ... });
}
```

**check-subscription one-time handling:**

```typescript
// Early return for one-time payment users
if (existingSubscriber?.payment_type === 'one_time') {
  if (existingSubscriber.subscription_end && new Date(existingSubscriber.subscription_end) > new Date()) {
    // Still active
    return Response({ subscribed: true, subscription_tier: existingSubscriber.subscription_tier });
  } else {
    // Expired — downgrade
    await supabase.from("subscribers").update({ subscribed: false, subscription_tier: 'Free' });
    return Response({ subscribed: false, subscription_tier: 'Free' });
  }
}
```