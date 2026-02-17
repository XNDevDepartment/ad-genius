

# Fix: Bump Cache Version to Force Refresh

## Problem
The video access fix is deployed, but users are seeing the **old cached version** of the app. The cache-busting mechanism in `src/utils/cacheCheck.ts` only forces a refresh when `APP_VERSION` changes -- but it was never incremented after the Starter video restriction was removed.

Users who already have version `3.0.1` stored in localStorage will **never reload** to get the updated code.

## Fix

**File:** `src/utils/cacheCheck.ts`

Bump `APP_VERSION` from `'3.0.1'` to `'3.0.2'`.

This will cause all returning users to:
1. Detect a version mismatch on next visit
2. Clear localStorage and sessionStorage
3. Hard-reload to fetch fresh JS bundles (with the corrected `canAccessVideos()` logic)

| File | Change |
|---|---|
| `src/utils/cacheCheck.ts` | Change `APP_VERSION` from `'3.0.1'` to `'3.0.2'` |

After this change, **publish again** so the version bump reaches the live site.

