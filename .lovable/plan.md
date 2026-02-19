
# Add Sign-In Button and Fix Navigation Bar

## Issues Found

1. **Missing Sign-In button**: The `MinimalHeader` only has a "Get Started" (signup) button. There is no way for existing users to sign in from the landing page.

2. **Navigation conflict on mobile**: On the `/` route, `AppLayout` renders the old `NavigationHeader` on mobile (which has Sign In, Pricing, etc.), but it sits above the `MinimalHeader` from `LandingPageV2` -- causing a double header and potential scroll issues. On desktop, the public layout renders without the old header, so only `MinimalHeader` shows.

## Changes

### 1. Add Sign-In button to MinimalHeader

**File:** `src/components/landing-v2/MinimalHeader.tsx`

- Add a "Sign In" button (outline variant) next to the existing "Get Started" button
- On mobile, show both buttons but keep them compact (icon-only sign-in on small screens)
- The Sign In button navigates to `/signin`

The right side of the header will become:
```
[Sign In (outline)]  [Get Started (primary)]
```

### 2. Hide old NavigationHeader on landing page for non-authenticated users

**File:** `src/components/AppLayout.tsx`

The old `NavigationHeader` shows on mobile when the path is `/`. Since the landing page now has its own `MinimalHeader`, the old one should only show for authenticated users. Update line 41 from:

```
{showHeader && <NavigationHeader />}
```
to:
```
{showHeader && user && <NavigationHeader />}
```

This prevents a double navigation bar and ensures the `MinimalHeader` scroll-to-section buttons work correctly (no competing fixed headers).

## Technical Details

| File | Change |
|---|---|
| `src/components/landing-v2/MinimalHeader.tsx` | Add Sign In button (outline) linking to `/signin` |
| `src/components/AppLayout.tsx` | Only show old `NavigationHeader` for authenticated users on mobile |

No new dependencies or translation keys needed -- the sign-in text can use the existing `common.signIn` key or a simple fallback.
