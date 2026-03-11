

## Add API Authentication Route

### What's Needed

The Shopify app needs a way to verify an API key is valid and retrieve account info (user ID, credits, subscription tier, permissions) without calling a generation endpoint. This is the standard "who am I?" / "verify my key" route.

### Changes

**`supabase/functions/api-gateway/index.ts`**

Add a new endpoint `/v1/auth/verify` that:
- Validates the API key (already done by the gateway before routing)
- Returns the authenticated user's info: `user_id`, `permissions`, `rate_limit_tier`, `credits_balance`, `subscription_tier`
- No permission check needed — any valid API key can call this
- No credits cost

Add routing:
- `case '/v1/auth/verify':` → calls `handleAuthVerify(supabase, apiKeyInfo)`
- Skip permission check for `/v1/auth` endpoints (same as `/v1/credits`)

New handler `handleAuthVerify`:
```text
async function handleAuthVerify(supabase, apiKeyInfo) {
  // Fetch credits + subscription tier from subscribers table
  const { data } = await supabase
    .from('subscribers')
    .select('credits_balance, subscription_tier')
    .eq('user_id', apiKeyInfo.user_id)
    .single()

  return {
    authenticated: true,
    user_id: apiKeyInfo.user_id,
    permissions: apiKeyInfo.permissions,
    rate_limit_tier: apiKeyInfo.rate_limit_tier,
    credits_balance: data?.credits_balance ?? 0,
    subscription_tier: data?.subscription_tier ?? 'Free'
  }
}
```

**`src/pages/help/APIDocsPage.tsx`**

Add `POST /v1/auth/verify` to the endpoints list at the top, documenting it as the authentication verification endpoint. No parameters needed — just the `X-API-Key` header. Free, no credits.

### Files Modified
- `supabase/functions/api-gateway/index.ts`
- `src/pages/help/APIDocsPage.tsx`

