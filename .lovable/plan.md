

# Multi-Job Tracking for UGC Image Generation

## Problem

Currently, the system tracks only **one job** at a time via `useGeminiImageJobUnified`. When the user starts a new generation, `clearJob()` is called, which kills the previous job's realtime subscription and clears its placeholders. This makes it look like the previous job was canceled.

## Solution

Replace the single-job model with a **multi-job tracking system**. Each job gets its own set of generating placeholders, and completed images replace their corresponding placeholders as they arrive via realtime subscriptions.

## Architecture

```text
Before:                          After:
┌──────────────┐                 ┌──────────────────────┐
│  Single job  │                 │  activeJobs Map      │
│  + images    │                 │  ├─ job-A (3 slots)  │
│              │                 │  ├─ job-B (2 slots)  │
└──────────────┘                 │  └─ job-C (4 slots)  │
                                 └──────────────────────┘
```

## Changes

### 1. New hook: `src/hooks/useMultiJobTracker.ts`

A new hook that manages **multiple concurrent jobs**. Each tracked job entry contains:
- `jobId`: string
- `totalSlots`: number (how many images were requested)
- `status`: job status
- `images`: array of completed images for that job
- `orientation`: aspect ratio for placeholder sizing
- `progress`: number

The hook will:
- Maintain a `Map<string, TrackedJob>` in state
- For each tracked job, set up a Supabase realtime subscription on `image_jobs` and `ugc_images`
- When images arrive for a job, merge them into that job's entry
- When a job completes/fails, mark it accordingly but keep showing its images
- Provide `addJob(jobId, totalSlots, orientation)` and `removeJob(jobId)` methods
- Clean up subscriptions on unmount or when jobs are removed

### 2. `src/pages/CreateUGCGeminiBase.tsx`

- Import and use `useMultiJobTracker` alongside the existing hook
- After `createJob` succeeds, call `tracker.addJob(jobId, numImages, aspectRatio)` to register the new job
- **Remove** `clearJob()` call at the start of `handleGenerate` -- instead, just add a new job to the tracker
- Remove `currentBatchImages` and `pendingSlots` state -- replaced by the tracker's per-job data
- The `previousImages` array remains for fully completed images
- When a tracked job completes, move its images to `previousImages` and remove it from the tracker
- Derive `isAnyJobGenerating` from the tracker (for progress bar visibility) -- separate from `isGenerating` which controls button state

### 3. `src/components/GeneratedImagesRows.tsx`

- Add a new prop `trackedJobs: TrackedJob[]` (array of active jobs with their slots/images)
- Render each tracked job as a group: first its completed images, then its remaining placeholder slots
- Keep `previousImages` rendering below all tracked jobs
- Each job group shows a small label like "Generating batch..." with its own progress

### 4. `src/hooks/useGeminiImageJobUnified.ts`

- No structural changes needed -- it continues to handle a single job's API calls (create, cancel, resume)
- The multi-job subscriptions are handled by the new `useMultiJobTracker` hook directly via Supabase channels

## Visual Result

When the user generates 3 images, then immediately generates 2 more:

```text
┌─ Batch 2 (generating) ──────────────┐
│ [placeholder] [placeholder]          │
└──────────────────────────────────────┘
┌─ Batch 1 (generating) ──────────────┐
│ [ready img 1] [placeholder] [placeholder] │
└──────────────────────────────────────┘
┌─ Previous results ──────────────────┐
│ [completed img] [completed img]      │
└──────────────────────────────────────┘
```

Newest jobs appear at the top. As images complete, they replace their job's placeholders. When all images in a job are done, the job's images move to `previousImages`.

### Technical Details

- Subscriptions: Each tracked job creates 2 Supabase channels (job status + images). Max ~6 channels for 3 concurrent jobs.
- Cleanup: Jobs that complete are auto-removed from the tracker after their images are moved to `previousImages`.
- The `useGeminiImageJobUnified` hook's `job` and `images` state will still exist but mainly used for the *latest* job's API interaction. The tracker independently subscribes to all jobs.
- `isGenerating` (button state) remains `loading` (only during API call). A separate `isAnyJobActive` derived from the tracker controls progress UI visibility.

