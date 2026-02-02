

# Fix: Worker Trigger 401 Error in ugc-gemini

## Problem Identified

The error `Worker trigger failed - {"status":401}` occurs because:

1. **`verify_jwt = true`** in `supabase/config.toml` for `ugc-gemini`
2. When the function calls itself to trigger the worker, it uses `Bearer ${SERVICE_KEY}` in the Authorization header
3. The Supabase gateway rejects this **before the request reaches your code** because the service role key is NOT a valid JWT - it's a different type of token

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Edge Function  │────>│  Supabase        │────>│  Edge Function  │
│  (createJob)    │     │  Gateway         │     │  (generateImages)│
│                 │     │                  │     │                  │
│  Authorization: │     │  verify_jwt=true │     │  Never reached!  │
│  Bearer SERVICE │     │  "Invalid JWT"   │     │                  │
│  _KEY           │     │  -> 401          │     │                  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Solution

Set `verify_jwt = false` in config.toml and rely on the in-code authentication you already have (which correctly handles service calls, user auth, and cron recovery).

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Set `verify_jwt = false` for `ugc-gemini` |

---

## Implementation Details

### Change in config.toml

```toml
# Before
[functions.ugc-gemini]
verify_jwt = true

# After
[functions.ugc-gemini]
verify_jwt = false
```

### Why This Is Safe

The function already has robust authentication checks:

```typescript
// Line 225-248 in ugc-gemini/index.ts
const authHeader = req.headers.get("Authorization") ?? "";
const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

if (isCronRecovery && authHeader) {
  // Allow recovery calls with any valid auth
} else if (isInternalAction && isServiceCall) {
  // ok, internal worker call
} else {
  if (!authHeader) return errorJson("Missing authorization header", 401);
  userId = await getUserIdFromAuth(authHeader);  // Validates user JWT
}
```

All user-facing actions still require valid authentication - we just bypass the gateway check to allow internal service-role calls.

---

## Same Pattern Used Elsewhere

This is the standard pattern in your project for functions that call themselves or other functions:

| Function | verify_jwt | Reason |
|----------|-----------|--------|
| `outfit-swap` | `false` | Internal worker triggers |
| `outfit-creator` | `false` | Internal worker triggers |
| `genius-agent` | `false` | Service calls |
| `ugc-gemini` | `true` ❌ | Should be `false` |

---

## Expected Outcome

After this change:
- Worker trigger calls will succeed (no more 401)
- Image generation jobs will process immediately
- User authentication still works correctly
- Cron recovery still works correctly

