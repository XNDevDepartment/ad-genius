
Objective
- Stop losing paid generation results by preventing premature tracker cleanup.
- Ensure a job is only removed after the frontend has confirmed it received all images that should exist for that job.

STATUS: ✅ IMPLEMENTED

What was changed

### 1. `src/hooks/useMultiJobTracker.ts` — Finalization state machine

- Extended `TrackedJob` with `dbCompleted`, `dbFailed`, `dbTotal`, `terminalAt` from DB counters
- Added `computeReadyToFinalize()` function with deterministic rules:
  - `readyToFinalize = (terminal && retrieved >= expected) OR (retrieved >= totalSlots)`
  - Failed/canceled jobs with 0 expected finalize immediately
- Polling now targets ALL unresolved jobs (not just `queued/processing`)
- Both `fetchJobStatus` AND `fetchImages` called for every unresolved job
- When realtime status becomes terminal, immediately triggers image fetch
- Duplicate `addJob` protection via `cleanupFnsRef` check
- Exposed `readyToFinalizeJobIds` (replaces old `completedJobIds`)
- Structured console logs for every lifecycle event

### 2. `src/pages/CreateUGCGeminiBase.tsx` — Safe cleanup

- Cleanup effect uses `tracker.readyToFinalizeJobIds` (stable string key)
- Added `finalizedJobIdsRef` Set to prevent double processing
- `removeJob` only called AFTER images are moved to `previousImages`

### 3. `src/components/GeneratedImagesRows.tsx` — Finalizing UI

- Distinguishes `isActive` (queued/processing) from `isFinalizing` (terminal but images missing)
- Shows "Finalizing batch… retrieving images" with placeholders for missing slots
- Prevents user thinking job was lost/canceled

Key invariant
```
A job can ONLY be removed from tracker when readyToFinalize === true.
readyToFinalize = (terminal && imagesWithUrl >= expected) OR (imagesWithUrl >= totalSlots)
```
