

## Fix Build Error + Unstick Stuck Job

### Part 1: Fix Build Error (`imageSize` not in type)

The last diff added `imageSize` to the settings object passed to `createJob()` on line 833, but the `CreateJobPayload` type in `src/api/ugc-gemini-unified.ts` doesn't include `imageSize`. The same type exists in `src/api/ugc.ts`.

**Fix:** Add `imageSize?: string` to the `settings` type in both files.

| File | Line | Change |
|------|------|--------|
| `src/api/ugc-gemini-unified.ts` | 12 | Add `imageSize?: string;` after `size?: string;` |
| `src/api/ugc.ts` | ~8-20 | Add `imageSize?: string;` to matching type |

### Part 2: Unstick Job via Migration

Job `211998ea-97ba-4ca0-b18c-ac33b49fc148` (user `4e962775-cb55-4301-bc33-081eacb96c46`) has been stuck in `processing` since 11:58 UTC with 0 images generated. It needs to be marked as `failed` and credits refunded (3 credits for 4K quality).

**Migration SQL:**
- Set job status to `failed`, error to `'Generation timed out — credits refunded'`
- Add 3 credits back to the user's `credits_balance`
- Insert a `credits_transactions` record documenting the refund

### Files Modified
1. `src/api/ugc-gemini-unified.ts` — add `imageSize` to settings type
2. `src/api/ugc.ts` — add `imageSize` to settings type
3. New migration — fail stuck job + refund credits

