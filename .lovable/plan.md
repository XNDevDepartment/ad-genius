

## Add Catalog Photoshoot Endpoints to API Documentation

### Summary
Add two new endpoint entries to the `endpoints` array in `src/pages/help/APIDocsPage.tsx` for the catalog photoshoot feature.

### Changes

**File: `src/pages/help/APIDocsPage.tsx`**

Insert two new endpoint definitions into the `endpoints` array (after the packs endpoints, before credits/balance):

1. **POST `/v1/catalog/generate`**
   - Description: "Generate a full product catalog photoshoot — 1 hero image + 3 views (macro, angle, environment)"
   - Parameters: `source_image_url (required)`, `product_type (required: fashion | product)`
   - Credits: "4 credits (1 hero + 3 views)"
   - Response example showing `job_id`, `hero_job_id`, `status: "processing"`, `credits_used: 4`
   - Code examples in JS, Python, cURL following the existing `mkJs`/`mkPy`/`mkCurl` pattern

2. **GET `/v1/catalog/jobs/{job_id}`**
   - Description: "Get status and results of a catalog photoshoot job"
   - Parameters: `job_id in endpoint path`
   - Credits: "Free"
   - Response example showing `hero_url`, `macro_url`, `angle_url`, `environment_url`, `status`, `progress`
   - Code examples following the same pattern

Also update the `/v1/auth/verify` response example to include `"catalog"` in the permissions array.

