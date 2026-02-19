
# Improve /lp Landing Page for SMB Audiences

## Problem

The current `/lp` page is optimized for tech-savvy users -- it leads with abstract stats, a marquee of generated images, and jumps to pricing. For small/medium business owners who are **less familiar with AI**, the page needs to:

1. **Explain the value in business terms** (save money, save time, sell more)
2. **Show concrete use cases** (what does this look like for MY business?)
3. **Build trust with social proof** (real testimonials, not just metrics)
4. **Add a "Book a Demo" CTA** alongside the self-serve flow (per existing conversion strategy)

---

## Proposed New Section Order

Current order:
```
Hero -> Logo Marquee -> Image Marquee -> Stats -> Before/After -> How It Works -> Pricing -> FAQ
```

New order:
```
Hero (updated copy) -> Logo Marquee -> Pain Point / Value Props -> Before/After -> Use Cases for SMBs (NEW) -> Image Marquee -> Social Proof / Testimonials (NEW) -> How It Works -> Pricing -> FAQ
```

---

## Changes in Detail

### 1. Update MinimalHero copy for SMBs

**File:** `src/components/landing-v2/MinimalHero.tsx`

Change the headline and description to speak to business outcomes, not tech:
- Current: "Create Product Images That Actually Sell"
- New: "Professional Product Photos Without the Studio" (or similar)
- Description: Focus on cost savings ("Save thousands on photography") and speed ("Ready in seconds, not days")
- Add a secondary CTA: "Book a Demo" linking to Cal.com (per conversion strategy)
- Add a trust line: "Trusted by 10,000+ e-commerce businesses"

### 2. New Section: Pain Points / Value Props

**New file:** `src/components/landing-v2/ValuePropsSection.tsx`

A 3-column (desktop) / stacked (mobile) section with business-focused value propositions:

| Prop | Title | Description |
|---|---|---|
| Cost icon | Save Up to 90% on Photography | No studio, no photographer, no editing team. Get professional results from a phone photo. |
| Clock icon | From Photo to Listing in 30 Seconds | Stop waiting days for a photoshoot. Upload, generate, publish. |
| TrendingUp icon | Increase Sales with Better Images | Professional product photos boost conversion rates by up to 3x. |

Each card has an icon, bold title, and 2-line description. Simple, scannable, non-technical.

### 3. New Section: SMB Use Cases

**New file:** `src/components/landing-v2/UseCasesGrid.tsx`

A visual grid showing **how different business types use ProduktPix**. 4-6 cards, each with:
- Icon
- Business type (e.g., "Online Clothing Store", "Handmade & Craft Sellers", "Beauty & Cosmetics Brands", "Furniture & Home Decor")
- One-line benefit
- "See how it works" link (scrolls to How It Works)

This directly answers the question: "Is this for MY kind of business?"

### 4. New Section: Social Proof / Testimonials

**New file:** `src/components/landing-v2/TestimonialsSection.tsx`

2-3 testimonial cards with:
- Quote text
- Name, role, company
- Optional star rating

For now, use representative quotes (can be updated with real testimonials later). Styled as cards with subtle borders, matching existing design system.

### 5. Reorder Sections in LandingPageV2.tsx

**File:** `src/pages/LandingPageV2.tsx`

Import and place the 3 new sections in the updated order:
```
MinimalHero
LogoMarquee
ValuePropsSection (NEW)
BeforeAfterShowcase
UseCasesGrid (NEW)
ImageMarquee
TestimonialsSection (NEW)
HowItWorksMinimal
PricingComparison
FAQAccordion
```

### 6. Update FAQ for SMBs

**File:** `src/components/landing-v2/FAQAccordion.tsx`

Add 2-3 SMB-focused FAQs:
- "Do I need any design or AI skills?" -- No, just upload a photo.
- "What kind of businesses use ProduktPix?" -- Fashion, jewelry, cosmetics, home goods, food, and more.
- "Can I try it before committing?" -- Yes, the free plan gives you 10 credits.

### 7. i18n: Add All New Keys

**Files:** `src/i18n/locales/{en,pt,es,fr,de}.json`

Add translation keys under `landingV2` for:
- Updated hero copy
- `valueProps` section (3 titles + 3 descriptions)
- `useCases` section (header + 4-6 card titles/descriptions)
- `testimonials` section (header + 2-3 quotes)
- New FAQ entries

---

## Technical Summary

| File | Action |
|---|---|
| `src/components/landing-v2/MinimalHero.tsx` | Update copy, add "Book a Demo" CTA, add trust line |
| `src/components/landing-v2/ValuePropsSection.tsx` | **New file** -- 3-column value props (cost, speed, results) |
| `src/components/landing-v2/UseCasesGrid.tsx` | **New file** -- 4-6 business type cards |
| `src/components/landing-v2/TestimonialsSection.tsx` | **New file** -- 2-3 testimonial cards |
| `src/components/landing-v2/FAQAccordion.tsx` | Add 3 SMB-focused FAQ entries |
| `src/pages/LandingPageV2.tsx` | Import new sections, reorder layout |
| `src/i18n/locales/en.json` | Add all new translation keys |
| `src/i18n/locales/pt.json` | Add Portuguese translations |
| `src/i18n/locales/es.json` | Add Spanish translations |
| `src/i18n/locales/fr.json` | Add French translations |
| `src/i18n/locales/de.json` | Add German translations |

### No new dependencies needed

All sections use existing Tailwind, Lucide icons, framer-motion (optional), and the existing component library.
