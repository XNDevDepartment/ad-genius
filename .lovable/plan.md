

# Investigation: Payment Completed But Subscription Not Activated

## Evidence

### User `joeguimareas4@gmail.com`
- Checkout created at **13:49:16 UTC** — `create-checkout` returned 200 with promo code `ONB1ST`
- Stripe customer ID `cus_U2o6d7rp20dLMq` was saved to the database
- But: `subscribed: false`, `subscription_tier: Free`, `credits_balance: 10` — never upgraded
- Audit log confirms the only DB change was setting `stripe_customer_id` — no tier/credit update ever happened

### Other Affected Users (same pattern: have `stripe_customer_id` but still `Free`)
| Email | Customer ID | Credits |
|---|---|---|
| titocarvalhounipessoal@gmail.com | cus_TTyA6TtvQXOGcU | 463 |
| paulasoarespaulasoares1985@hotmail.com | cus_U1TIMahnDm7sS5 | 3 |
| apitusca@gmail.com | cus_TGNdoWaGdRd1RM | 63 |
| 2020035@esad.pt | cus_TNZNw156juoUjl | 10 |

Some of these may be cancelled subscriptions (legitimate), but the pattern is concerning.

## Root Cause

**The Stripe webhook is not being called.** Zero `stripe-webhook` calls appear in the Supabase edge function analytics logs — not just today, but in the entire recent log window. This means Stripe is not sending `checkout.session.completed` events to the Supabase endpoint.

This is most likely a **Stripe dashboard configuration issue**: either the webhook URL is wrong, not set, or the endpoint is not reachable from Stripe's servers.

### Why the fallback also failed

The `check-subscription` function (called when the user visits the Success page or refreshes) queries Stripe for active subscriptions. It found the customer but found **zero active subscriptions**. This can happen when:
1. The subscription is in `incomplete` status (payment still processing with 3D Secure or bank verification)
2. The subscription hasn't transitioned to `active` yet at the moment the client polls
3. The client only polls once on page load, with no retry

The `check-subscription` function only queries `status: "active"` (line 62), missing subscriptions that are `trialing`, `incomplete`, or `past_due`.

## Fix Plan

### Immediate action (manual, not code)
You need to verify the Stripe webhook configuration in your Stripe dashboard:
- Go to **Stripe Dashboard → Developers → Webhooks**
- The endpoint URL should be: `https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/stripe-webhook`
- Events to listen for: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Verify the signing secret matches the `STRIPE_WEBHOOK_SECRET` in your Supabase secrets

### Code fix 1: Make `check-subscription` handle non-active statuses
**File: `supabase/functions/check-subscription/index.ts`**

Currently line 62 only fetches `status: "active"`. Change to also check `trialing` and `incomplete` statuses, and if an `incomplete` subscription is found with a recent checkout, treat it as a pending activation that should be retried:

```typescript
// Check active, trialing, and past_due subscriptions
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  limit: 5
});
const activeSub = subscriptions.data.find(s =>
  ['active', 'trialing'].includes(s.status)
);
const pendingSub = subscriptions.data.find(s =>
  ['incomplete', 'past_due'].includes(s.status)
);
const subscription = activeSub || pendingSub;
const active = !!activeSub;
```

If a `pendingSub` exists but no `activeSub`, return a `pending` status to the client so it knows to retry.

### Code fix 2: Add retry polling on the Success page
**File: `src/pages/Success.tsx`**

Currently calls `refreshSubscription()` once. Change to poll with retries (every 3s, up to 10 attempts) until `subscriptionData.subscribed === true`:

```typescript
useEffect(() => {
  let attempts = 0;
  const maxAttempts = 10;
  const poll = async () => {
    await refreshSubscription();
    attempts++;
    if (!subscriptionData?.subscribed && attempts < maxAttempts) {
      setTimeout(poll, 3000);
    } else {
      setLoading(false);
    }
  };
  poll();
}, []);
```

### Code fix 3: Add a direct Stripe sync on the Success page
**File: `src/pages/Success.tsx`**

After the first `refreshSubscription` returns `subscribed: false`, explicitly call `check-subscription` to force a Stripe-side lookup as a secondary fallback:

```typescript
const { data } = await supabase.functions.invoke('check-subscription');
if (data?.subscribed) {
  await refreshSubscription(); // Re-fetch from DB now that it's been updated
}
```

## Files to Change
1. `supabase/functions/check-subscription/index.ts` — broaden subscription status check
2. `src/pages/Success.tsx` — add retry polling + explicit check-subscription call

## Immediate Manual Action Required
**Check and fix the Stripe webhook URL** in the Stripe dashboard. Without the webhook, recurring payments (`invoice.payment_succeeded`), cancellations, and payment failures will also be silently missed. This is critical.

