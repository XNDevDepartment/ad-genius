

## Fix: Handle password-protected stores gracefully in shopify-sync

### Problem
When a Shopify store has password protection enabled, the public `/products.json` endpoint redirects to the password page. The Deno `fetch` follows redirects up to 20 times and then crashes with "Maximum number of redirects reached," which surfaces as a generic "Edge Function error" to the user.

### Solution
Update `supabase/functions/shopify-sync/index.ts` to use `redirect: "manual"` on the fetch call, then check for 3xx status codes. If a redirect is detected, return a clear error message telling the user their store is password-protected and they need to disable it.

### Changes

**`supabase/functions/shopify-sync/index.ts`** — in `syncProducts`, change the fetch call:
- Add `redirect: "manual"` to prevent following redirects
- After the fetch, check if `res.status >= 300 && res.status < 400` — if so, return a specific error: "Your Shopify store appears to be password-protected. Please remove the storefront password in Shopify Admin → Online Store → Preferences before syncing."
- Keep existing non-ok handling for other errors (404, 500, etc.)

This is a small, surgical change — only the fetch options and the error check after it.

