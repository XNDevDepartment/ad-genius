

## Replace HTML Prerender with Full Landing Page Content

### Summary
Replace the minimal SSR fallback in `index.html` (lines 148-171) with a complete static HTML replica of the LandingPageV2 content. This gives crawlers and slow-connection users a full representation of the page before React hydrates.

### What Changes

**File: `index.html`** (lines 148-171 — the `#root` div contents)

Replace the current sparse fallback with a full static HTML version mirroring every section of the landing page in order:

1. **Header** — Fixed top bar with ProduktPix text logo, nav links (How It Works, Pricing, FAQ), Sign In + Get Started links
2. **Hero** — "Trusted by 10,000+ Online Stores" badge, H1 ("Professional Product Photos / Ready in Seconds, Not Days"), description paragraph, two CTA links (Try It Free, Book a Demo), 4.9/5 trust line
3. **Use Cases Grid** — H2 "Built for Your Kind of Business", 6 cards (Clothing, Jewelry, Beauty, Furniture, Handmade, Food) with titles and descriptions
4. **Logo Marquee** — "Trusted by sellers on leading platforms" + platform names (Shopify, Amazon, Etsy, WooCommerce, BigCommerce, Magento) as text
5. **Value Props** — H2 "Why Businesses Choose ProduktPix", 3 cards (Save 90%, 30 Seconds, Increase Sales)
6. **Product Photography Explainer** — H2 "What Makes Great Product Photography?", long paragraph, 4 pillar badges
7. **Before/After** — H2 "From Simple Photo to Pro Shot", description text (images omitted — crawlers get the text)
8. **Comparison Table** — H2 "ProduktPix vs Hiring a Photographer", full 6-row HTML table with ProduktPix vs Traditional Studio columns
9. **Testimonials** — H2 "Loved by Business Owners", 6 testimonial cards with quotes, names, roles, companies, and metrics
10. **How It Works** — H2 "How It Works", 3 steps (Upload, AI Magic, Download & Sell)
11. **Pricing** — H2 "Simple, Transparent Pricing", 2 plan cards (Free €0 and Starter €29) with feature lists
12. **FAQ** — H2 "Frequently Asked Questions", all 14 Q&A pairs as `<details>/<summary>` elements
13. **Footer** — 4 link columns (Product, For Your Store, Resources, Legal) + copyright + tagline

All content uses inline styles matching the existing fallback pattern. The `<noscript>` block will also be updated with the same full content plus the JS-required notice.

### Technical Details

- All text is the English default (same as the `t()` fallback strings already in the components)
- Images are omitted (crawlers index text; images load after hydration)
- Links use real `<a href>` tags pointing to actual routes (`/signup`, `/signin`, `/pricing`, `/privacy`, etc.)
- The comparison table uses a real `<table>` element for semantic richness
- FAQ uses native `<details>/<summary>` for accordion behavior without JS
- Inline styles only — no external CSS dependency
- The entire block is still replaced by React on hydration (same mechanism as today)

### Files Modified
1. **`index.html`** — Replace SSR fallback content inside `#root` (lines 148-171)

