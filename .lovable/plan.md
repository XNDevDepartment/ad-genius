
# Pricing Page Redesign (ProduktPix Palette) + AppSidebar Fix

## Part 1: Fix AppSidebar Build Error

**File:** `src/components/AppSidebar.tsx`

The `mainNavItems` array only has active items without `adminOnly` (it exists in commented-out items). TypeScript cannot infer the property.

**Fix:** Add `adminOnly?: boolean` to the type by adding a type annotation:

```typescript
const mainNavItems: Array<{ id: string; icon: any; path: string; primary?: boolean; adminOnly?: boolean }> = [
  ...
];
```

---

## Part 2: Pricing Page Redesign (Higgsfield Structure, ProduktPix Colors)

Restructure the desktop pricing cards to follow the Higgsfield layout pattern while using ProduktPix's existing design tokens (primary blue-purple, accent purple, gradients). No lime/green imports.

### Desktop Card Redesign

Each card follows this structure:

```text
+----------------------------------+
|  Plan Name        [Most Popular] |
|  Short description               |
|                                  |
|  EUR49 /month                    |
|  EUR0.24 per image               |
|                                  |
|  [ Subscribe to Plus ]           |
|                                  |
|  --------------------------------|
|                                  |
|  What's included                 |
|  [check] 200 credits/month       |
|  [check] 3 images simultaneously |
|  [check] Unlimited scenarios     |
|  [check] Priority support        |
|  [check] Commercial usage        |
+----------------------------------+
```

### Styling (using existing ProduktPix palette)

| Element | Style |
|---|---|
| Section background | `bg-background` (existing, clean) |
| Card background | `bg-card border border-border` with subtle hover shadow |
| Popular card | `border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20` |
| Popular badge | `bg-primary text-primary-foreground` (existing blue-purple) |
| Price text | `text-foreground` large, bold |
| Cost per image | `text-primary` (blue-purple accent) |
| CTA (popular) | `bg-gradient-primary text-primary-foreground` (existing gradient) |
| CTA (others) | `variant="outline"` with `border-border hover:bg-muted` |
| Feature checkmarks | `text-primary` (blue-purple, NOT lime/green) |
| Divider | `border-t border-border` |
| "What's included" label | `text-sm font-semibold text-muted-foreground uppercase tracking-wide` |

### Changes to Desktop Cards

1. Remove icon circles from card tops
2. Reorder: name + badge -> description -> price (large) -> cost per image -> CTA -> divider -> "What's included" + feature list
3. Popular card gets gradient CTA, others get outline
4. Add "What's included" header above feature list with a `Separator` divider
5. Cards get equal height with `flex flex-col` and feature list in `flex-1`

### Mobile Cards (same structure update)

Apply the same content reorder to the existing swipeable carousel cards:
- Name + badge, description, price, cost per image, CTA, divider, features
- Same color scheme (no lime)

### Comparison Table, Credit System, FAQ

- No structural changes, keep as-is
- They already use ProduktPix palette

### Technical Changes

| File | Change |
|---|---|
| `src/components/AppSidebar.tsx` | Add type annotation to `mainNavItems` array to include `adminOnly?: boolean` |
| `src/pages/Pricing.tsx` | Restructure desktop and mobile card content order; remove icon circles; add "What's included" divider section; update CTA styles (gradient for popular, outline for others); use `text-primary` for checkmarks |

### No new dependencies

All styling uses existing Tailwind classes and ProduktPix design tokens.
