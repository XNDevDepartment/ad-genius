---
name: Offer and pricing structure
description: Complete map of active offers, promo codes, Stripe mechanics, and discount values
type: project
---

## Standard Plans (Pricing page, /pricing)

| Plan    | Monthly | Yearly (billed) | Monthly equiv | Save/yr | Credits |
|---------|---------|-----------------|---------------|---------|---------|
| Starter | €29     | €290            | €24.17        | €58     | 80      |
| Plus    | €49     | €490            | €40.83        | €98     | 200     |
| Pro     | €99     | €990            | €82.50        | €198    | 400     |

Yearly pricing in create-checkout: starter=29000c, plus=49000c, pro=99000c
(Pricing.tsx yearlyPrice values are display-only, close but not exact match — rounding difference is negligible)

## Active Promotional Offers

### ONB1ST — "First Month Special"
- Route: /promo/first-month
- planId: starter, promoCode: 'ONB1ST'
- Stripe mechanic: ad-hoc coupon `amount_off: 1901` (once) → €29 - €19.01 = €9.99... wait, recalc:
  - 2900 - 1901 = 999 cents = €9.99??? No — the page says €19.99 first month
  - Actually amount_off=1901 from €29.00 = €29.00 - €19.01 = €9.99 (NOT €19.99)
  - BUG: PromoFirstMonth page advertises €19.99 but the coupon creates €9.99 checkout
  - The promoCode is 'ONB1ST' but Promo1Mes uses '1MES' code
  - PromoFirstMonth uses ONB1ST at €19.99 — uses Stripe lookup (not ad-hoc), so it uses existing Stripe ONB1ST code

### 1MES — "One Month Experiment"
- Route: /promo/1mes and /promo/1mes/checkout
- planId: experiment, paymentMode: one_time
- Price: €9.99 one-time payment
- Gives: 35 credits, 30-day access
- Stripe: uses existing product prod_U7RlMZUJGKXGza
- Stripe mechanic for 1MES code: creates ad-hoc coupon amount_off=1901 cents on top of €29 starter
  - This is for /promo/1mes page which uses promoCode='1MES' + planId='starter'
  - BUT /promo/1mes/checkout uses planId='experiment' (no promoCode) — INCONSISTENCY

### 3MESES — "Three Month Promo"
- Route: /promo/3meses and /promo/3meses/checkout
- planId: starter, promoCode: '3MESES'
- Stripe mechanic: ad-hoc coupon amount_off=901 cents (repeating, 3 months) → €29 - €9.01 = €19.99/mo × 3
- Price: €19.99/month for 3 months, then €29/month
- Total saving: €27.03 over 3 months

### Founders Plan
- Route: /founders
- planId: founders
- Price: €19.99/mo (monthly) or €239.88/yr (€19.99 × 12)
- Credits: 80/month (same as Starter)
- Positioned as "lifetime pricing guarantee" — lock in €19.99 forever
- NOT actively linked from any in-app surface right now

## Promo Code System
- Admin promo codes managed via PromoCodesManagement component
- User redemption via PromoCodeRedemption (account page)
- Edge function: `redeem-promo-code`
- These are separate from Stripe coupon codes — they grant bonus credits to the account

## Key Observations
1. Three offers target the same audience (Free tier → Starter): ONB1ST (€19.99/1mo), 3MESES (€19.99/3mo), 1MES (€9.99 one-time). All promote "Starter" but at very different price points/mechanics.
2. The 1MES page FAQ contradicts the offer: FAQ says "single payment, no subscription" but the hero references €29 regular price (which is subscription). Mixed messaging.
3. create-checkout 1MES coupon amount_off=1901 from €29 = €9.99 net. But PromoFirstMonth shows €19.99. These are DIFFERENT promo codes: ONB1ST is a Stripe lookup (existing coupon) and 1MES creates ad-hoc.
