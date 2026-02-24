

# Fix: Tracked Job Slots Not Disappearing After Completion

## Problem

From the screenshot: two "Generating batch (0/1)..." slots persist with placeholders even though the actual images finished and appear below (via `previousImages` from the single-job hook). The tracker never cleans up because:

1. **Status never reaches `completed` in the tracker** — the realtime subscription on `image_jobs` may not fire reliably, and the polling only checks jobs with status `queued`/`processing`. If the status gets stuck, the job is never marked done.
2. **Images never arrive in the tracker** — `fetchImages` calls `apiRef.current.getJobImages()` which may return empty if called too early or if the API endpoint filters differently. The polling also only runs for `queued`/`processing` jobs, so if status somehow updates but images don't, there's no retry.
3. **`completedJobIds` never includes these jobs** — so the cleanup effect in `CreateUGCGeminiBase.tsx` never fires, and `removeJob` is never called.

## Fix (2 files)

### 1. `src/hooks/useMultiJobTracker.ts`

**A. Broaden `completedJobIds` detection** — also consider a job "done" when all its images have arrived, regardless of status:

```typescript
const completedJobIds = trackedJobs
  .filter(j =>
    j.status === 'completed' || j.status === 'failed' || j.status === 'canceled' ||
    // Fallback: all images arrived even if status wasn't updated
    (j.images.filter(img => Boolean(img.public_url)).length >= j.totalSlots && j.totalSlots > 0)
  )
  .map(j => j.jobId);
```

**B. Expand polling to cover all non-completed tracked jobs** — instead of only polling `queued`/`processing`, poll any job that hasn't been fully resolved (i.e., still in the tracker with fewer images than expected):

```typescript
// Change the active-check filter to include ANY tracked job that isn't fully resolved
const unresolvedJobIds = Array.from(jobs.values())
  .filter(j => {
    const isDone = j.status === 'completed' || j.status === 'failed' || j.status === 'canceled';
    const allImagesReceived = j.images.filter(img => Boolean(img.public_url)).length >= j.totalSlots;
    return !isDone || !allImagesReceived;
  })
  .map(j => j.jobId);
```

This ensures that even if status updates to `completed` via realtime but images haven't been fetched yet, the polling continues until all images are received.

### 2. `src/pages/CreateUGCGeminiBase.tsx`

**Stabilize the effect dependency** — `tracker.completedJobIds` is a new array reference every render, which can cause the effect to behave unpredictably. Use a serialized comparison:

```typescript
const completedIdsKey = tracker.completedJobIds.join(',');

useEffect(() => {
  if (tracker.completedJobIds.length === 0) return;
  tracker.completedJobIds.forEach(jobId => {
    const tj = tracker.trackedJobs.find(j => j.jobId === jobId);
    if (!tj) return;
    const readyImages = tj.images.filter(img => Boolean(img.public_url));
    if (readyImages.length > 0) {
      setPreviousImages(prev => {
        const existingIds = new Set(prev.map(img => img.id));
        const newImgs = readyImages
          .filter(img => !existingIds.has(img.id))
          .map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            format: (img.meta as any)?.format || 'png',
            orientation: (img.meta as any)?.orientation || (img.meta as any)?.aspect_ratio || tj.orientation,
            selected: false,
          }));
        return [...newImgs, ...prev];
      });
    }
    tracker.removeJob(jobId);
  });
}, [completedIdsKey]);
```

## What This Fixes

| Issue | Before | After |
|---|---|---|
| Job status stuck as `queued` | Slot stays forever | Image-count fallback detects completion |
| Polling stops when status updates but images missing | Images never fetched | Polling continues until all images received |
| Effect dependency instability | New array ref every render | Stable string key comparison |

## Files Changed

- `src/hooks/useMultiJobTracker.ts` — broader completion detection + expanded polling scope
- `src/pages/CreateUGCGeminiBase.tsx` — stable effect dependency for cleanup

