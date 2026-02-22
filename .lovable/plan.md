

# Fix: Landing Page Navigation Buttons Not Working

## Root Cause

The `AppLayout` component renders **two** `<Outlet />` components -- one for mobile and one for desktop. This causes `LandingPageV2` (and its sections with `id="how-it-works"`, `id="pricing"`, `id="faq"`) to render **twice** in the DOM.

When `MinimalHeader` calls `document.getElementById('how-it-works')`, it returns the **first match** -- the one inside the mobile container (`lg:hidden` / `display: none` on desktop). Calling `scrollIntoView` on a hidden element does nothing.

## Fix

Update the `scrollToSection` function in `MinimalHeader.tsx` to find the **visible** element instead of just the first one:

- Use `document.querySelectorAll` to get all elements with that ID
- Loop through and find the one that's actually visible (has a non-zero width)
- Scroll to that one

### File: `src/components/landing-v2/MinimalHeader.tsx`

Change the `scrollToSection` function from:

```typescript
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
```

To:

```typescript
const scrollToSection = (sectionId: string) => {
  const elements = document.querySelectorAll(`[id="${sectionId}"]`);
  for (const el of elements) {
    if ((el as HTMLElement).offsetWidth > 0) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }
};
```

This checks each matching element's visibility and scrolls to the one that's actually rendered on screen.

---

## Technical Details

| File | Change |
|---|---|
| `src/components/landing-v2/MinimalHeader.tsx` | Update `scrollToSection` to find visible element among duplicates |

**Why not fix AppLayout instead?** Removing the dual-Outlet pattern would be a larger refactor affecting the entire app layout. The targeted fix in MinimalHeader is safer and solves the immediate problem without risk of breaking other pages.

