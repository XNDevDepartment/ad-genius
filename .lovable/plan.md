

## Update API Documentation

Add the new Packs endpoints and update existing documentation to reflect the current API state.

### Changes to `src/pages/help/APIDocsPage.tsx`

1. **Add two new endpoints** to the `endpoints` array:
   - `POST /v1/packs/generate` — Generate image packs (ecommerce, social, ads) with parameters: `source_image_url` (required), `pack_id` (required: ecommerce | social | ads), `product_type` (required: fashion | product). Credits: 4 per pack.
   - `GET /v1/packs/jobs/{job_id}` — Get pack job status and results. Free.

2. **Update webhook payload** job type comment to include `product_background` and `packs`: `"type": "ugc | video | fashion | product_background | packs"`

3. **Update intro description** to mention pack-based generation for Shopify/external integrations.

4. **Add a Packs code example** in the code examples section showing how to generate and poll a pack job (JavaScript, Python, cURL).

5. **Add `packs` to API key permissions** — already done in the UI, just needs documentation mention in the Quick Start or a note.

