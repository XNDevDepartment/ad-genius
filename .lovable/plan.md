

## Fix Outfit-Swap Result Insert Error Handling

### Problem Summary

Jobs are marked as "completed" even when the result record fails to save to the database. This causes:
- Jobs appear successful in admin panel but have no viewable results
- Users cannot see their generated images
- Data loss - images exist in storage but are inaccessible

### Root Causes Identified

1. **Silent error handling (lines 929-931)**: The code logs the insert error but continues to mark the job as completed
2. **RLS policy misconfiguration**: The `Service role can insert outfit swap results` policy is assigned to `roles: {public}` which doesn't work for service role inserts

---

### Technical Changes

#### 1. Edge Function Fix (supabase/functions/outfit-swap/index.ts)

**Current problematic code (lines 929-944):**
```typescript
if (resultError) {
  console.error("Error saving results:", resultError);
}
// Update job as completed (preserves garment metadata)
await supabase.from("outfit_swap_jobs").update({
  status: "completed",
  ...
```

**Fixed code:**
```typescript
if (resultError) {
  console.error("Error saving results:", resultError);
  // CRITICAL: Fail the job if result cannot be saved
  throw new Error(`Failed to save result to database: ${resultError.message}`);
}
// Only mark as completed if result was successfully saved
await supabase.from("outfit_swap_jobs").update({
  status: "completed",
  ...
```

This ensures:
- The job is properly marked as "failed" when result insert fails
- The error is captured in the job's error field
- Credits can be refunded based on the failure
- The catch block (lines 981-997) handles the error appropriately

#### 2. Database Migration - Fix RLS Policy

Drop the misconfigured policy and create a proper one:

```sql
-- Drop the misconfigured policy (targets 'public' role incorrectly)
DROP POLICY IF EXISTS "Service role can insert outfit swap results" 
ON public.outfit_swap_results;

-- Note: Service role bypasses RLS by default, so no replacement needed
-- The existing "Users can insert own results" policy handles authenticated users
```

---

### Implementation Steps

| Step | Action | File/Location |
|------|--------|---------------|
| 1 | Add throw statement after result insert error | `supabase/functions/outfit-swap/index.ts` (line 930) |
| 2 | Drop misconfigured RLS policy | Database migration |
| 3 | Deploy edge function | Automatic on save |
| 4 | Test with a new outfit swap job | Manual verification |

---

### Additional Improvements (Optional)

Add more detailed error context:

```typescript
if (resultError) {
  console.error("[OUTFIT-SWAP] Critical: Failed to save result", {
    jobId,
    userId: job.user_id,
    error: resultError,
    storagePath: jpgPath
  });
  throw new Error(`Database insert failed: ${resultError.message} (code: ${resultError.code})`);
}
```

---

### Expected Outcome

After this fix:
- Jobs will fail properly when result insert fails
- Error message will be visible in admin panel
- Credits can be refunded for failed jobs
- No more "ghost" completed jobs without results

