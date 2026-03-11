

## Fix: Memory Limit Exceeded in `processJob`

### Root Cause

The `processJob` action (line 249-283) processes **all images sequentially within a single edge function invocation**. For each image it:
1. Downloads the source image as base64 (~3-10MB per image in memory)
2. Optionally holds a background image as base64
3. Holds the previous result as base64 (`refB64`) for the chained consistency pattern
4. Receives the Gemini response with another base64 image

With multiple images, this accumulates 30-50MB+ per image in memory, easily exceeding the 256MB limit. The logs confirm: `Memory limit exceeded` followed by `shutdown`.

### Fix: Apply the Same Dispatcher/Worker Pattern Used for Product Views

Refactor `processJob` to become a dispatcher that processes images **one at a time in separate invocations**, matching the pattern already used for `processSingleView`.

### Changes

**`supabase/functions/bulk-background/index.ts`**

1. **Modify `processJob`** to become a dispatcher:
   - Set job status to `processing`
   - Fetch background image base64 ONLY if custom (single image, manageable)
   - Process just the **first pending result** in-line
   - After completing that one result, **self-invoke** `processJob` again for the next image
   - This means each invocation handles exactly ONE image, well within the 256MB limit

2. **For preset chained consistency**: After each successful result, store the result's public URL in the job's `settings.lastResultUrl` field. The next invocation reads it and fetches that as the reference image — no need to hold `refB64` across iterations.

3. **Key difference from current code**: Instead of a `for` loop over all results, process one result then trigger the next invocation. Each invocation is a fresh memory space.

### Why This Works

- Each invocation holds at most: 1 source image base64 + 1 background/reference base64 + 1 Gemini response = ~30-40MB max
- The chained consistency pattern is preserved via the database (storing last result URL)
- Error handling and refunds work the same way
- No frontend changes needed — the polling/realtime already works with incremental updates

