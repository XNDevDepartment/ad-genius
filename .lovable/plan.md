
## Fix: Bulk Background Photoshoot (Product Views) Timing Out

### Root Cause

The `processProductViews` action generates 3 Gemini images **sequentially within a single edge function invocation**. Each Gemini call takes 30-60+ seconds, totaling 90-180s. The edge function has a ~150s timeout, so it crashes silently before completing — leaving the record stuck at `progress: 0` with no error message. The modal then shows the processing spinner forever.

Evidence: The most recent product view (`933ee740`) was created at 13:37, started processing immediately, but stayed at progress 0 until a recovery job marked it as failed at 13:59 (~22 min later). No error was recorded because the function was killed by the timeout before reaching the error-handling code.

### Fix: Process Each View as a Separate Edge Function Call

Split `processProductViews` into a dispatcher + per-view worker pattern:

**`supabase/functions/bulk-background/index.ts`**

1. **Modify `processProductViews`** to become a dispatcher:
   - Set status to "processing"
   - For each selected view (macro, environment, angle), fire a separate self-invocation with a new action `processSingleView`
   - Return immediately

2. **Add `processSingleView` action** (service-role only):
   - Takes `productViewsId` and `viewType`
   - Generates just ONE Gemini image (well within timeout)
   - Uploads to storage, updates the corresponding `_url` and `_storage_path` columns
   - After completing, checks if all views are done → if so, sets status to "completed"

3. **Add better error handling**: If a view fails, set its error in metadata and still check for overall completion.

### Why This Fixes It

Each view generation runs in its own edge function invocation (~30-60s each), well within the 150s timeout. Even if one view fails, the others can still complete. The record won't get stuck in "processing" forever.

### Files

| File | Action |
|------|--------|
| `supabase/functions/bulk-background/index.ts` | Refactor `processProductViews` into dispatcher + `processSingleView` worker |
