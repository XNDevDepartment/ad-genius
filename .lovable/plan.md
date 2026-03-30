

## Cache Subscription Tier in localStorage to Prevent False Redirects on Reload

### Problem
When a paid user reloads the Video Generator page, `subscriptionData` is initially `null` while the auth/subscription fetch completes. During this window, `canAccessVideos()` returns `false`, causing a redirect to `/pricing` and a destructive toast — even though the user has a valid paid plan.

### Solution
Store the subscription tier in `localStorage` whenever it's fetched. On pages like Video Generator, check `localStorage` first before redirecting — only redirect if the cached tier is explicitly `'Free'` (or missing entirely and the async check also confirms free).

### Changes

#### 1. `src/contexts/AuthContext.tsx` — Cache tier on fetch
After `setSubscriptionData(newSubscriptionData)` (line 81), add:
```typescript
localStorage.setItem('ppx_subscription_tier', newSubscriptionData.subscription_tier);
```
On sign-out (line 289), already calls `localStorage.clear()` which removes it automatically.

#### 2. `src/hooks/useCredits.tsx` — Update `canAccessVideos` to accept cached tier
Add a new function `getCachedTier()`:
```typescript
const getCachedTier = () => localStorage.getItem('ppx_subscription_tier');
```
Update `canAccessVideos`:
```typescript
const canAccessVideos = (): boolean => {
  if (!subscriptionData) {
    const cached = getCachedTier();
    return cached !== null && cached !== 'Free';
  }
  return !isFreeTier();
};
```

#### 3. `src/pages/VideoGenerator.tsx` — Guard against premature redirect
Update the access-check `useEffect` (lines 72-91): only redirect if subscription data has actually loaded (not null) AND user is free tier. While loading, do nothing.
```typescript
useEffect(() => {
  if (!user) return;
  if (isAdminLoading) return;
  if (isAdmin) return;
  
  // Wait for subscription data to load; use cached tier to avoid flash redirect
  const cachedTier = localStorage.getItem('ppx_subscription_tier');
  if (!subscriptionData) {
    // If cached tier exists and is not Free, trust it — don't redirect
    if (cachedTier && cachedTier !== 'Free') return;
    // If no cache, wait for data to load
    if (!cachedTier) return;
  }
  
  if (!canAccessVideos()) {
    toast({ title: t('videoGenerator.upgradeRequired'), description: getVideoAccessMessage(), variant: "destructive" });
    setTimeout(() => navigate('/pricing'), 2000);
  }
}, [user, isAdmin, isAdminLoading, canAccessVideos, subscriptionData, navigate, toast, getVideoAccessMessage]);
```

Also update the render guard (line 520) to respect cached tier while loading:
```typescript
const cachedTier = localStorage.getItem('ppx_subscription_tier');
const showAccessDenied = !user || (!isAdminLoading && !isAdmin && !canAccessVideos() && (subscriptionData || !cachedTier || cachedTier === 'Free'));
```

### Files Modified
1. `src/contexts/AuthContext.tsx` — persist tier to localStorage on fetch
2. `src/hooks/useCredits.tsx` — `canAccessVideos` falls back to cached tier
3. `src/pages/VideoGenerator.tsx` — prevent premature redirect using cached tier

