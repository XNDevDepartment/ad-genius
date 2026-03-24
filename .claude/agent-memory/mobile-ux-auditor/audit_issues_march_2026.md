---
name: Mobile UX Audit Issues — March 2026
description: Prioritized list of mobile UX issues found in the March 2026 audit, with file paths and severity
type: project
---

Audit conducted: 2026-03-24. Issues below are ordered by severity.

## CRITICAL

1. **Mobile Floating Action Panel z-index collision with BottomTabBar** (CreateUGCGeminiBase.tsx line 1497)
   - Panel uses `bottom-[10px]` and `z-[20]`, BottomTabBar uses `z-50` and is ~60px tall
   - The generate button is HIDDEN BEHIND the BottomTabBar on mobile
   - Fix: change `bottom-[10px]` to `bottom-[72px]` (tabbar height + safe area)

2. **StickyUpgradeBar overlaps BottomTabBar** (StickyUpgradeBar.tsx line 28)
   - Uses `bottom-0 z-40`, BottomTabBar is `z-50` and fixed bottom
   - On mobile the upgrade bar renders at bottom-0 but IS behind the tab bar — the bar is invisible/inaccessible
   - Fix: raise to `bottom-[60px]` or `bottom-16`

3. **BottomTabBar exclusion bug** (AppLayout.tsx line 46)
   - Condition: `location.pathname !== '/create/ugc' && location.pathname !== '/create/ugc'`
   - Both conditions are IDENTICAL — the tab bar is never hidden on `/create/ugc`. The intent was probably `/create/ugc` and `/create/ugc-v3`
   - Fix: change second condition to `/create/ugc-v3`

## HIGH

4. **Library image action buttons are hover-only** (ImageLibraryGrid.tsx lines 320-437)
   - All action buttons (Download, Delete, Edit, Open, Copy) use `opacity-0 group-hover:opacity-100`
   - On mobile there is no hover state — these actions are completely inaccessible on touch
   - Fix: Always show action buttons on mobile, or add long-press gesture, or use a bottom sheet on tap

5. **ImageLibraryGrid 1-column layout on mobile is too wide for cards** (ImageLibraryGrid.tsx line 260)
   - Grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5`
   - On 375px screens, 1 column with `gap-0.5` creates full-width images — acceptable, but the 0.5 gap is near-invisible and the group-hover action overlay is inaccessible (see issue #4)

6. **NavigationHeader touch targets below 44px** (NavigationHeader.tsx lines 48-72)
   - Pricing button: `min-h-[24px] p-3` — 24px min height is well below the 44px requirement
   - SignIn button: `min-h-[24px] p-4` — same problem
   - LogIn icon button: `min-h-[24px] p-2` — even worse, likely ~32px actual height
   - Fix: change all to `min-h-[44px]`

7. **Auth form inputs missing inputmode attributes** (AuthModal.tsx)
   - Email input: has `type="email"` which is correct, but no `autocomplete="email"`
   - Phone input: has `type="tel"` which is correct
   - Password inputs have no `autocomplete` attributes (should be `autocomplete="current-password"` / `autocomplete="new-password"`)
   - These omissions cause poor mobile keyboard UX and prevent password manager autofill

8. **ModuleSelection page: back button is too small** (ModuleSelection.tsx line 144)
   - Back button uses `h-10 w-10` — this is 40px, below the 44px minimum
   - Fix: change to `h-11 w-11` or `min-h-[44px] min-w-[44px]`

9. **Library tabs overflow on small screens** (LibraryOld.tsx lines 188-205)
   - TabsList has 5 tabs: All, UGC, Outfit Swap, Bulk Background, Source Images
   - On 375px screens these tabs will overflow or wrap awkwardly
   - `TabsList className="flex-wrap h-auto"` — wrapping is enabled but tab labels are long
   - Fix: Shorten tab labels on mobile using responsive text or abbreviations

## MEDIUM

10. **Pricing hero section py-20 is excessive on mobile** (Pricing.tsx line 147)
    - `py-20` = 80px top and bottom padding — burns precious vertical space on mobile
    - Fix: `py-10 md:py-20`

11. **Account page grid collapses but has no mobile-specific back navigation from nested sections** (Account.tsx)
    - When drilling into a section (e.g. billing), the back button is mobile-only (line 271)
    - But the desktop layout at lg: also renders the back button (line 295) — this is a duplication
    - More importantly: on mobile the AccountPanel grid uses `grid gap-8 lg:grid-cols-5` which renders as single column on mobile — this is correct, but the 8-unit gap (32px) is large on mobile

12. **CreateUGCGeminiBase: Settings button hardcoded Portuguese** (SettingsSheet.tsx line 53)
    - `Definições` is hardcoded instead of using t() — this is an i18n bug that affects all locales

13. **Library component card header actions overflow on small screens** (LibraryOld.tsx lines 155-183)
    - The card header has: title + button row with up to 3 buttons (Select, Import from Shopify, Upload Images)
    - On narrow mobile these buttons will overflow or wrap outside the card boundary
    - `flex items-center justify-between mr-7` — the `mr-7` is suspicious and may cause alignment issues

14. **Index page hero section pb is not accounting for floating panel** (Index.tsx)
    - The `container-responsive px-4 py-8` container doesn't add extra bottom padding
    - If StickyUpgradeBar appears, it overlaps content

15. **GeneratedImagesRows action buttons: text hidden on mobile** (GeneratedImagesRows.tsx lines 140-205)
    - Action buttons use `span.hidden.sm:inline` for all labels — on mobile only icons show
    - This is acceptable for experienced users but reduces discoverability for new mobile users
    - Borderline issue, not critical

## LOW

16. **prefers-reduced-motion not respected in animations**
    - Framer Motion is used but no global useReducedMotion() check found in NavigationHeader, Index page hero, or AppSidebar transitions
    - The spring animation `transition-spring` in index.css doesn't check `@media (prefers-reduced-motion: reduce)`

17. **BottomTabBar max-w-lg container doesn't fill full width on large phones**
    - `max-w-lg mx-auto` constrains the tab bar to 512px on larger phones like iPhone Pro Max (430px viewport)
    - On a 430px viewport, max-w-lg (512px) means the tab bar fills the screen — this is actually fine

18. **CookieConsent positioning not checked** — not audited in this pass

**Why these matter:** The hover-only library actions (#4) and the generate button collision (#1) are the most impactful mobile blockers. Users on phones literally cannot download their generated images from the library without first opening on a new tab.
