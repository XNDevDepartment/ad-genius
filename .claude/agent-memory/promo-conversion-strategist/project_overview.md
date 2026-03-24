---
name: ProduktPix project overview
description: Core facts about the ProduktPix SaaS app relevant to promo/conversion work
type: project
---

ProduktPix is a Vite + React + TypeScript SPA backed by Supabase. AI product photography and video SaaS.

**Subscription Tiers**
- Free: 10 credits/month, limited features (1 image/generation, locked 9:16 and 4:5 ratios, no video)
- Starter: 80 credits/month — €29/mo or €290/yr (save €58)
- Plus: 200 credits/month — €49/mo or €490/yr (save €98) — marked "Popular"
- Pro: 400 credits/month — €99/mo or €990/yr (save €198) — marked "Best Value"
- Founders: 80 credits/month — €19.99/mo or €239.88/yr — legacy plan, accessed via /founders

**Credit Costs (tiered by resolution)**
- 1K image: 1 credit
- 2K image: 2 credits (locked for free tier)
- 4K image: 3 credits (locked for free tier)
- Video 5s: 5 credits
- Video 10s: 10 credits

**Stripe planId values used in create-checkout**
- `founders` — Founders plan
- `starter` — Starter plan
- `plus` — Plus plan
- `pro` — Pro plan
- `onboarding_first_month` — internal name, not called directly (ONB1ST promo uses starter + promoCode)
- `experiment` — one-time €9.99 purchase (35 credits, 30-day access) — prod_U7RlMZUJGKXGza

**Key routing**
- AppLayout wraps all / sub-routes
- Promo pages are outside AppLayout (standalone routes with MinimalHeader/MinimalFooter)
- PaymentFailedBanner lives in AppLayout and renders for all authenticated routes
- PromoBanner3Meses + StickyUpgradeBar + MobileCreditCard render inside Index (/) page

**Why:** Needed to ground all promo strategy in exact tier/price data rather than guess.
**How to apply:** Always reference these values when drafting CTAs; never hardcode prices inline.
