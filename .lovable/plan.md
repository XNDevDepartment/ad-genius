

## Fix Webhook Feature & Complete API Integration

### Issues Found

1. **Webhook save error**: The `setWebhook` action correctly rejects HTTP URLs (HTTPS required), but the frontend doesn't parse the error body from `supabase.functions.invoke` — it shows a generic "non-2xx" message instead of "Webhook URL must use HTTPS".

2. **Product background API trigger broken**: The API gateway sends `{ jobId }` to `bulk-background`, but the function expects `{ action: "processJob", jobId }`. The job will never process.

3. **Webhook dispatching not connected**: When API-triggered jobs complete, nothing calls `api-webhook-dispatcher`. The webhook infrastructure exists but is never invoked.

### Changes

**`src/components/account/ApiKeysPanel.tsx`**

- Add client-side HTTPS validation before calling the edge function
- Parse `data.error` from the response body when `supabase.functions.invoke` returns, since the SDK may resolve with `data` containing the error JSON even on non-2xx (depending on version), or use the `error.context` to extract the body

**`supabase/functions/api-gateway/index.ts`**

- Fix product background trigger: add `action: "processJob"` to the body sent to `bulk-background` (line 671)
- Add webhook dispatch calls: after each job-creation handler, store the `apiKeyId` so that when jobs are polled and found completed, a webhook can be triggered (or alternatively, add webhook dispatch in the job processing functions themselves)

**`supabase/functions/api-keys/index.ts`**

- No changes needed — the HTTPS validation logic is correct

### Implementation Detail

For the webhook dispatch integration, the cleanest approach is to add webhook triggering inside each job processor (ugc-gemini, kling-video, bulk-background, outfit-swap) when they detect `api_key_id` in the job metadata. This way webhooks fire as soon as jobs complete, without requiring polling.

