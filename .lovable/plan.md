

## ProduktPix — Current Project Status Analysis

### Architecture & Stack
- **Frontend**: Vite + React + TypeScript SPA, Tailwind CSS, shadcn/ui, i18n (5 languages)
- **Backend**: Supabase Edge Functions (Deno), PostgreSQL with RLS, Stripe billing
- **AI**: Google Gemini (image gen), OpenAI (chat), Kling (video)
- **Routes**: 50+ routes, lazy-loaded with error boundaries

---

### Recent Changes Implemented

| Feature | Status |
|---|---|
| Shopify tab disabled with "Soon" badge | Done |
| API gateway `/v1/catalog/generate` endpoint | Done |
| API docs updated with catalog endpoints | Done |
| UGC crash fix (null-safe scenario API, race conditions) | Done |
| HTML prerender SSR fallback for landing page | Done |
| SSR color corrections (purple → blue) | Done |
| "Pricing" → "Upgrade" tab rename + Crown highlight for free users | Done |
| PhotoshootModal i18n translations | Done |
| Onboarding bottom nav overlap fix | Done |
| Feature gating: catalogs unlocked, videos locked for free tier | Done |
| 2K/4K + 9:16/4:5 locked for free users (Crown icon) | Done |
| Photoshoot button blocked for free users | Done |
| UGC module: resolution selector + new aspect ratios (2:3, 4:5, 5:4, 21:9) | Done |
| Edge functions: tiered credit pricing (1K=1, 2K=2, 4K=3) | Done |
| DB functions updated for tiered pricing | Done |

---

### Active Issues & Inconsistencies

#### Credit Cost Mismatch
- **BulkBackground.tsx** line 33: `4K` charges **4 credits** (`return 4`)
- **OutfitSwap.tsx** line 194: `4K` charges **4 credits** (`return 4`)
- **useCredits.tsx** line 14: `4K` charges **3 credits** (`costPerImage = 3`)
- **Edge functions**: `4K` charges **3 credits** (width ≥ 2800)
- **DB functions**: `4K` charges **3 credits**
- **Verdict**: BulkBackground and OutfitSwap have stale `getCreditsPerImage` functions charging 4 instead of 3 for 4K images. This means the UI shows a higher cost than what's actually deducted server-side.

#### ResolutionSelector Component
- Labels say "Normal", "Medium", "Large" — these are internal tier names, not user-friendly. Should be "1K", "2K", "4K" to match the rest of the app.
- No free-tier gating (Crown icons) on this component — the gating was added directly in `CreateUGCGeminiBase.tsx` and `SettingsForm.tsx` instead.

#### Promo/Conversion Issues (from agent memory — still unresolved)
- **PromoBanner3Meses**: Still Portuguese-only (no i18n)
- **Promo pages** (Promo1Mes, Promo3Meses, PromoFirstMonth): Still Portuguese-only
- **PostGenerationUpgradeModal**: Still links to `/pricing` instead of a specific offer
- **Cancel page**: Still has stale copy ("100 credits" instead of 400 for Pro)
- **Promo1Mes vs Promo1MesCheckout**: Still use different planIds (subscription vs one-time)
- **PendingActivationBanner**: Still English-only (no i18n)
- **VideoGenerator upgrade gate**: Still English-only

#### Technical Debt
- `ResolutionSelector.tsx` exists as a standalone component but is barely used — most modules implement their own inline resolution toggles
- `getCreditsPerImage` is defined locally in 2 files instead of using the centralized `calculateImageCost` from `useCredits`
- `MobilePromoBanner` and `AnnouncementBanner` remain commented out/dormant

---

### Feature Completeness Summary

| Module | Resolution Selector | Aspect Ratios | Free-tier Gating | i18n |
|---|---|---|---|---|
| UGC (Gemini) | 1K/2K/4K ✅ | Full set ✅ | 2K/4K + 9:16/4:5 locked ✅ | ✅ |
| Product Catalog (Bulk BG) | 1K/2K/4K ✅ | Partial (Select dropdown) | 2K/4K + 9:16/4:5 locked ✅ | Partial |
| Fashion Catalog (Outfit Swap) | 1K/2K/4K ✅ | Partial (Select dropdown) | 2K/4K + 9:16/4:5 locked ✅ | Partial |
| Video | N/A | N/A | Module locked ✅ | Partial |
| Landing/Promo pages | N/A | N/A | N/A | Portuguese-only ❌ |

---

### Recommended Next Steps (Priority Order)

1. **Fix 4K credit cost inconsistency** — Change `getCreditsPerImage` in BulkBackground.tsx and OutfitSwap.tsx from `4` to `3` to match edge functions and DB
2. **i18n promo pages** — PromoBanner3Meses, Promo1Mes, Promo3Meses, PromoFirstMonth are all Portuguese-only
3. **Fix Cancel page** — Update stale "100 credits" copy, add i18n
4. **PostGenerationUpgradeModal** — Link to a specific offer instead of generic /pricing
5. **Centralize credit cost calculation** — Replace local `getCreditsPerImage` functions with `useCredits().calculateImageCost`

