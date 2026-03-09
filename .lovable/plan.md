
## Root Cause — Found in the Logs

The Gemini API IS returning an image successfully. The log message says "No image in Gemini response" but then shows the full response which CONTAINS `inlineData` with image data. This means the response extraction code is using the wrong field name.

**The bug**: Extraction loop checks `part.inline_data?.data` (snake_case) but Gemini returns `part.inlineData?.data` (camelCase).

```
Log: "No image in Gemini response: {"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/jpeg","data":"/9j/...
```

The image is right there — the code just can't read it because it's looking for `inline_data` instead of `inlineData`.

## Fix — One Line Change

**File: `supabase/functions/edit-image/index.ts`**

Change the extraction block from:
```typescript
if (part.inline_data?.data) {
  editedImageBase64 = part.inline_data.data;
```

To:
```typescript
if (part.inlineData?.data) {
  editedImageBase64 = part.inlineData.data;
```

That's the only change needed. The Gemini call, auth, credit deduction, and upload are all working correctly — just this one field name mismatch is preventing the result from being used.

## Files to Change
- `supabase/functions/edit-image/index.ts` — fix `inline_data` → `inlineData` in the response extraction loop, then redeploy
