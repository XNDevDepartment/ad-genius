

## Fix: getAllConfigs and getAllJobs Relationship Error

### Problem

The `getAllConfigs` and `getAllJobs` actions are failing with error:
```
"Could not find a relationship between 'genius_agent_configs' and 'profiles' in the schema cache"
```

This happens because:
1. The queries use Supabase's automatic relationship syntax: `profiles(email, name)`
2. But there's no foreign key constraint defined from `genius_agent_configs.user_id` to `profiles.id`
3. PostgREST requires explicit foreign key relationships for automatic joins

### Solution

**Option A (Quick Fix)**: Remove the automatic join and fetch profiles separately in the edge function using a manual approach.

**Option B (Proper Fix)**: The queries should be rewritten to manually join by fetching the data without the automatic relationship syntax. Since we're using the service role, we can do a separate query for profiles.

I recommend **Option A** for now - modify the edge function to:
1. Fetch configs/jobs without the profiles join
2. Collect unique user IDs
3. Fetch profiles for those user IDs separately
4. Merge the data in code

---

### Changes to `supabase/functions/genius-agent/index.ts`

**1. Fix `getAllConfigs` function (lines 635-656):**

```typescript
async function getAllConfigs(
  userId: string,
  supabase: SupabaseClient
): Promise<Response> {
  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  if (!isAdmin) {
    return errorJson("Admin access required", 403);
  }

  // Fetch configs without automatic join
  const { data: configs, error } = await supabase
    .from("genius_agent_configs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return errorJson(`Failed to fetch configs: ${error.message}`, 500);
  }

  // Fetch profiles for all users
  const userIds = [...new Set((configs || []).map(c => c.user_id))];
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    // Map profiles to configs
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enrichedConfigs = (configs || []).map(config => ({
      ...config,
      profiles: profileMap.get(config.user_id) || null
    }));

    return json({ configs: enrichedConfigs });
  }

  return json({ configs: configs || [] });
}
```

**2. Fix `getAllJobs` function (lines 661-686):**

```typescript
async function getAllJobs(
  userId: string,
  body: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Response> {
  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: userId });

  if (!isAdmin) {
    return errorJson("Admin access required", 403);
  }

  const limit = (body.limit as number) || 100;

  // Fetch jobs with source_images only (no profiles join)
  const { data: jobs, error } = await supabase
    .from("genius_agent_jobs")
    .select("*, source_images(file_name, public_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return errorJson(`Failed to fetch jobs: ${error.message}`, 500);
  }

  // Fetch profiles for all users
  const userIds = [...new Set((jobs || []).map(j => j.user_id))];
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    // Map profiles to jobs
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enrichedJobs = (jobs || []).map(job => ({
      ...job,
      profiles: profileMap.get(job.user_id) || null
    }));

    return json({ jobs: enrichedJobs });
  }

  return json({ jobs: jobs || [] });
}
```

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/genius-agent/index.ts` | Update `getAllConfigs` and `getAllJobs` to fetch profiles separately instead of using automatic joins |

---

### Summary

This fix changes the query strategy from automatic PostgREST joins to a two-query approach:
1. First query: Fetch configs/jobs
2. Second query: Fetch profiles for the unique user IDs
3. Merge in code

This avoids the foreign key requirement while still providing profile information in the response.

