

## Fix Stuck Image Generation Jobs - Complete Solution

### Problem Summary

Jobs are getting stuck because:
1. The `recoverQueued` function exists but is **never automatically triggered**
2. Worker invocation (fire-and-forget) fails silently when the edge function is cold or overloaded
3. No cron job or scheduled task calls the recovery function
4. Currently, there are 2 jobs stuck in `queued` (18-30 min) and 3 ancient jobs in `processing` (64-114 days old)

---

### Solution: Automatic Recovery System

#### Option A: Supabase Cron Job (Recommended)

Use `pg_cron` to call the recovery function every 5 minutes via a database trigger that invokes the edge function.

**Database Migration:**
```sql
-- Enable pg_cron extension (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to trigger recovery via HTTP
CREATE OR REPLACE FUNCTION trigger_ugc_job_recovery()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Get service key from vault or env
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Call the edge function (fire-and-forget)
  PERFORM net.http_post(
    url := 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/ugc-gemini',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'apikey', service_key,
      'Content-Type', 'application/json'
    ),
    body := '{"action": "recoverQueued"}'::jsonb
  );
END;
$$;

-- Schedule cron job every 5 minutes
SELECT cron.schedule(
  'recover-stuck-ugc-jobs',
  '*/5 * * * *',
  $$SELECT trigger_ugc_job_recovery()$$
);
```

---

#### Option B: Client-Side Polling (Fallback)

Add a recovery trigger on the frontend that runs when users access the UGC page:

**File:** `src/hooks/useGeminiImageJobUnified.ts`

```typescript
// Add auto-recovery on page load
useEffect(() => {
  const triggerRecovery = async () => {
    try {
      await supabase.functions.invoke('ugc-gemini', {
        body: { action: 'getActiveJob' }
      });
    } catch {}
  };
  triggerRecovery();
}, []);
```

---

### Immediate Cleanup: Mark Ancient Jobs as Failed

Clean up the 3 jobs that have been stuck for 64-114 days:

```sql
-- Mark stuck jobs as failed and refund credits
UPDATE image_jobs
SET 
  status = 'failed',
  error = 'Job timed out - automatic cleanup',
  finished_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  'd3d1733b-248c-4af7-9b31-21bfbb5b6c03',
  '935dca2f-fc77-4f72-a0e7-32295e4e392d',
  '0e1e2ffc-804a-4b7c-a166-f5982fa0e9e1'
);

-- Refund credits for incomplete images (1 credit per missing image)
-- Job d3d1733b: 3 total - 2 completed = 1 credit
-- Job 935dca2f: 3 total - 2 completed = 1 credit  
-- Job 0e1e2ffc: 3 total - 2 completed = 1 credit
```

---

### Add Retry on Worker Start

**File:** `supabase/functions/ugc-gemini/index.ts`

Improve the worker invocation to retry if the initial call fails:

```typescript
// In createImageJob function, replace fire-and-forget with retry logic
const triggerWorker = async (jobId: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await serviceClient().functions.invoke("ugc-gemini", {
        body: { action: "generateImages", jobId },
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY
        }
      });
      if (response.error) throw response.error;
      log("Worker triggered successfully", { jobId, attempt: i + 1 });
      return;
    } catch (e) {
      log("Worker trigger failed", { jobId, attempt: i + 1, error: String(e) });
      if (i < retries - 1) await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  // If all retries fail, the job will be picked up by recoverQueued
  log("All worker trigger attempts failed, relying on recovery", { jobId });
};

// Fire and don't block the response
triggerWorker(job.id).catch(() => {});
```

---

### Add Better Logging

Add structured logging to track job lifecycle:

```typescript
// At job creation
log("Job created", { jobId: job.id, userId, total: totalImages });

// At worker start
log("Worker claiming job", { jobId });

// At each image completion
log("Image completed", { jobId, index: i, completed, total });

// At job completion
log("Job completed", { jobId, completed, failed, duration_ms: Date.now() - startTime });
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ugc-gemini/index.ts` | Add worker retry logic, better logging |
| Database | Add pg_cron job for automatic recovery |
| Database | Clean up ancient stuck jobs |

---

### Implementation Steps

1. **Clean up ancient jobs** (manual SQL)
2. **Add pg_cron job** for automatic recovery every 5 minutes
3. **Improve worker trigger** with retry logic
4. **Add structured logging** for debugging

---

### Expected Outcome

- Jobs stuck in `queued` for >3 minutes will be auto-retried
- Jobs stuck in `processing` for >10 minutes will be failed and refunded
- Recovery runs every 5 minutes automatically
- Worker invocation has retry logic for cold starts

