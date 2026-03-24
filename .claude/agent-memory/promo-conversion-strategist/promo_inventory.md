---
name: Promotional surfaces inventory
description: All promo components with file paths, trigger conditions, frequency caps, and current status
type: project
---

## ACTIVE IN-APP PROMOTIONAL SURFACES

### 1. PromoBanner3Meses
- File: `src/components/PromoBanner3Meses.tsx`
- Rendered in: `src/pages/Index.tsx` line 100 (inside OnboardingGuard)
- Trigger: user logged in + isFreeTier() — no timing/frequency logic
- Frequency cap: sessionStorage key `promo_3meses_banner_dismissed` (resets on tab close)
- Offer: Starter at €19.99/mês for 3 months (promo code 3MESES, saves €27.03)
- CTA destination: `/promo/3meses`
- i18n: NONE — all copy hardcoded in Portuguese
- Visibility: desktop AND mobile (no lg:hidden class)
- Status: ACTIVE

### 2. MobileCreditCard
- File: `src/components/MobileCreditCard.tsx`
- Rendered in: `src/pages/Index.tsx` line 122 (mobile only — inside lg:hidden block, shown only when tier === "Free")
- Trigger: isFreeTier()
- Frequency cap: none (always visible)
- Offer: no specific offer — credit progress bar with "Unlock More Images" → /pricing
- i18n: full i18n via mobileUpgrade.* keys
- Visibility: mobile only (lg:hidden parent block in Index)
- Status: ACTIVE

### 3. StickyUpgradeBar
- File: `src/components/StickyUpgradeBar.tsx`
- Rendered in: `src/pages/Index.tsx` line 185 (inside OnboardingGuard)
- Trigger: isMobile + isFreeTier() + stats.totalImages >= 1 + remaining/total < 0.5
- Frequency cap: in-component dismissed state (session only, no storage)
- Offer: "Unlock 200 credits — €49" → /pricing (hardcoded to Plus plan in i18n copy)
- i18n: full i18n via mobileUpgrade.stickyBar.* keys
- Visibility: mobile only (isMobile check)
- z-index: z-40, fixed bottom-16
- Status: ACTIVE

### 4. PostGenerationUpgradeModal
- File: `src/components/PostGenerationUpgradeModal.tsx`
- Rendered in: `src/pages/CreateUGCGeminiBase.tsx` line 1659
- Trigger: jobStatus === "completed" + jobId !== previously shown + isFreeTier() + isMobile — 1500ms delay
- Frequency cap: per-job dedup via useRef (shownForJobRef), resets on component unmount
- Offer: upgrade CTA → /pricing (generic)
- i18n: full i18n via mobileUpgrade.postGeneration.* keys
- Visibility: mobile only (isMobile check)
- Status: ACTIVE

### 5. PaymentFailedBanner
- File: `src/components/PaymentFailedBanner.tsx`
- Rendered in: `src/components/AppLayout.tsx` line 34-36 (all authenticated routes)
- Trigger: user + subscriptionData.payment_failed_at is set
- Frequency cap: sessionStorage `paymentFailedBannerDismissed` (resets on tab close)
- Offer: "Update Payment" → Stripe customer portal
- i18n: partial — uses t() with fallback English strings; all keys appear to be present
- Urgency levels: critical (<= 3 days), high (<= 7), medium (<= 14), low (default), 21-day grace total
- Visibility: desktop + mobile
- Status: ACTIVE

### 6. AppSidebar Upgrade Button
- File: `src/components/AppSidebar.tsx` line 292-303
- Rendered in: All authenticated desktop routes (via AppLayout → SidebarProvider)
- Trigger: user + isFreeTier()
- Frequency cap: none (persistent)
- Offer: navigate("/pricing") — no specific discount
- i18n: navigation.upgradeToPro key
- Visibility: desktop only (inside hidden lg:block in AppLayout)
- Status: ACTIVE

### 7. VideoGenerator Upgrade Gate
- File: `src/pages/VideoGenerator.tsx` lines 78-90 (toast + redirect) and 523-540 (inline card)
- Rendered in: /create/video route
- Trigger: !canAccessVideos() on mount — toast fires immediately + redirect after 2 seconds; inline card renders as full page replacement
- Frequency cap: none (fires every visit)
- Offer: "View Pricing Plans" → /pricing
- i18n: PARTIAL — "Upgrade Required" and "View Pricing Plans" are hardcoded English strings (not in i18n)
- Visibility: all devices
- Status: ACTIVE

### 8. ModuleSelection Lock Gate
- File: `src/pages/ModuleSelection.tsx` lines 109, 170-171
- Rendered in: /create route
- Trigger: isFreeTier() for video module (others unlocked)
- Frequency cap: none (fires every click)
- Offer: navigate('/pricing') on click — no specific copy
- i18n: uses locked-card copy from i18n (createSelection.*)
- Status: ACTIVE

### 9. AnnouncementBanner
- File: `src/components/AnnouncementBanner.tsx`
- Rendered in: AppLayout line 40 — COMMENTED OUT (`{/* <AnnouncementBanner /> */}`)
- Trigger: not isDismissed (localStorage `founders-banner-dismissed`)
- Frequency cap: localStorage (persists until cleared)
- Offer: Founders Pack → /pricing
- i18n: full i18n via announcement.* keys (all 5 languages)
- Status: DORMANT (commented out)

### 10. MobilePromoBanner
- File: `src/components/MobilePromoBanner.tsx`
- Rendered in: AppLayout line 45 — COMMENTED OUT (`{/* {user && <MobilePromoBanner />} */}`)
- Trigger: user + isFreeTier(); shows 24-hour countdown from first visit
- Frequency cap: sessionStorage `promo_banner_dismissed` (dismiss); localStorage `promo_onb1st_start` (timer)
- Offer: Starter at €19.99/first-month → /promo/first-month (promo code ONB1ST)
- i18n: full i18n via promo.mobile.* keys
- Status: DORMANT (commented out)

---

## PROMO LANDING PAGES (standalone routes)

### Promo3Meses — /promo/3meses
- File: `src/pages/Promo3Meses.tsx`
- Checkout: planId='starter', promoCode='3MESES' → €19.99/mo × 3 months (saves €27.03)
- promo_redirect: /promo/3meses (redirects to signin if unauthenticated)
- i18n: NONE — 100% Portuguese
- Status: ACTIVE

### Promo3MesCheckout — /promo/3meses/checkout
- File: `src/pages/Promo3MesCheckout.tsx`
- Checkout: same as above, auto-fires on mount
- i18n: NONE (toast error hardcoded Portuguese)
- Status: ACTIVE

### PromoFirstMonth — /promo/first-month
- File: `src/pages/PromoFirstMonth.tsx`
- Checkout: planId='starter', promoCode='ONB1ST' → €19.99 first month
- promo_redirect: /promo/first-month
- i18n: NONE — 100% Portuguese (no useTranslation used)
- Status: ACTIVE

### Promo1Mes — /promo/1mes
- File: `src/pages/Promo1Mes.tsx`
- Checkout: planId='experiment', paymentMode='one_time' → €9.99 one-time, 35 credits, 30 days
- promo_redirect: /promo/1mes
- i18n: NONE — 100% Portuguese
- NOTE: FAQ copy incorrectly says "É mesmo pagamento único?" confirms one-time but the title says "Primeiro Mês" suggesting subscription
- Status: ACTIVE

### Promo1MesCheckout — /promo/1mes/checkout
- File: `src/pages/Promo1MesCheckout.tsx`
- Checkout: planId='experiment', paymentMode='one_time' — auto-fires on mount
- i18n: NONE
- Status: ACTIVE

### FoundersPlan — /founders
- File: `src/pages/FoundersPlan.tsx`
- Checkout: planId='founders' at €19.99/mo or €239.88/yr
- i18n: full i18n via foundersPlan.* keys
- Status: ACTIVE (but not linked from any in-app surface currently)

---

## OTHER PROMO MECHANISMS

### Promo Code Redemption (Account page)
- File: `src/components/account/PromoCodeRedemption.tsx`
- Trigger: user navigates to Account tab with promo section
- Offer: user-entered promo codes → credited to account

### Cancel Page (Checkout Abandonment Recovery)
- File: `src/pages/Cancel.tsx`
- Trigger: user abandons Stripe checkout
- Offer: static "Why upgrade to Pro?" list — mentions 100 credits (outdated, Pro is 400)
- i18n: NONE — hardcoded English
- Status: NEEDS ATTENTION (stale copy)

### PendingActivationBanner
- File: `src/components/PendingActivationBanner.tsx`
- Trigger: account not yet activated (passed in as prop, not shown via hook)
- Not a promotional surface but blocks video access
- i18n: NONE — hardcoded English
