---
name: Conversion funnel map and gaps
description: User journey with existing touchpoints annotated and gaps identified
type: project
---

## FUNNEL STAGES AND CURRENT TOUCHPOINTS

### Stage 1 — Discovery / Landing
- Surface: LandingPageV2 (public /)
- Promo: MinimalHeader has link to /pricing; landing page has CTA to /signup
- Gap: No special offer surfaced to visitors who bounce; no exit-intent capture

### Stage 2 — Sign Up / Onboarding
- Surface: /signup, /signin, /email-confirmation
- SignUp.tsx handles promo_redirect from sessionStorage (returns user to promo page after signup)
- Gap: No welcome offer on signup confirmation; no onboarding email promo

### Stage 3 — First Session (Free tier, < 5 images generated)
- Active surfaces on /: PromoBanner3Meses (desktop + mobile, Portuguese only), MobileCreditCard (mobile only)
- AppSidebar Upgrade button (desktop only, → /pricing)
- Gap: No desktop-specific promotional surface after PromoBanner3Meses is dismissed
- Gap: PromoBanner3Meses is Portuguese-only, alienating EN/ES/FR/DE users

### Stage 4 — Active Creation (free tier, credits burning)
- Surfaces: credit display in generation header; "locked" visual on 2K/4K resolutions; locked aspect ratios
- StickyUpgradeBar fires once user has < 50% credits AND has made >= 1 image
- Gap: No specific offer in the creation flow itself (only /pricing link)

### Stage 5 — Post-Generation Success (highest intent moment)
- PostGenerationUpgradeModal fires on mobile free tier 1500ms after job completes
- Sends to /pricing — generic, no specific discount
- Gap: Desktop has no post-generation upgrade moment
- Gap: Modal sends to /pricing, not a discounted offer page

### Stage 6 — Credit Depletion (0 credits remaining)
- MobileCreditCard shows "locked" state with urgency copy
- StickyUpgradeBar triggers (credits < 50% is prerequisite)
- Gap: No dedicated "credits exhausted" modal on desktop
- Gap: No specific discounted offer triggered at 0-credit state

### Stage 7 — Feature Discovery / Gate Hit
- Video: toast + auto-redirect to /pricing; inline upgrade card if they reach /create/video directly
- ModuleSelection: locked video card → /pricing on click
- BulkBackground: 2K/4K locked, video export locked → /pricing
- OutfitSwap: 2K/4K locked, aspect ratio locked (silent)
- Gap: Feature gates on OutfitSwap have no visible explanation/CTA — user just can't select
- Gap: All feature gates send to /pricing (no discounted offers)

### Stage 8 — Returning User / Dashboard Idle
- Surface: PromoBanner3Meses on dashboard (sessionStorage dismiss, shows every session)
- No time-based re-engagement surface (e.g., "you haven't generated this week")
- Gap: No re-engagement logic for returning free users who haven't generated recently

### Stage 9 — Checkout Abandonment
- Cancel page at /cancel exists with basic recovery CTA
- trackCheckoutAbandoned() fires Meta Pixel event for remarketing
- No in-app recovery flow (e.g., reduced-price offer on cancel page)
- Gap: Cancel page copy is stale (100 credits/month vs actual 400 for Pro)
- Gap: Cancel page has no special offer — just generic retry → /pricing
- Gap: No abandoned checkout email trigger (external Mailerlite integration exists but unclear if used)

### Stage 10 — Payment Failure (churning paid user)
- PaymentFailedBanner: urgency-tiered, 21-day grace period
- Links to Stripe customer portal
- Coverage: good — renders on all authenticated routes
- Gap: No SMS/email reminder (external)

## CONVERSION GAPS SUMMARY

| Gap | Stage | Severity |
|-----|-------|----------|
| No desktop post-generation upgrade moment | Stage 5 | High |
| PostGenerationUpgradeModal links to /pricing not discounted offer | Stage 5 | High |
| PromoBanner3Meses is Portuguese-only | Stage 3 | High |
| No credit exhaustion modal on desktop | Stage 6 | High |
| Cancel page has wrong credits count + no special offer | Stage 9 | Medium |
| Feature gates don't surface specific offers | Stage 7 | Medium |
| No re-engagement surface for idle free users | Stage 8 | Medium |
| No exit-intent capture on landing | Stage 1 | Low |
| No welcome/onboarding email promo | Stage 2 | Low |
