
## Fix: Two Critical Bugs - Outfit-Swap Stuck & Account Activation Not Working

### Bug #1: Outfit-Swap Jobs Stuck in "Processing" 

#### Root Cause
The `outfit-swap` edge function has `verify_jwt = true` in `config.toml`. When making internal calls to trigger `processJob`, the code uses `SUPABASE_SERVICE_ROLE_KEY` as the Bearer token. However, the service role key is **NOT a valid JWT** - it's an API key. This causes the internal job processing calls to fail authentication silently, leaving jobs stuck in "queued" status forever.

#### Evidence
- Edge function logs show only `getBatch` polling, never `processJob` logs
- Job status is "queued" with `started_at: null`
- Batch status is "processing" but `completed_jobs: 0`
- No errors logged because the auth rejection happens before the function body executes

#### Solution
Change the `outfit-swap` function to `verify_jwt = false` in `config.toml`. The function already handles authentication manually for user-facing actions (checks Authorization header and validates token), and internal `processJob` actions bypass auth intentionally by design.

**File to modify:** `supabase/config.toml`
```toml
[functions.outfit-swap]
verify_jwt = false  # Changed from true to allow internal processJob calls
```

---

### Bug #2: Account Activation Shows Success But account_activated Remains false

#### Root Cause
In `AuthContext.tsx`, there's a race condition in the OAuth login flow. The code that handles new OAuth users has this logic:

```typescript
if (isNewUser || (existingProfile && existingProfile.account_activated === false)) {
  // ... 
  await supabase.from('profiles').update({ account_activated: false }).eq('id', session.user.id);
  // ...
}
```

The problem is:
1. User activates account via email link → `account_activated` set to `true`
2. User logs in again (or refreshes) → SIGNED_IN event fires
3. Code fetches profile and checks `account_activated === false` 
4. Due to stale data or timing, the condition may still trigger
5. Code sets `account_activated = false` again, undoing the activation

Additionally, the "isNewUser" check looks at profile creation time (within 30 seconds), but this can cause false positives if the user navigates around quickly after signup.

#### Evidence
- Edge function logs: "Account activated for user 530b9979..." 
- Database shows `activation_token: null` (cleared on activation)
- Database shows `updated_at: 2026-01-27 12:43:36` (matches activation time)
- But `account_activated: false`

#### Solution
Modify the OAuth login handling in `AuthContext.tsx` to:
1. **Never reset `account_activated` to false after initial setup**
2. Only set `account_activated = false` for truly NEW users (profile doesn't exist yet)
3. Add a flag to prevent re-running activation logic on subsequent logins

**File to modify:** `src/contexts/AuthContext.tsx`

The logic should change from:
```typescript
if (isNewUser || (existingProfile && existingProfile.account_activated === false)) {
  // Update profile to set account_activated = false
  await supabase.from('profiles').update({ account_activated: false })...
```

To:
```typescript
// Only trigger activation flow for truly new users who don't have activation set yet
const needsActivationSetup = isNewUser && existingProfile?.account_activated === null;

if (needsActivationSetup) {
  // Set account_activated = false only for brand new users
  await supabase.from('profiles').update({ account_activated: false })...
```

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Line 83: Change `verify_jwt = true` to `verify_jwt = false` for outfit-swap |
| `src/contexts/AuthContext.tsx` | Lines 185-214: Fix the activation logic to not reset already-activated accounts |

---

### Technical Details

#### config.toml Change
```text
Line 82-83:
[functions.outfit-swap]
verify_jwt = false  # Was: true
```

#### AuthContext.tsx Change
```text
Lines 185-214:
Replace the condition and logic to only set account_activated = false for new profiles where it's not already set
```

---

### Immediate Fix for Affected User
After deploying the fix, the user `ptandover@gmail.com` needs their `account_activated` set to `true` manually via SQL:

```sql
UPDATE profiles SET account_activated = true WHERE email = 'ptandover@gmail.com';
```

And their stuck job can be reprocessed by triggering the batch again or canceling and recreating it.

---

### Expected Outcome

After these changes:
1. **Outfit-swap**: Internal job processing will succeed, jobs will move from "queued" → "processing" → "completed"
2. **Account activation**: Once activated via email link, the account stays activated permanently and won't be reset on subsequent logins
