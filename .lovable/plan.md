

# Two Changes: Hide Header for Logged-in Users + Add Promo Banner

## 1. Hide MinimalHeader on Promo3Meses when user is logged in

The `Promo3Meses` page already has access to `useAuth()`. Conditionally render `<MinimalHeader />` only when there is no authenticated user.

### `src/pages/Promo3Meses.tsx` (line 153)

Change:
```tsx
<MinimalHeader />
```
To:
```tsx
{!user && <MinimalHeader />}
```

And adjust `pt-16` on `<main>` to be conditional too:
```tsx
<main className={user ? "pt-4" : "pt-16"}>
```

## 2. Add a dismissible promo banner to the app for logged-in users

Create a new `PromoBanner3Meses` component that:
- Only shows for authenticated users on the **Free** tier
- Is dismissible (persisted via `sessionStorage`)
- Has a gradient background with a CTA linking to `/promo/3meses`
- Text: "Oferta Exclusiva — Starter por €19.99/mês durante 3 meses" + "Ver Oferta" button
- Renders at the top of the app layout (both mobile and desktop)

### New file: `src/components/PromoBanner3Meses.tsx`

A slim top banner (similar to `AnnouncementBanner`) with:
- Gradient background (`from-primary via-purple-600 to-pink-600`)
- Sparkles icon + promo text + CTA button + dismiss X
- Uses `useCredits()` to check tier === "Free"
- Uses `sessionStorage` key `promo_3meses_banner_dismissed`

### `src/components/AppLayout.tsx`

Import and render `<PromoBanner3Meses />` in both the mobile and desktop sections, above the main content, for authenticated users.

### `src/pages/Index.tsx`

Also render the banner for the dashboard view (authenticated home), or rely on AppLayout placement.

