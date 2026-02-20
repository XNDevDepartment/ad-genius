
# Align Pricing Page Visual Style with Landing Page V2

## Current Issues

The pricing page uses similar spacing and layout but diverges from the landing v2 visual language in several key areas:

| Element | Landing V2 | Pricing (Current) |
|---|---|---|
| Hero background | Subtle gradient (`from-primary/5 via-transparent to-transparent`) | Plain white, no gradient |
| Hero headline | Gradient text on second line (`bg-gradient-to-r from-primary ... text-transparent`) | Plain text, no gradient |
| Hero badge | Pulsing dot badge (`rounded-full bg-primary/10 border-primary/20`) | None |
| CTA buttons | `rounded-full` with `shadow-lg shadow-primary/25` | Standard rectangular buttons |
| Header spacing | `pt-16` for fixed header | `pt-32` (too much whitespace) |
| FAQ accordion | `space-y-4`, `data-[state=open]:shadow-lg`, `py-5` trigger padding | `space-y-3`, `data-[state=open]:shadow-sm`, default trigger padding |
| Post-FAQ block | "Still have questions?" contact card | None |
| Final CTA buttons | `rounded-full` with shadow | Standard rectangular |
| Footer | `MinimalFooter` component | No footer at all |
| Page structure | Wrapped in `<main className="pt-16">` | Sections are loose in a div |

## Changes

All changes are in a single file: `src/pages/Pricing.tsx`

### 1. Hero section -- add gradient background and badge
- Add the same `bg-gradient-to-b from-primary/5 via-transparent to-transparent` overlay div
- Add the pulsing badge above the headline (same markup as MinimalHero)
- Apply gradient text to "from 0.20 euros each" portion of the headline
- Fix header padding from `pt-32` to `pt-16`

### 2. CTA buttons -- use rounded-full with shadow
- Plan card CTAs: add `rounded-full` class
- Popular plan CTA: add `shadow-lg shadow-primary/25`
- Final CTA section buttons: add `rounded-full shadow-lg shadow-primary/25` (primary) and `rounded-full` (outline)

### 3. FAQ accordion -- match landing v2 exactly
- Change `space-y-3` to `space-y-4`
- Change `data-[state=open]:shadow-sm` to `data-[state=open]:shadow-lg transition-shadow`
- Adjust trigger padding to `py-5`
- Add the "Still have questions?" contact card below the accordion (same markup as FAQAccordion component)

### 4. Add MinimalFooter
- Import and render `MinimalFooter` at the bottom of the page

### 5. Wrap content in main tag
- Add `<main className="pt-16">` wrapper after MinimalHeader (when unauthenticated) to match landing page structure

## Files Changed

| File | Change |
|---|---|
| `src/pages/Pricing.tsx` | Visual alignment: hero gradient + badge, rounded-full CTAs, FAQ style tweaks, add footer |

No new dependencies or translation keys needed -- this is purely a visual/CSS alignment.
