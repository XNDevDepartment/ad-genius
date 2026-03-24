---
name: Promotional conflicts and issues
description: Identified conflicts, stacking bugs, i18n gaps, audience mismatches, and copy errors
type: project
---

## CONFLICT SEVERITY LEGEND
- HIGH: User-facing bug or contradictory offer visible simultaneously
- MEDIUM: Degrades experience or wastes conversion opportunity
- LOW: Technical debt / minor inconsistency

---

## HIGH SEVERITY

### H1 — PromoBanner3Meses has zero i18n
- File: `src/components/PromoBanner3Meses.tsx`
- Issue: All copy is hardcoded Portuguese. Non-PT users (ES, EN, FR, DE) see Portuguese text.
- Impact: App supports 5 languages. PT-only copy shown to all free users on desktop and mobile dashboard.
- Fix: Wrap copy in t() calls and add i18n keys.

### H2 — PromoBanner3Meses shown on desktop alongside AppSidebar Upgrade Button
- Files: `src/components/PromoBanner3Meses.tsx`, `src/components/AppSidebar.tsx`
- Issue: Free-tier desktop users on dashboard (/) see BOTH a Portuguese promo banner promoting €19.99/3mo Starter AND an "Upgrade to Pro" button in the sidebar linking to /pricing (full plans). Two simultaneous, contradictory upgrade CTAs for different plans/prices.
- Impact: Confuses the user — one says "€19.99/mo Starter", the other says "Upgrade to Pro" at /pricing showing €29+ plans.
- Fix: The banner should either be hidden on desktop OR coordinated with the sidebar CTA to promote the same offer.

### H3 — Cancel page has stale and misleading copy
- File: `src/pages/Cancel.tsx`
- Issue: "Why upgrade to Pro?" lists "100 credits per month (vs 10 free)" — Pro is actually 400 credits. Copy is hardcoded English with no i18n.
- Impact: User who abandoned checkout sees inaccurate plan benefits, reducing re-conversion likelihood.
- Fix: Update credits figure to 400. Add i18n. Consider promoting the specific plan they abandoned.

### H4 — Promo1Mes page vs. Promo1MesCheckout inconsistency
- Files: `src/pages/Promo1Mes.tsx`, `src/pages/Promo1MesCheckout.tsx`
- Issue: Promo1Mes.tsx calls create-checkout with planId='starter' + promoCode='1MES' (monthly subscription with discount). But Promo1MesCheckout.tsx calls planId='experiment' + paymentMode='one_time' (one-time purchase). These are two completely different products.
- Impact: User who goes /promo/1mes/checkout directly gets a different product than the page promises.
- Fix: Both flows should use the same planId. Decide which is canonical: subscription (1MES coupon) or one-time (experiment).

---

## MEDIUM SEVERITY

### M1 — VideoGenerator upgrade gate hardcoded in English
- File: `src/pages/VideoGenerator.tsx` lines 83, 528
- Issue: "Upgrade Required" card title and "View Pricing Plans" button are not wrapped in t() calls.
- Impact: Non-English users see English-only upgrade prompt in the video creation flow.
- Fix: Use useTranslation and reference existing i18n keys (ugc.upgradeCredits etc.) or add new ones.

### M2 — PendingActivationBanner has no i18n
- File: `src/components/PendingActivationBanner.tsx`
- Issue: All copy hardcoded in English ("Account Pending Activation", "Resend Email", etc.)
- Impact: Portuguese/Spanish/French/German users see English activation messaging.
- Fix: Wrap in t() with new i18n keys.

### M3 — StickyUpgradeBar CTA hardcodes Plus plan details in i18n copy
- Key: `mobileUpgrade.stickyBar.cta` = "Unlock 200 credits — €49"
- Issue: The CTA text hardcodes Plus plan price (€49) and credit amount (200) inside the translation strings. If Plus pricing changes, all 5 language files must be updated manually. Also, the CTA navigates to /pricing rather than direct Plus checkout.
- Impact: Low-friction opportunity lost — user has to choose again at pricing page rather than going direct to Plus checkout.
- Fix: Change CTA to link directly to Plus checkout via create-checkout, or use dynamic interpolation with tier variables.

### M4 — PostGenerationUpgradeModal targets generic /pricing not a specific offer
- File: `src/components/PostGenerationUpgradeModal.tsx`
- Issue: Fires at the highest-intent moment (just completed first generation on free tier) but sends user to /pricing with no specific offer. The MobilePromoBanner (dormant) would have sent to /promo/first-month with ONB1ST discount.
- Impact: Missed conversion — post-generation is the highest-intent moment and the best place for a specific offer.
- Fix: Navigate to /promo/3meses or /promo/first-month instead of /pricing.

### M5 — Overlapping z-index: StickyUpgradeBar and BottomTabBar on mobile
- StickyUpgradeBar: z-40, `fixed bottom-16` (sits at 64px from bottom)
- BottomTabBar: z-50, `fixed bottom-0`
- Issue: z-40 on StickyUpgradeBar vs z-50 on BottomTabBar is correct ordering, but the pixel offset of `bottom-16` (64px) may clip under the BottomTabBar on some device heights since pb-[calc(0.75rem+env(safe-area-inset-bottom))] is applied. On devices with a large safe-area-inset (notch phones), the StickyUpgradeBar content at bottom-16 could overlap with BottomTabBar.
- Fix: Use dynamic bottom offset that accounts for the BottomTabBar height.

### M6 — PromoFirstMonth has no i18n
- File: `src/pages/PromoFirstMonth.tsx`
- Issue: Zero useTranslation usage. All copy in Portuguese ("Primeiro Mês por €19.99", "Ativar Oferta", etc.)
- Impact: Non-PT users who land on /promo/first-month see Portuguese.

### M7 — Promo3Meses / Promo1Mes have no i18n
- Files: `src/pages/Promo3Meses.tsx`, `src/pages/Promo1Mes.tsx`
- Issue: Zero t() usage. Hardcoded Portuguese throughout both full-page promo experiences.
- Impact: These are likely shared via paid ads. If ES/EN/FR/DE users click an ad, they see Portuguese.

### M8 — Three competing Starter offers create offer confusion
- Offers: ONB1ST (€19.99 first month → then €29), 3MESES (€19.99 × 3 months → then €29), 1MES (€9.99 one-time, 35 credits)
- Issue: All three are accessible but no user journey coordinates which offer a user sees based on their state.
- Impact: A user could see PromoBanner3Meses (3MESES), then PostGenerationUpgradeModal → /pricing (full price), then manually find /promo/1mes for €9.99. The cheapest offer is not the most prominently surfaced.

---

## LOW SEVERITY

### L1 — AnnouncementBanner and MobilePromoBanner are commented out
- These are built and i18n-ready but disabled
- They represent €19.99/mo first month offers that are not currently being shown
- The Founders Plan (AnnouncementBanner) may or may not be still a valid offer
- Impact: Potential revenue left on the table from dormant offers

### L2 — PromoBanner3Meses dismissal uses sessionStorage (resets on tab close)
- Issue: User dismisses the banner, opens a new tab, sees it again. Could contribute to promo fatigue.
- Other banners also use sessionStorage for dismiss state.
- Fix: Use localStorage for dismiss with a time-based expiry (e.g., 7 days).

### L3 — MobileCreditCard always shows for free tier (no dismissal)
- File: `src/components/MobileCreditCard.tsx`
- Issue: No dismiss mechanism, shows permanently on mobile dashboard.
- This is less of a conflict and more a UX consideration — it's always visible context.

### L4 — FoundersPlan page has no in-app entry point
- AnnouncementBanner (which linked to /pricing, not /founders) is commented out
- No active in-app surface links to /founders
- The page exists and functions but is only reachable via direct URL or external link
