

## Fix: Photoshoot Modal Getting Stuck Forever

### Problem
Two issues cause the modal to get stuck:

1. **No timeout/failure detection**: If the edge function crashes silently (timeout, OOM, etc.), the DB record stays in `processing` status forever. The modal polls indefinitely with no escape.

2. **Polling doesn't check for `canceled` status**: The polling `useEffect` only stops for `completed` or `failed`, not `canceled`.

### Changes

**`src/components/ProductViewsModal.tsx`**

1. Add a **stale detection** mechanism: If the `productViews` record has been in `processing` status for more than 3 minutes without any `updated_at` change, automatically mark it as failed and show an error with a "Retry" option.

2. Add `canceled` status to polling exit conditions.

3. Add a **timeout indicator** — after 2 minutes of processing, show a warning message ("Taking longer than expected...") and after 3 minutes auto-fail with retry option.

4. Add a "Cancel" button visible during processing so the user can exit gracefully.

**`supabase/functions/bulk-background/index.ts`**

5. Add console.log statements to `processProductViews` and `processSingleView` so failures are actually visible in logs (currently the function may crash before any log statement runs).

6. Add a **recovery check** in `getProductViewsByResult`: if the returned record has been in `processing` for >5 minutes, auto-mark it as `failed` before returning — this prevents the modal from loading old stuck records.

