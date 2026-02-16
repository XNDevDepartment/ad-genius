
# Remake Mobile Home Screen

## Overview
Reorganize the authenticated mobile home screen to be more action-oriented: show credits in the top bar, replace the activity/stats section with the first 4 module cards, move the promo offer above the hero section, and add a "Discover Possibilities" button linking to the full module selection page.

## Changes

### 1. NavigationHeader (`src/components/NavigationHeader.tsx`)
- When the user is logged in, add a **credits badge** next to the ThemeToggle showing remaining credits (e.g., a small pill with a coin icon and the number)
- Import `useCredits` hook to get `remainingCredits`

### 2. Index Page - Mobile Layout (`src/pages/Index.tsx`)
Restructure the mobile-only authenticated layout (the section inside `<OnboardingGuard>`):

**New order (mobile only, using `lg:hidden`):**
1. **Promo offer banner** (moved from below stats to the very top, before the hero)
2. **Hero "Create Images" section** (the gradient card with title + CTA button, keep as-is)
3. **First 4 module cards** in a 2x2 grid (replacing the UserStatsPanel which only showed credits on mobile anyway -- credits now in header)
4. **"Discover Possibilities" button** linking to `/create` (the full ModuleSelection page)
5. **EmbeddedLibrary** (recent images, unchanged)

Desktop layout remains unchanged.

### 3. UserStatsPanel (`src/components/UserStatsPanel.tsx`)
- Hide the entire component on mobile (`hidden lg:block` wrapper) since credits move to the header and the stats grid was already hidden on mobile

### Files Modified

| File | Change |
|---|---|
| `src/components/NavigationHeader.tsx` | Add credits badge next to theme toggle for authenticated users |
| `src/pages/Index.tsx` | Reorder mobile layout: promo on top, hero, module grid (first 4), discover button, library |
| `src/components/UserStatsPanel.tsx` | Hide on mobile with `hidden lg:block` |

### Technical Details

**Credits in header**: Use `useCredits()` hook to get `getRemainingCredits()`. Display as a small badge like:
```
[Coin icon] 42
```

**Module cards on home**: Import the same workflow data from ModuleSelection (the first 4 non-disabled items: UGC Creator, Video Creator, Outfit Swap, Bulk Background). Render them in a compact 2-column grid with icon + title only (matching the existing mobile card style from ModuleSelection).

**"Discover Possibilities" button**: A full-width outlined button below the module grid that navigates to `/create`.

**Promo banner**: The existing free-tier promo or "get more credits" button, moved above the hero gradient card on mobile only.
