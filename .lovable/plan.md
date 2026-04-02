
## Fix 4K UGC Generation Getting Stuck

### What I found
- The issue is not the 4K selector or credit check.
- `/create/ugc` uses `CreateUGCGeminiBase` with `modelVersion="gemini"`, which calls `supabase/functions/ugc-gemini`.
- Recent database evidence shows:
  - 4K + `source` completed successfully.
  - 2K + `4:5` completed successfully.
  - 4K + `4:5` failed once, and the latest 4K + `4:5` job (`b044eb20-44a7-4661-96be-35305f1933bf`) is stuck in `processing`.
- That means the failure pattern is specific to the server-side Gemini request for 4K with non-source aspect ratio, especially `4:5`.

### Root cause
The edge worker is likely timing out or getting killed while waiting for Gemini on the native request combo:
- `imageConfig.aspectRatio = '4:5'`
- `imageConfig.imageSize = '4K'`

When that happens:
- the job is already marked `processing`
- the function dies before it can mark the job `failed`
- the frontend keeps waiting forever because current recovery only really helps `queued` jobs, not stale `processing` jobs

### Implementation plan
1. **Add a safe 4K fallback in the UGC edge functions**
   - Update `supabase/functions/ugc-gemini/index.ts`
   - Update `supabase/functions/ugc-gemini-v3/index.ts`
   - For 4K jobs with non-source aspect ratios (at minimum `4:5`, and ideally all non-`1:1` native aspect ratios), stop using the problematic native `4K + aspectRatio` combo.
   - Use a compatible request path, then reuse the existing crop/finalization logic so the output still matches the selected ratio.
   - Add explicit logs showing when fallback mode is used.

2. **Prevent permanent stuck jobs**
   - Add a stricter per-image timeout path inside generation so the worker fails cleanly before the platform kills it.
   - Ensure the catch/finalization path always:
     - marks the job `failed`
     - stores a useful error
     - refunds unused credits

3. **Fix stale `processing` recovery**
   - Improve recovery in both UGC functions so stale `processing` jobs are not left hanging forever.
   - Align `resumeJob` / recovery behavior so a stale processing job can be retried or failed/refunded instead of staying locked.
   - Update `src/hooks/useGeminiImageJobUnified.ts` so the client detects stale `processing` jobs and triggers recovery logic instead of waiting endlessly.

4. **Clean up the currently stuck job**
   - After code changes, fail job `b044eb20-44a7-4661-96be-35305f1933bf`
   - Refund its 3 credits
   - Record the refund in `credits_transactions`

### Files to update
- `supabase/functions/ugc-gemini/index.ts`
- `supabase/functions/ugc-gemini-v3/index.ts`
- `src/hooks/useGeminiImageJobUnified.ts`
- New migration for the stuck-job refund/cleanup

### Technical details
- I would not change the frontend 4K toggle or pricing logic.
- The problem is server-side request handling and recovery.
- `ugc-gemini-v3` should be updated too even if the current stuck job is in `ugc-gemini`, because it uses the same risky `imageConfig` pattern and currently has weaker stuck-job recovery.

### Verification
After implementation, I would verify:
1. 4K + `source` still works
2. 4K + `4:5` completes successfully
3. 2K + `4:5` still works unchanged
4. If Gemini hangs, the job fails cleanly and credits are refunded
5. No job remains stuck in `processing` indefinitely
