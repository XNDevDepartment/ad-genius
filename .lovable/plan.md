

# Two Issues to Fix

## 1. Build Error: Missing `ugc.png` in Promo1Mes.tsx

The last diff replaced `.png`/`.jpg` assets with `.webp` versions in `ModuleSelection.tsx`, but `src/pages/Promo1Mes.tsx` still imports the old `ugc.png` file (line 23) which no longer exists.

### Fix

**File: `src/pages/Promo1Mes.tsx` (line 23)**
- Change `import fotoVideo from '@/assets/module_icons/ugc.png'` to `import fotoVideo from '@/assets/module_icons/ugc.webp'`

---

## 2. Feature: Allow Starting a New Generation While One Is Running

Currently, the generate button is disabled whenever `isGenerating` is true (line 124, used at lines 1365 and 1420). This forces the user to wait until all images finish before starting another batch.

### Approach

The change is conceptual: once a job has been successfully submitted (status moves to `queued` or `processing`), transition the UI back to the `setup` stage and clear the current job reference so the user can configure and launch a new generation. The previous job's results will still appear in `previousImages` when they complete via the realtime subscription.

### Changes

**File: `src/pages/CreateUGCGeminiBase.tsx`**

1. **In the job status monitoring effect (~line 396):** When job status becomes `queued` or `processing`, move current batch images to `previousImages`, then call `clearJob()` and set stage back to `setup`. This frees the generate button immediately.

2. **Adjust `isGenerating` (line 124):** This variable will naturally become `false` once the job is cleared, so the button unlocks without further changes.

3. **Keep the results section visible:** The `previousImages` array already renders in the results card, so in-progress and completed images from prior jobs remain visible below the form.

4. **Remove localStorage persistence of the cleared job:** Since `clearJob()` already handles this, no extra cleanup is needed.

### What changes for the user

| Aspect | Before | After |
|---|---|---|
| Generate button | Locked until all images finish | Unlocked ~2s after job starts |
| Previous results | Only shown after completion | Shown immediately as they arrive |
| Workflow | Wait → results → new generation | Submit → immediately start another |

### Technical detail

The key change is in the effect that watches `job?.status`. When the status becomes `processing` or stays `queued` for a moment, the component will:
1. Save current placeholders to `previousImages`
2. Call `clearJob()` to detach from the running job
3. Set `stage = 'setup'`

The realtime subscription in `useGeminiImageJobUnified` will be cleaned up when `job` is set to null, but since the images are already being written to the database, they will appear in the library. To keep showing progress, we will instead keep the job reference but only unlock the button -- changing `isGenerating` to only be true during the brief submission phase (`loading` state from the hook), not during the entire job lifecycle.

**Refined approach:**

- Change `isGenerating` from tracking job status to only tracking the `loading` state from `useGeminiImageJobUnified` (the brief period while the API call to create the job is in flight)
- This way: job subscription stays active, images keep streaming in, progress bar remains visible, but the generate button is unlocked

**Line 124 change:**
```typescript
// Before:
const isGenerating = (stage === 'generating' || job?.status === 'queued' || job?.status === 'processing') && job?.status !== 'completed';

// After:
const isGenerating = loading; // only true during the createJob API call
```

Where `loading` is already returned by `useGeminiImageJobUnified` -- just needs to be destructured on line 120.

This is the minimal, safe change. The progress UI, realtime updates, and results flow all continue working as before.

