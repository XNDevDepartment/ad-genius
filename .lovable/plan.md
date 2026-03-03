

# Credit Attribution Bugs — Analysis & Fix Plan

## Problems Found

### Bug 1: `check-subscription` detects tier by price amount — UNRELIABLE

The `check-subscription` function (lines 80-94) maps Stripe price amounts to tiers using ranges. This causes **two critical issues**:

**a) €19.99 promo users (1MES, 3MESES) get misidentified as "Founders"**
- The `3MESES` coupon discounts €29 Starter to €19.99 (amount_off: 901)
- BUT `check-subscription` reads the **base subscription price** (€29 = 2900 cents), not the discounted price
- Actually, it reads the `unit_amount` from `stripe.prices.retrieve()` which is the **recurring price on the subscription item** — if using `price_data` (dynamic), this IS €29 (2900) for Starter
- However, the €19.99 Founders plan also creates a dynamic `price_data` with `unit_amount: 1999`
- So Founders users are correctly detected at 1999, and Starter at 2900. The range `1900-2099` catches Founders correctly.

Wait — the real issue is different. Let me re-examine...

The checkout creates subscriptions with `price_data` where `unit_amount` is set per plan. For Starter it's 2900, so `check-subscription` should detect 2900 → Starter. That part seems OK.

**b) Sofia case: Got 400 credits (Pro) on a Starter plan**
- She received `subscription_upgrade_pro` with 400 credits on 2026-02-16
- She's currently on Starter tier
- This means `check-subscription` once detected her price as Pro-range, allocated 400 credits, then later corrected to Starter
- OR the webhook gave her Pro credits when she initially signed up for a higher plan, then downgraded

This is likely a **legitimate tier change** (Pro → Starter downgrade) where the credits from the Pro period carried over. Not a bug per se.

### Bug 2: DOUBLE CREDIT ALLOCATION — webhook + check-subscription race condition

This is the **main bug**. User `4e2840be` got **two 80-credit allocations within 90ms**:
```
80.00  2026-02-23 23:59:18.774793  subscription_upgrade_starter
80.00  2026-02-23 23:59:18.864980  subscription_upgrade_starter
```

**Root cause**: Credits are allocated in TWO places simultaneously:
1. **`stripe-webhook`** (line 237): On `checkout.session.completed`, allocates credits via `refund_user_credits`
2. **`check-subscription`** (line 213): Called from the frontend (Success page + AuthContext), also allocates credits via `refund_user_credits`

When a user completes checkout:
- Stripe sends the webhook → allocates credits
- User lands on `/success` → calls `check-subscription` → detects Free→Paid transition → allocates credits AGAIN
- The 1-hour time guard doesn't help because both happen within the same second

### Bug 3: Monthly rollover gives credits based on tier, not promo limits

The `reset_user_monthly_credits` RPC (called by `invoice.payment_succeeded` webhook) uses `get_tier_monthly_credits()` which returns 80 for Starter. So even 1MES promo users (limited to 35 on first month) get 80 on subsequent months — this is actually correct behavior, but worth noting.

## Fix Plan

### Fix 1: Remove credit allocation from `check-subscription`

The `check-subscription` function should ONLY sync the tier/subscription status. Credit allocation should happen ONLY in the webhook (single source of truth). 

**In `supabase/functions/check-subscription/index.ts`:**
- Remove lines 145-225 (the entire `shouldAllocateCredits` logic and the `refund_user_credits` RPC call)
- Keep only the `upsert` to sync tier data (without `last_reset_at` changes)

### Fix 2: Add idempotency guard to webhook credit allocation

In `supabase/functions/stripe-webhook/index.ts`, before allocating credits on `checkout.session.completed`:
- Check `credits_transactions` for an existing entry with the same `session.id` in metadata
- Skip allocation if already exists

This prevents duplicate credits even if the webhook fires twice.

### Files to change:
1. `supabase/functions/check-subscription/index.ts` — Remove credit allocation logic
2. `supabase/functions/stripe-webhook/index.ts` — Add idempotency check using session ID in metadata

