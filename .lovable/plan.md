

# Allow Starter Plan to Access Video Animator

## Overview
Currently, the `canAccessVideos()` function in `useCredits.tsx` explicitly blocks Starter tier users from accessing the Video Animator. This change removes that restriction so Starter users can use the feature.

## Change

**File:** `src/hooks/useCredits.tsx`

Update `canAccessVideos()` to no longer exclude the Starter tier. The check `tier !== 'Starter'` will be removed, allowing all tiers (Free, Starter, Founders, Plus, Pro) to access videos.

Similarly, update the `getVideoAccessMessage()` function to remove the Starter-specific denial message, and update the `ModuleSelection.tsx` locked logic if it references video access for Starter.

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useCredits.tsx` | Remove Starter exclusion from `canAccessVideos()` and update `getVideoAccessMessage()` |

