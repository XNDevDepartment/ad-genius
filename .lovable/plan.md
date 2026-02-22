

# Redesign: Promo 1MES Landing Page

## Overview

Replace the current minimal promo card at `/promo/1mes` with a full persuasion-rich landing page, matching the style of the Pricing page and Landing Page V2. The page will have multiple sections that clearly communicate the value of the offer, showcase use cases with screenshot placeholders, and include real client testimonials.

## Page Structure (Top to Bottom)

### Section 1: Hero with Offer
- Badge: "Oferta Exclusiva - Tempo Limitado"
- Headline: "Primeiro Mes por 9.99 EUR" with strikethrough of 29 EUR
- Subtitle explaining this is the Starter plan at 66% off
- Primary CTA button ("Ativar Oferta") + trust chips (cancel anytime, auto-applied code)
- Same checkout logic as current page (promoCode: '1MES')

### Section 2: What You Get (Visual Feature Grid)
- 4 cards in a 2x2 grid (mobile: stacked), each with:
  - Icon + title + description
  - A placeholder `<img>` area (300x200 approx) where you can later drop in screenshots
- Cards: (1) UGC Product Photos, (2) Video Generation, (3) Fashion Try-On, (4) Bulk Background Swap
- Each card has a `src="/placeholder.svg"` that you can replace with real screenshots

### Section 3: Before/After Showcase
- Reuse the existing `BeforeAfterShowcase` component (already built with Sanjo images)

### Section 4: Use Cases Grid
- Reuse the existing `UseCasesGrid` component (Clothing, Jewelry, Beauty, Home, Handmade, Food)

### Section 5: What 1 Credit Gets You
- Same "credit explainer" pattern from the Pricing page (1 credit = 1 image, 5 credits = 5s video, etc.)
- Clarifies that 35 credits = 35 professional images

### Section 6: Client Testimonials
- Reuse the existing `TestimonialsSection` component (Andreia, Sofia, Luis)

### Section 7: FAQ (Promo-Specific)
- 4-5 questions: "What happens after the first month?", "Can I cancel?", "How many images can I create?", "What is a credit?", "Is there a contract?"
- Uses the Accordion component

### Section 8: Final CTA
- Repeated pricing card with CTA button
- Trust line: "Cancel anytime, no contract, promo applied automatically"

### Section 9: Footer
- Reuse `MinimalFooter` component

## Navigation
- `MinimalHeader` at the top for unauthenticated users (same as Pricing page)
- Back arrow to home for authenticated users

## Technical Details

### Files Changed

| File | Change |
|---|---|
| `src/pages/Promo1Mes.tsx` | Full rewrite with multi-section layout, screenshot placeholders, reused landing components |

### No new components needed
All section components already exist (`BeforeAfterShowcase`, `UseCasesGrid`, `TestimonialsSection`, `MinimalHeader`, `MinimalFooter`). The feature grid and FAQ are built inline since they're promo-specific.

### No routing changes
The route `/promo/1mes` already exists in `App.tsx`.

### Screenshot Placeholders
Each use-case card will have an `<img>` element with `src="/placeholder.svg"` and a comment like `{/* Replace with actual screenshot */}`. You can swap these with real images later by importing them or using URLs.

### Checkout Logic
Preserved exactly as-is: `promoCode: '1MES'`, `planId: 'starter'`, redirect to Stripe, toast on error.

### Styling
Follows the Landing V2 / Pricing page design tokens: `rounded-2xl` cards, `primary/10` accent backgrounds, gradient text for the headline, `max-w-6xl` container, consistent spacing (`py-20 px-4`).

