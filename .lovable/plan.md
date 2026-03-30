

## Block Free Users from Image Animator + Update Edge Function

### Current State
- **Frontend**: Already correct — `canAccessVideos()` returns `!isFreeTier()`, so Starter/Founders/Plus/Pro all have access. Free users see the locked UI.
- **Edge Function**: Has NO Free tier check — a Free user could bypass the UI and call the API directly. The old Starter block is commented out (correctly). Need to add a Free tier server-side block.
- **Comment cleanup**: Line 138 says "All tiers except Starter" which is outdated.

### Changes

**File: `supabase/functions/kling-video/index.ts`** (lines 136–154)

1. Update comment from "All tiers except Starter" to "Free tier users cannot access videos"
2. Add a check: if `subscriber.subscription_tier === 'Free'`, return error with `upgrade_required: true`
3. Remove the commented-out Starter block (dead code cleanup)

```typescript
if (!isAdmin) {
  const { data: subscriber, error: subError } = await supabase
    .from('subscribers').select('subscription_tier')
    .eq('user_id', userId).single();
  if (subError || !subscriber) {
    return { success: false, error: 'Unable to verify subscription status.' };
  }
  // Free tier users cannot access video generation
  if (subscriber.subscription_tier === 'Free') {
    return {
      success: false,
      error: 'Video generation requires a paid plan. Please upgrade.',
      upgrade_required: true
    };
  }
}
```

### Files Modified
1. `supabase/functions/kling-video/index.ts` — add Free tier server-side block, clean up comments

