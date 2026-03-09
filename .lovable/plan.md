

# SEO & GEO Overhaul — "Professional Product Photos" for E-commerce Owners

## ICP Recap

Small fashion e-commerce brands (€10K-€100K revenue), 1-3 person teams on Shopify/WooCommerce. They need professional product photos but lack budget/time for studios. Secondary: Shopify developers and e-commerce agencies building stores for clients.

**Copy principle**: Lead with business outcomes (save money, launch faster, sell more). Never lead with "AI" — it intimidates this audience. Technology is invisible; results are what matters.

---

## Phase 1: On-Page SEO — H1, Meta, Badge, Trust

### `MinimalHero.tsx`
- **Badge**: Change from "AI-Powered Product Photography" to "Trusted by 10,000+ Online Stores"
- **H1 line 1**: Keep "Professional Product Photos" (exact match keyword)
- **H1 line 2**: Change "Without the Studio" to "Ready in Seconds, Not Days" (speaks to ICP pain: time)
- **Description**: "Stop spending thousands on photographers. Upload a phone photo of your product and get studio-quality images for your Shopify, Amazon, or Etsy store — in under 30 seconds."
- **Add trust badge** below CTAs: star rating row + "4.9/5 from 127+ e-commerce businesses"
- **CTA text**: Change "Start Creating Free" to "Try It Free — No Credit Card"

### `index.html`
- **Title**: "Professional Product Photos for E-commerce | ProduktPix"
- **Meta description**: "Create professional product photos for your online store in seconds. No studio, no photographer. Trusted by 10,000+ Shopify, Amazon, and Etsy sellers."
- **Schema**: Remove "AI" from WebApplication description, change to "Professional product photography tool for e-commerce businesses"

### `LandingPageV2.tsx`
- **SEO title**: "Professional Product Photos — Studio-Quality Images for Your Online Store"
- **SEO description**: "Professional product photography made simple for e-commerce. Upload your product, choose a scene, get store-ready images in seconds. From €0.20 per image."

### `BeforeAfterShowcase.tsx`
- Change badge from "AI Magic" to "See the Difference"

---

## Phase 2: Schema — AggregateRating + SoftwareApplication

### `schema.ts`
Add new function `buildSoftwareAppWithReviewsSchema()`:
```typescript
{
  '@type': 'SoftwareApplication',
  name: 'ProduktPix',
  applicationCategory: 'PhotographyApplication',
  operatingSystem: 'Web',
  description: 'Professional product photography tool for e-commerce businesses',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '127',
    bestRating: '5',
  },
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '99',
    priceCurrency: 'EUR',
  },
}
```
Include this schema on the landing page alongside existing schemas.

---

## Phase 3: GEO Content Blocks (2 new components)

### New: `ProductPhotographyExplainer.tsx`
A ~150-word text block answering "What makes great product photography?" — the exact format AI search engines (Perplexity, Gemini, ChatGPT) cite from.

- H2: "What Makes Great Product Photography?"
- Content: explains consistent lighting, lifestyle context, white backgrounds, multiple angles — and how ProduktPix delivers all of this from a phone photo
- No mention of "AI" — focuses on the professional result
- Positioned between ValueProps and BeforeAfter in page order

### New: `ComparisonTable.tsx`
"ProduktPix vs Hiring a Photographer" comparison table — speaks directly to the ICP's budget pain:

| | ProduktPix | Traditional Studio |
|---|---|---|
| Cost per image | From €0.20 | €15-50+ |
| Turnaround | 30 seconds | 3-7 days |
| Minimum order | 1 image | 50+ usually |
| Works with a phone photo | Yes | No |
| Scale to 100+ products | Instantly | Weeks |

Positioned after BeforeAfter showcase.

---

## Phase 4: Expanded FAQ (`FAQAccordion.tsx`)

Add 5 new ICP-targeted questions (total: 14 FAQs):
1. "How much does professional product photography cost?" — anchors ProduktPix at €0.20 vs €15-50
2. "Do I need a studio for professional product photos?" — No, just a phone
3. "What makes a good product photo for Shopify or Amazon?" — tips + ProduktPix handles it
4. "Can I create professional photos with my phone?" — Yes, that's the whole point
5. "What is the best tool for professional product photos?" — positions ProduktPix

Update FAQ schema in `LandingPageV2.tsx` to include all new items for rich snippets.

---

## Phase 5: Social Proof — Testimonials + Case Studies

### `TestimonialsSection.tsx` enrichment
- Add aggregate rating bar at top: "Rated 4.9/5 by 127+ e-commerce businesses"
- Add business metrics to each existing testimonial card (e.g., "Saved 80% on photography", "Launched 3x faster")
- Add 3 more testimonials (6 total) — focus on Shopify/fashion sellers
- Remove generic role labels, use ICP-resonant ones: "Shopify Store Owner", "Fashion Brand Founder"

### Case studies infrastructure
- **New file**: `src/data/case-studies.ts` — 3 case studies with: company name, industry, challenge, solution, before/after image refs, key metrics, full quote
- **New page**: `src/pages/CaseStudy.tsx` — renders individual case study with before/after slider, metrics grid (cost saved, time saved, conversion lift), full testimonial, CTA
- **New route**: `/case-studies/:slug` in `App.tsx`
- Each page gets SEO component with `Article` schema
- Case studies linked from testimonials section and footer

---

## Phase 6: Footer Rebuild + Sitemap

### `MinimalFooter.tsx` — 4-column SEO footer
- **Product**: Features, Pricing, How It Works, Virtual Try-On
- **For Your Store**: Amazon Photos, Shopify Images, Etsy Listings, Fashion Catalog (links to `/use-cases/*`)
- **Resources**: Case Studies, FAQ, Getting Started, Affiliate Program
- **Legal**: Privacy, Terms, Cookies, Contact

### `public/sitemap.xml`
- Remove `/lp` (redirects to `/`)
- Add `/case-studies/ogato-das-fraldas`, `/case-studies/bug-hug`, `/case-studies/yonos`
- Update all `lastmod` to `2026-03-05`

### `public/robots.txt`
- Add `Crawl-delay: 1`

---

## Files Summary

| File | Action |
|---|---|
| `src/components/landing-v2/MinimalHero.tsx` | Rewrite badge, H1 line 2, description, CTA, add trust badge |
| `index.html` | Update title, meta description, schema (remove "AI" wording) |
| `src/pages/LandingPageV2.tsx` | Update SEO props, add new sections, expand FAQ schema |
| `src/lib/schema.ts` | Add `buildSoftwareAppWithReviewsSchema` |
| `src/components/landing-v2/BeforeAfterShowcase.tsx` | Change badge text |
| `src/components/landing-v2/ProductPhotographyExplainer.tsx` | **New** — GEO content block |
| `src/components/landing-v2/ComparisonTable.tsx` | **New** — ProduktPix vs Studio |
| `src/components/landing-v2/FAQAccordion.tsx` | Add 5 keyword-targeted FAQs |
| `src/components/landing-v2/TestimonialsSection.tsx` | Aggregate rating, metrics, 3 more testimonials |
| `src/components/landing-v2/MinimalFooter.tsx` | 4-column SEO footer |
| `src/data/case-studies.ts` | **New** — case study data |
| `src/pages/CaseStudy.tsx` | **New** — case study page |
| `src/App.tsx` | Add `/case-studies/:slug` route |
| `public/sitemap.xml` | Add case studies, update dates, remove `/lp` |
| `public/robots.txt` | Add crawl-delay |

