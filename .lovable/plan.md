

# Fix: Ecommerce Photo Job Stuck on "Queued"

## Root Cause
In `createEcommercePhotoJob` (line 2064), the self-invocation that triggers async processing uses `SUPABASE_ANON_KEY`:
```
"Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
```

But the processing gate (line 424-426) requires `SUPABASE_SERVICE_ROLE_KEY`. The anon key fails the check, returns 403, and the job stays in "queued" forever.

## Fix
In `supabase/functions/outfit-swap/index.ts`, line 2064:
- Change `SUPABASE_ANON_KEY` to `SUPABASE_SERVICE_ROLE_KEY`

This is a one-line fix. The same pattern is already used correctly for `processJob` and `processPhotoshoot` self-invocations elsewhere in the file.

## Files to modify
1. `supabase/functions/outfit-swap/index.ts` — fix auth header in ecommerce photo self-invocation

