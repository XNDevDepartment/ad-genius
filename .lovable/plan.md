# Redesign Pricing Page for Perceived Value

## Analysis: Why People Don't See the Value

The current pricing page has a fundamental problem: it lists **what you get** (credits, features) but never explains **what it's worth** or **what it replaces**. An SMB owner sees "80 credits for 29 euros" and has no context for whether that's expensive or cheap.

**Key psychological gaps:**

- No cost comparison against the alternative (hiring a photographer, renting a studio)
- No ROI framing (what do better product photos actually do for sales?)
- No "cost per image" anchored against real-world pricing
- Features are listed as technical specs, not business outcomes
- No social proof on the pricing page itself
- The credit system explanation is buried at the bottom
- No urgency or risk-reduction messaging near the CTA

## Redesigned Page Structure

The new pricing page follows the landing v2 visual style (clean cards with `rounded-2xl`, `bg-card border border-border`, `primary/10` accents, `max-w-6xl mx-auto`, generous `py-20 px-4` spacing) and is structured in a deliberate persuasion order:

### Section 1 -- Hero (Value-Anchored)

Clean centered hero matching the landing v2 gradient style. Instead of just "Choose Your Plan", the headline anchors against the real-world cost:

- Headline: "Professional Product Photos from 0.20 euros each"
- Subheadline: "Traditional photography costs 15-50 euros per image. Our AI gives you the same quality, instantly."
- Billing toggle (yearly default, "Save 2 months" badge)
- Trust chips: Free trial / No credit card / Cancel anytime

### Section 2 -- Plan Cards (Restructured for Value)

Three cards in the landing v2 card style. Each card is restructured to lead with **business value**, not technical specs:

**Card layout (top to bottom):**

1. Plan name + badge (Most Popular / Best Value)
2. "Best for..." one-liner (persona-focused)
3. Price with strikethrough (yearly) + annual total
4. **Value anchor**: "That's only 0.XX euros per image" (prominent, in primary color)
5. **Cost comparison callout**: "vs. 15-50 euros with a photographer"
6. Full-width CTA button
7. Separator
8. "What's included" checklist -- rewritten as **outcomes not features**:
  - Instead of "80 credits per month" -> "80 professional product images every month"
  - Instead of "Unlimited Scenarios" -> "Unlimited scene styles (lifestyle, studio, outdoor, seasonal...)"
  - Instead of "Team support" -> "Email support within 24h"
  - Instead of "Commercial usage" -> "Full commercial rights -- use anywhere"
  - Instead of "Priority + Live chat" -> "Priority response + live chat with our team"
  - Add for all plans: "AI Virtual Try-On for fashion"
  - Add for all plans: "Video generation (5s and 10s)"
  - Add for all plans: ""Complete Photoshoots for your products"

### Section 3 -- "Why It's Worth It" Value Props

Three-column grid (same style as ValuePropsSection on landing v2):

- **Save 90% vs. Traditional Photography**: "A single professional product shoot costs 500-2,000 euros. With ProduktPix, get hundreds of images for a fraction of the price."
- **Ready in Seconds, Not Days**: "No scheduling, no shipping samples, no waiting for edits. Upload and generate instantly."
- **Images That Sell**: "Professional product photos increase conversion rates by up to 3x. Better images = more revenue."

### Section 4 -- "What 1 Credit Gets You" (Visual)

Clean visual explainer (matching the landing v2 card style) showing what 1 credit produces:

- 1 Credit = 1 professional product image (any quality)
- 5 Credits = 1 five-second video ad
- 10 Credits = 1 ten-second video ad
- Credits roll over monthly

### Section 5 -- Social Proof

Reuse the same testimonial card style from the landing page TestimonialsSection. Show 2-3 customer quotes focused on ROI/value.

### Section 6 -- Comparison Table (Desktop Only)

Keep the existing comparison table but hidden on mobile (already the case).

### Section 7 -- FAQ (Accordion Style)

Replace the flat FAQ list with the landing v2 accordion component style. Add/update questions focused on value justification:

- "How does ProduktPix compare to hiring a photographer?"
- "What can I create with X credits?"
- "Do credits roll over?"
- Existing questions preserved

### Section 8 -- Final CTA

Full-width banner with "Start Creating Free" + "Book a Demo" buttons (same pattern as landing hero).

## Technical Details

### Files Changed


| File                       | Change                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Pricing.tsx`    | Full restructure of the page into the new section order. Reuse landing v2 visual patterns (rounded-2xl cards, primary/10 backgrounds, generous spacing). Add value-anchor sections, cost-comparison callouts, testimonials section, and accordion FAQ. Replace HeaderSection with MinimalHeader for unauthenticated users. |
| `src/i18n/locales/en.json` | Add new translation keys under `pricing.v2` namespace for all new copy (value headlines, cost comparisons, outcome-focused feature descriptions, new FAQ questions, CTA copy)                                                                                                                                              |
| `src/i18n/locales/pt.json` | Portuguese translations for all new keys                                                                                                                                                                                                                                                                                   |
| `src/i18n/locales/es.json` | Spanish translations for all new keys                                                                                                                                                                                                                                                                                      |
| `src/i18n/locales/fr.json` | French translations for all new keys                                                                                                                                                                                                                                                                                       |
| `src/i18n/locales/de.json` | German translations for all new keys                                                                                                                                                                                                                                                                                       |


### What Stays the Same

- Plan IDs, prices, and credit amounts (no business logic changes)
- Checkout flow (`handlePlanSelect`, Stripe integration)
- Billing toggle logic (yearly default)
- SEO metadata and tracking
- The comparison table data structure

### New Translation Keys (Sample -- EN)

```
pricing.v2.hero.title: "Professional Product Photos from €0.20 each"
pricing.v2.hero.subtitle: "Traditional photography costs €15-50 per image. Our AI gives you the same quality, instantly."
pricing.v2.plans.starter.bestFor: "Best for solo sellers and small shops"
pricing.v2.plans.plus.bestFor: "Best for growing brands and agencies"
pricing.v2.plans.pro.bestFor: "Best for high-volume catalogs and enterprises"
pricing.v2.vsPhotographer: "vs. €15-50 with a photographer"
pricing.v2.valueProps.save.title: "Save 90% vs. Traditional Photography"
pricing.v2.valueProps.save.description: "A single product shoot costs €500-2,000. Get hundreds of images for a fraction."
pricing.v2.valueProps.speed.title: "Ready in Seconds, Not Days"
pricing.v2.valueProps.speed.description: "No scheduling, no samples, no waiting. Upload and generate instantly."
pricing.v2.valueProps.results.title: "Images That Sell"
pricing.v2.valueProps.results.description: "Professional photos boost conversion rates by up to 3x."
pricing.v2.finalCta.title: "Ready to Transform Your Product Photography?"
pricing.v2.finalCta.subtitle: "Start with 10 free credits. No credit card required."
```

Plus outcome-focused feature rewrites and 5 additional FAQ entries across all 5 locale files.

### Visual Consistency with Landing V2

- Section spacing: `py-20 px-4`
- Container: `max-w-6xl mx-auto`
- Cards: `rounded-2xl bg-card border border-border`
- Highlighted card: `border-primary shadow-lg ring-1 ring-primary/20`
- Icons in colored circles: `w-14 h-14 rounded-xl bg-primary/10`
- Headings: `text-3xl md:text-4xl font-bold text-foreground`
- Subheadings: `text-lg text-muted-foreground`
- FAQ: Accordion with `rounded-xl px-6` items
- No gradient hero header -- replaced with clean light background matching landing v2