

# Fix: Multi-Job Tracking Not Retrieving Images for All Jobs

## Root Cause

**Channel name collision between `useGeminiImageJobUnified` and `useMultiJobTracker`.**

Both hooks call `api.subscribeJob()` and `api.subscribeJobImages()` for the same job IDs, which create Supabase realtime channels with identical names:
- `${modelVersion}-image-job:${jobId}`
- `${modelVersion}-job-images:${jobId}`

When `useGeminiImageJobUnified` creates job B, it:
1. Cleans up its subscriptions for job A — calling `supabase.removeChannel()` on `gemini-v3-image-job:jobA`
2. This **also kills** the tracker's subscription for job A, because it's the same channel
3. Job A's images keep arriving in the database, but the frontend never receives them

The same happens for job C when the unified hook moves on.

## Fix

### 1. `src/hooks/useMultiJobTracker.ts` — Use unique channel names

Instead of calling `api.subscribeJob()` / `api.subscribeJobImages()` (which use the same channel names as the unified hook), create Supabase channels directly with a `tracker-` prefix to avoid collisions.

Replace the `addJob` subscription setup:

```typescript
// Instead of:
const jobUnsub = api.subscribeJob(jobId, ...);
const imgUnsub = api.subscribeJobImages(jobId, ...);

// Use direct Supabase channels with unique names:
const jobChannel = supabase
  .channel(`tracker-${modelVersion}-job:${jobId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'image_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => { /* update job status */ })
  .subscribe();

const imgChannel = supabase
  .channel(`tracker-${modelVersion}-images:${jobId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'ugc_images',
    filter: `job_id=eq.${jobId}`
  }, async () => {
    // Fetch fresh images via API
    const result = await api.getJobImages(jobId);
    // Update tracker state
  })
  .subscribe();
```

The cleanup functions will call `supabase.removeChannel()` on these tracker-specific channels, leaving the unified hook's channels untouched.

### 2. Initial data fetch on subscribe

When each tracker channel reaches `SUBSCRIBED` status, perform an initial fetch of:
- Job status (via direct Supabase query or `api.getJob()`)
- Job images (via `api.getJobImages()`)

This ensures no data is missed between job creation and subscription setup.

### 3. Add a polling fallback in the tracker

As a safety net, add a simple polling interval (every 5s) for active tracked jobs. If a realtime event is missed, the poll catches up. Stop polling when the job completes.

## What This Fixes

| Before | After |
|---|---|
| Job A subscriptions killed when job B starts | Each job has independent, uniquely-named channels |
| Only first job's images appear | All jobs' images stream in independently |
| No fallback if realtime missed | Polling fallback ensures all images are captured |

## Files Changed

- `src/hooks/useMultiJobTracker.ts` — rewrite subscription logic with unique channel names + polling fallback

No other files need changes.

