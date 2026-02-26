

# CRITICAL: Stripe Webhook is Completely Broken

## What's happening right now

The user paid for the Plus plan, but **nothing happened** because the Stripe webhook is crashing on every single request. The logs show repeated errors:

```text
SubtleCryptoProvider cannot be used in a synchronous context.
Use `await constructEventAsync(...)` instead of `constructEvent(...)`
```

This affects **ALL** Stripe events — not just this user. No subscriptions, cancellations, or payments are being processed by the webhook.

### User's current DB state:
- `subscription_tier: Free`, `subscribed: false`, `credits_balance: 0`
- The webhook never activated her account

## Root cause

Line 97 of `stripe-webhook/index.ts` uses `stripe.webhooks.constructEvent()` (synchronous), but Deno's `SubtleCrypto` only supports async operations. The fix is to use `await stripe.webhooks.constructEventAsync()`.

## Fix plan

### 1. Fix the webhook signature verification
Change line 97 from:
```typescript
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```
to:
```typescript
event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
```

### 2. Manually fix the user's record via migration
Since the webhook failed, manually activate the user:
- Set `subscription_tier = 'Plus'`, `subscribed = true`, `payment_type = 'one_time'`
- Set `subscription_end` to 30 days from now
- Allocate 200 credits (Plus tier)

### Files to modify
1. **`supabase/functions/stripe-webhook/index.ts`** — line 97: `constructEvent` → `constructEventAsync`
2. **New migration** — fix user record and allocate credits

### After deploying
You should re-send the failed webhook events from the Stripe Dashboard (Developers → Webhooks → select the endpoint → find the failed events → click "Resend"). This will re-process any other payments that were missed.

