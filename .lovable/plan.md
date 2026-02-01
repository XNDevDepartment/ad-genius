

## Dedicated Promo Landing Page: `/promo/first-month`

### Overview
Create a new landing page that automatically redirects users to Stripe checkout with the `ONB1ST` promo code pre-applied (€19.99 first month for Starter plan).

---

### Step 1: Fix Build Errors (Required First)

Before creating the new page, we need to fix 3 TypeScript errors in edge functions:

| File | Error | Fix |
|------|-------|-----|
| `supabase/functions/outfit-creator/index.ts` | `EdgeRuntime` not defined | Remove `EdgeRuntime.waitUntil()` wrapper, use standard async pattern |
| `supabase/functions/outfit-swap/index.ts` | `EdgeRuntime` not defined | Remove `EdgeRuntime.waitUntil()` wrapper, use standard async pattern |
| `supabase/functions/recover-outfit-swap-results/index.ts` | Typo `recoveredDetails` | Change to `recoveryDetails` (the declared variable name) |

**Note:** `EdgeRuntime.waitUntil()` is a Vercel-specific API that doesn't exist in Deno/Supabase. The functions will work without it since the fetch calls are already async.

---

### Step 2: Create New Promo Page

**New file:** `src/pages/PromoFirstMonth.tsx`

This page will:
1. Display the offer details (€19.99 first month for Starter)
2. Auto-trigger checkout with `promoCode: 'ONB1ST'` when user clicks CTA
3. If user is not authenticated, redirect to `/account` first
4. Track Meta Pixel events for analytics

**Design:** Simple, focused landing page similar to `ChristmasPromo.tsx` but tailored for email campaigns:
- Clean hero with discount highlight
- Clear value proposition (€19.99 instead of €29)
- Single prominent CTA button
- No distractions - one action only

```typescript
// Key checkout logic
const handleGetOffer = async () => {
  if (!user) {
    navigate('/account');
    return;
  }
  
  const { data } = await supabase.functions.invoke('create-checkout', {
    body: { 
      planId: 'starter',
      interval: 'month',
      promoCode: 'ONB1ST'  // Auto-applied!
    }
  });
  
  if (data?.url) {
    window.location.href = data.url;
  }
};
```

---

### Step 3: Add Route to App.tsx

Add the new route under `/promo/first-month`:

```typescript
const PromoFirstMonth = lazyWithRetry(() => import("./pages/PromoFirstMonth"));

// In Routes:
<Route path="/promo/first-month" element={
  <ErrorBoundaryWithReset>
    <Suspense fallback={<LoadingFallback />}>
      <PromoFirstMonth />
    </Suspense>
  </ErrorBoundaryWithReset>
} />
```

---

### Page Content (Portuguese)

**Headline:** "Primeiro Mês por €19.99"  
**Subtitle:** "Oferta exclusiva para novos subscritores"  
**Regular price:** ~~€29/mês~~  
**Promo price:** €19.99 (primeiro mês)  
**CTA:** "Ativar Oferta"

**Features to highlight:**
- 80 créditos mensais
- Imagens UGC ilimitadas
- Geração de vídeos incluída
- Todos os cenários
- Uso comercial

---

### Email Link

After implementation, the link for your email will be:

```
https://produktpix.com/promo/first-month
```

This link will:
1. Show the promo page with offer details
2. When user clicks "Ativar Oferta", redirect to Stripe with ONB1ST discount pre-applied
3. If not logged in, redirect to account page first (then back to promo after auth)

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/PromoFirstMonth.tsx` | Dedicated promo landing page |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/promo/first-month` route |
| `supabase/functions/outfit-creator/index.ts` | Fix EdgeRuntime error |
| `supabase/functions/outfit-swap/index.ts` | Fix EdgeRuntime error |
| `supabase/functions/recover-outfit-swap-results/index.ts` | Fix typo |

