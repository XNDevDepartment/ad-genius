

# Fix: Stripe Checkout "Tax ID collection" Error

## Root Cause

The ad-hoc coupon for 1MES is being created successfully (logs confirm this). The **actual** error is:

> "Tax ID collection requires updating business name on the customer. To enable tax ID collection for an existing customer, please set `customer_update[name]` to `auto`."

When an existing Stripe customer (already has a `stripe_customer_id`) starts a checkout with `tax_id_collection: { enabled: true }`, Stripe requires `customer_update: { name: 'auto' }` so it can update the customer's name from the checkout form.

## Fix

### File: `supabase/functions/create-checkout/index.ts`

Add `customer_update: { name: 'auto' }` to the checkout session config when a `customerId` exists:

```
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : user.email!,
  ...(customerId ? { customer_update: { name: 'auto' } } : {}),   // <-- ADD THIS
  // ... rest stays the same
});
```

This is a one-line addition at approximately line 148. No other files need changes.
