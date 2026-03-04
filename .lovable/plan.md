

# 3MESES Users Missing Credits — Root Cause & Fix

## Root Cause

The Stripe webhook (`stripe-webhook` edge function) is **not firing** for these checkout sessions. Evidence:

- All 3 affected users have `last_reset_at: NULL` — the webhook sets this field during `checkout.session.completed`
- Zero `credits_transactions` records exist for these users — the webhook is the only place that allocates credits
- Their subscriber records WERE updated to `subscribed: true` / `Starter` — but this was done by `check-subscription` (polled from the Success page), not the webhook

**Affected users:**
| Email | Credits | Should Have |
|---|---|---|
| geral.patriciavieira@hotmail.com | 10 | 80 |
| sapatariatrindade1951@gmail.com | 17 | 80 |
| maria.peixoto2000@hotmail.com | 3 | 80 |

## Immediate Fix — Grant Missing Credits

Run a data update to set `credits_balance` to 80 and `last_reset_at` to now for all 3 affected users using the insert/update tool.

## Structural Fix — Fallback Credit Allocation in check-subscription

The current architecture has a single point of failure: if the webhook doesn't fire, users never get credits. Add a safety net in `check-subscription`:

In `supabase/functions/check-subscription/index.ts`, after the subscriber upsert (line 154-162), add logic:

1. If the user is now `subscribed = true` AND `last_reset_at IS NULL` (meaning webhook never ran)
2. Check if a credit transaction already exists for the current period
3. If not, allocate the tier-appropriate credits via `refund_user_credits` RPC and set `last_reset_at`

This ensures that even if the webhook fails, credits are allocated the first time the user loads the app.

## Action Required (Manual)

You need to verify your Stripe webhook configuration in the Stripe Dashboard:
- Go to Developers → Webhooks
- Confirm the endpoint URL points to `https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/stripe-webhook`
- Confirm `checkout.session.completed` is in the list of events
- Check for any failed delivery attempts in the webhook logs

## Summary of Changes

- **Data fix**: Update 3 users' `credits_balance` to 80 and set `last_reset_at`
- **Edge function**: Add fallback credit allocation in `check-subscription` + redeploy
- **Manual**: Verify Stripe webhook endpoint configuration

