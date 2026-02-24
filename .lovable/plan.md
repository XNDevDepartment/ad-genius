
Objective
- Stop losing paid generation results by preventing premature tracker cleanup.
- Ensure a job is only removed after the frontend has confirmed it received all images that should exist for that job.

What I reviewed
1. Frontend tracker (`src/hooks/useMultiJobTracker.ts`)
2. UGC page orchestration (`src/pages/CreateUGCGeminiBase.tsx`)
3. Results renderer (`src/components/GeneratedImagesRows.tsx`)
4. Unified API + subscriptions (`src/api/ugc-gemini-unified.ts`)
5. Edge function read paths (`supabase/functions/ugc-gemini/index.ts`, `ugc-gemini-v3/index.ts`)
6. Recent DB state (jobs vs images) and edge logs

Findings (root causes)
1. Premature cleanup condition
- `completedJobIds` currently includes jobs as soon as `status` is terminal (`completed/failed/canceled`), even if images for that job have not been fetched yet.
- In page effect, `tracker.removeJob(jobId)` runs unconditionally, even when `readyImages.length === 0`.
- Result: subscriptions are removed before late/missed image fetch finishes.

2. Polling fallback has a logic mismatch
- “Unresolved jobs” are computed broadly, but polling actually fetches only `queued/processing`.
- Jobs in `completed` but missing images are unresolved but not polled.
- If realtime image event is missed/delayed, those images are never pulled.

3. Two completion systems still run in parallel
- Old single-job flow (`jobImages` + `job.status` effects) and new multi-job flow both mutate results.
- This increases race risk and makes cleanup behavior nondeterministic when multiple jobs overlap.

4. Missing guard for duplicate tracking
- `addJob()` can create duplicate channels if the same `jobId` is re-added (possible with idempotent responses).
- Not the main bug, but it increases instability.

Why this matches your symptom
```text
Job A + Job B active
Job A image arrives -> UI receives 1st image
Job B status flips to completed before image fetch finishes (or image event missed)
cleanup effect removes all "completed" jobs immediately
Job B channels removed before image sync -> second image never appears
```

Implementation plan (step-by-step)

Step 1 — Convert tracker to a strict “finalization readiness” state machine
File: `src/hooks/useMultiJobTracker.ts`

1. Extend `TrackedJob` with DB counters:
- `dbCompleted: number`
- `dbFailed: number`
- `dbTotal: number` (optional, fallback to `totalSlots`)
- `terminalAt?: number` (optional for diagnostics)

2. Update status sync (`fetchJobStatus` + realtime payload):
- Persist `status`, `progress`, `dbCompleted`, `dbFailed`, `dbTotal`.

3. Replace current completion derivation with deterministic rules:
- `expectedImages = clamp(dbCompleted, 0, totalSlots)` when available.
- `isTerminal = status in [completed, failed, canceled]`.
- `hasAllExpected = imagesWithUrl >= expectedImages`.
- `hasAllRequested = imagesWithUrl >= totalSlots` (fallback for stuck status).
- `readyToFinalize = (isTerminal && hasAllExpected) || hasAllRequested`.

4. Expose new output from hook:
- `readyToFinalizeJobIds` (replace current `completedJobIds` usage)
- `jobsNeedingSync` (for polling and UI state)

5. Fix polling target:
- Poll all `jobsNeedingSync`, not just `queued/processing`.
- Poll both `fetchJobStatus(jobId)` and `fetchImages(jobId)` for those jobs.

6. Add duplicate protection in `addJob`:
- If already tracked (or cleanup already exists), do not create extra channels.

Step 2 — Make cleanup in page strictly image-safe
File: `src/pages/CreateUGCGeminiBase.tsx`

1. Replace cleanup effect dependency/input:
- Use `tracker.readyToFinalizeJobIds` instead of `tracker.completedJobIds`.

2. Remove unconditional removal:
- Call `tracker.removeJob(jobId)` only after merge step executes against a snapshot of that tracked job and expected image count check is satisfied.

3. Add idempotent finalize guard:
- `finalizedJobIdsRef` set to prevent double processing during rapid rerenders.

4. Isolate legacy single-job effects while tracker has active jobs:
- Guard old `jobImages` and `job.status` move-to-previous logic so they do not interfere when `tracker.trackedJobs.length > 0`.

Step 3 — Keep UI honest while terminal jobs are still syncing
File: `src/components/GeneratedImagesRows.tsx`

1. Distinguish:
- `isGenerating`: queued/processing
- `isFinalizing`: terminal but not yet `readyToFinalize`

2. For finalizing jobs:
- Keep placeholders visible
- Show label: “Finalizing batch… (retrieving remaining images)”
- Prevent user impression that job was canceled/discarded.

Step 4 — Add observability to avoid further paid blind tests
Files: `useMultiJobTracker.ts`, `CreateUGCGeminiBase.tsx`

1. Structured logs per job:
- added, status update, image count update, finalization decision, removed reason.

2. One warning toast only if a terminal job remains unsynced beyond threshold (e.g., 30–45s):
- “Still syncing final image(s)…”
- no automatic removal in this window.

Step 5 — Verification plan (credit-safe first)

Primary (no-cost path where possible):
1. Use Gemini V3/admin path for repeated concurrency tests (if available to your account).
2. Run 2 jobs quickly (1 image each), ensure both land in previous results.
3. Run 2 jobs where second finishes first (out-of-order completion).
4. Run 1 job with 2–3 images to ensure no premature remove at partial completion.

Deterministic frontend verification:
1. Simulate status-before-image order by forcing tracker updates sequence in dev (status terminal first, images later).
2. Confirm `removeJob` happens only after expected image count is reached.

Acceptance criteria (must all pass)
1. No job is removed from tracker before expected image count is synced.
2. `previousImages` count equals sum of finalized jobs’ expected images (deduped by id).
3. No “orphan” generating slot remains after finalization.
4. No missing image when DB has row in `ugc_images`.
5. No duplicate subscriptions for the same `jobId`.

Technical details (implementation contract)
- New invariant:
  - “A job can be removed only when `readyToFinalize === true`.”
- Formula:
```text
expectedImages = dbCompleted if known, else totalSlots
readyToFinalize = (terminal && imagesWithUrl >= expectedImages)
                  OR (imagesWithUrl >= totalSlots)   // fallback for stuck status
```
- Polling scope:
```text
jobsNeedingSync = trackedJobs where !readyToFinalize
```
- Cleanup is driven by `readyToFinalizeJobIds`, not raw terminal status.

Files to change
1. `src/hooks/useMultiJobTracker.ts`
2. `src/pages/CreateUGCGeminiBase.tsx`
3. `src/components/GeneratedImagesRows.tsx`

Risk level
- Medium-low: localized to tracker lifecycle/UI behavior.
- No DB migration required.
- No edge function change required for this fix iteration.
