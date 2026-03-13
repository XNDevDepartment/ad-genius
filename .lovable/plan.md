

## Problem: JWT Verification Blocking Internal Service Calls

The API gateway (`api-gateway`) is already configured with `verify_jwt = false` and handles authentication via API keys (for external Shopify app calls) or service role keys (for internal function-to-function calls). This works correctly.

However, when the API gateway calls **downstream worker functions** like `ugc-gemini-v3`, those functions have `verify_jwt = true` in `config.toml`. Supabase's gateway-level JWT verification rejects the service role key before the request even reaches the function code — resulting in `{ code: 401, message: "Invalid JWT" }`.

The `ugc-gemini-v3` function already has its own internal auth logic (checking `isServiceCall` against the service role key), so the gateway-level check is redundant and harmful.

## Solution

Set `verify_jwt = false` for all edge functions that are called internally by the API gateway. These functions already validate auth in their own code.

### `supabase/config.toml` changes

Update the following functions from `verify_jwt = true` to `verify_jwt = false`:

- `functions.ugc-gemini-v3` — called by api-gateway for UGC and Pack generation
- `functions.shopify-sync` — called from the dashboard with user JWT (but verify_jwt gateway check fails with signing-keys)
- `functions.firecrawl-shopify` — called from dashboard context

These functions already handle authentication internally (service role key check or `getUser()` call), so removing the gateway-level check does not reduce security — it just prevents the signing-keys incompatibility from blocking valid requests.

No code changes needed in the functions themselves — only the config toggle.

