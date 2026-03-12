

## Add Per-Endpoint Code Examples (JavaScript, Python, cURL)

Currently each endpoint card only shows a response example. The "Code Examples" section at the bottom has general UGC examples. The user wants every endpoint to have its own JS, Python, and cURL snippets inline.

### Approach

**Restructure the `endpoints` array** to include a `codeExamples` object per endpoint with `javascript`, `python`, and `curl` keys. Then render a `Tabs` component inside each endpoint card (within the existing `<details>` or as a new expandable section) so users can switch between languages.

### Changes to `src/pages/help/APIDocsPage.tsx`

1. **Add `codeExamples` field** to each item in the `endpoints` array — an object with `javascript`, `python`, and `curl` strings showing the exact request for that endpoint. For GET endpoints (job status checks), show the polling/fetch pattern. For POST endpoints, show the full request body.

2. **Render per-endpoint tabs** inside each endpoint card, below the response example. Add a collapsible `<details>` with summary "Code examples" containing a small `<Tabs>` with JS/Python/cURL tabs and copy buttons.

3. **Remove or simplify the bottom "Code Examples" section** — it becomes redundant since every endpoint now has inline examples. Could keep it as a "Quick Start" full-flow example, or remove entirely.

### Example structure per endpoint:

```text
┌─────────────────────────────────────────────┐
│ POST /v1/ugc/generate          1 credit     │
│ Generate AI-powered UGC product images      │
│ [source_image_url] [prompt] [settings]      │
│                                             │
│ ▸ Response example                          │
│ ▸ Code examples                             │
│   ┌─────────┬────────┬──────┐               │
│   │ JS      │ Python │ cURL │               │
│   └─────────┴────────┴──────┘               │
│   const response = await fetch(...)         │
│                                    [Copy]   │
└─────────────────────────────────────────────┘
```

### Endpoint examples to generate (20 endpoints total):

Each will have tailored request bodies. For example:
- **POST /v1/ugc/generate** — full body with `source_image_url`, `prompt`, `settings`
- **GET /v1/ugc/jobs/{job_id}** — fetch with job_id in endpoint path
- **POST /v1/shopify/connect** — full connection payload with `shopDomain`, `externalConnectionId`, `metadata`
- **POST /v1/auth/verify** — minimal request, no body params needed
- **GET /v1/credits/balance** — simple GET

All examples will use the gateway pattern where `endpoint` is passed in the JSON body, matching the existing API architecture.

### Files Modified
- `src/pages/help/APIDocsPage.tsx` — add `codeExamples` to each endpoint object, render inline tabs per card, simplify bottom code section

