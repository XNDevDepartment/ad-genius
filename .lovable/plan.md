

## Problem

The `edit-image` edge function fails with a 404 error because it uses an invalid model name and has several other discrepancies compared to the working Gemini functions in the project.

## Root Cause (from logs)

```
models/gemini-2.0-flash-exp-image-generation is not found for API version v1beta
```

Comparing `edit-image` with all other working functions (ugc-gemini, outfit-swap, bulk-background, etc.) reveals **4 differences**:

| Issue | edit-image (broken) | Other functions (working) |
|-------|-------------------|--------------------------|
| Model | `gemini-2.0-flash-exp-image-generation` | `gemini-3-pro-image-preview` |
| API key | Query param `?key=...` | Header `x-goog-api-key` |
| Image data field | `inline_data` (snake_case) | `inlineData` (camelCase) |
| Response modalities | `["IMAGE"]` | `["TEXT", "IMAGE"]` |

## Plan

**File: `supabase/functions/edit-image/index.ts`** — Fix 4 issues on the Gemini API call (lines 111-135):

1. Change model to `gemini-3-pro-image-preview`
2. Move API key from query param to `x-goog-api-key` header
3. Change `inline_data` / `mime_type` to `inlineData` / `mimeType` (camelCase)
4. Change `responseModalities` from `["IMAGE"]` to `["TEXT", "IMAGE"]`

The rest of the function (auth, credit deduction, upload, DB insert) remains unchanged.

