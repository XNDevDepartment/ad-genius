

## Data Recovery Script for Missing Outfit Swap Results

### Problem Summary

56 outfit swap jobs across 5 users are marked as "completed" but have no corresponding records in `outfit_swap_results`:

| User | Email | Missing Results |
|------|-------|-----------------|
| Unknown | (no profile) | 38 |
| Constança | constancahmatos@gmail.com | 9 |
| Rafael Carvalho | a21505209@gmail.com | 4 |
| Unknown | aigenius.xn@gmail.com | 3 |
| Duarte Fonseca | duartefonseca2000e3@gmail.com | 2 |

The images exist in the `outfit-user-models` storage bucket but database records were never created due to the silent error bug (now fixed).

---

### Storage Path Pattern

From the edge function analysis, result files are stored as:
```text
{user_id}/{job_id}/result_{timestamp}.jpg
{user_id}/{job_id}/result_{timestamp}.png
```

Example for Constança's job:
```text
ba6a14ac-c672-4bd9-9278-b4055ea79863/1b32aab1-2dc6-494e-9c9d-739041a316e6/result_1769646402155.jpg
```

---

### Recovery Approach

Create a new Edge Function `recover-outfit-swap-results` that:

1. **Queries for orphaned jobs** - Finds all completed jobs with no results
2. **Scans storage bucket** - Looks for files matching the pattern `{user_id}/{job_id}/result_*.jpg`
3. **Creates missing result records** - Inserts into `outfit_swap_results` with proper metadata
4. **Generates report** - Returns summary of recovered vs. unrecoverable jobs

---

### Technical Implementation

#### New Edge Function: `supabase/functions/recover-outfit-swap-results/index.ts`

```typescript
// Pseudocode structure
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  // 1. Get orphaned jobs (completed but no results)
  const orphanedJobs = await supabase.from("outfit_swap_jobs")
    .select("id, user_id, metadata, finished_at")
    .eq("status", "completed")
    .not("id", "in", /* subquery for jobs with results */);
  
  // 2. For each orphaned job, look for files in storage
  for (const job of orphanedJobs) {
    const storagePath = `${job.user_id}/${job.id}`;
    const files = await supabase.storage.from("outfit-user-models").list(storagePath);
    
    // 3. Find result files (pattern: result_*.jpg)
    const resultFile = files.find(f => f.name.startsWith("result_") && f.name.endsWith(".jpg"));
    
    if (resultFile) {
      // 4. Create the missing result record
      const jpgPath = `${storagePath}/${resultFile.name}`;
      const pngPath = jpgPath.replace(".jpg", ".png");
      
      await supabase.from("outfit_swap_results").insert({
        job_id: job.id,
        user_id: job.user_id,
        storage_path: jpgPath,
        public_url: getPublicUrl(jpgPath),
        jpg_url: getPublicUrl(jpgPath),
        png_url: getPublicUrl(pngPath),
        metadata: { recovered: true, original_metadata: job.metadata }
      });
    }
  }
  
  // 5. Return recovery report
  return Response.json({ recovered, failed, total });
});
```

---

### Implementation Steps

| Step | Action | Details |
|------|--------|---------|
| 1 | Create edge function | `supabase/functions/recover-outfit-swap-results/index.ts` |
| 2 | Deploy function | Automatic on file creation |
| 3 | Run recovery (dry-run) | Call with `?dryRun=true` to preview results |
| 4 | Run actual recovery | Call without dry-run flag to insert records |
| 5 | Verify results | Check that affected users can now see their images |

---

### Function Features

- **Dry-run mode**: Preview what will be recovered without making changes
- **Single user mode**: Optional `?userId=xxx` to recover specific user only
- **Idempotent**: Won't create duplicate records (checks for existing results)
- **Detailed logging**: Logs each recovery attempt with success/failure
- **Admin-only**: Requires admin authentication

---

### Expected Output

```json
{
  "dryRun": false,
  "summary": {
    "totalOrphanedJobs": 56,
    "recoveredJobs": 45,
    "failedJobs": 11,
    "failureReasons": {
      "no_files_in_storage": 8,
      "no_jpg_found": 3
    }
  },
  "recoveredDetails": [
    {
      "jobId": "1b32aab1-2dc6-494e-9c9d-739041a316e6",
      "userId": "ba6a14ac-c672-4bd9-9278-b4055ea79863",
      "storagePath": "ba6a14ac.../result_1769646402155.jpg",
      "status": "recovered"
    }
  ]
}
```

---

### Safety Measures

1. **Transaction safety**: Each insert is independent; failures don't affect other recoveries
2. **Duplicate prevention**: Check if result already exists before inserting
3. **Audit trail**: Mark recovered records with `metadata.recovered = true`
4. **No destructive operations**: Only creates new records, never modifies existing data

