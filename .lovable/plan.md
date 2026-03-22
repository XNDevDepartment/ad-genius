

## Fix UGC "Create Scenarios" Crash

### Root Cause Analysis

After thorough investigation of edge function logs, error_reports database, and client-side code, here is what I found:

**The scenario-generate edge function works correctly** — logs show successful completions (5 scenarios generated each time, no errors logged).

**No crash reports exist in error_reports** for UGC pages since March 2026 — meaning the crash happens either before ErrorBoundary can report it, or the report-error fetch itself fails.

**There are 3 identified crash vectors in the client-side code:**

1. **Null data crash in `scenario-api.ts` (line 32)**: `supabase.functions.invoke` can return `{ data: null, error: null }` on CORS issues, network timeouts, or empty response bodies. When this happens, `data.error` on line 32 throws `TypeError: Cannot read properties of null`. While this is inside a try/catch in `getScenariosFromConversation`, the error propagation path isn't clean — it could cause React state corruption.

2. **Upload failure doesn't abort scenario generation (line 596-612)**: If `uploadSourceImage` fails (e.g., expired session, storage error), the error is caught per-image but `imagesAnalysed` is set to `true` anyway (line 612) with potentially zero `uploadedSourceIds`. The flow continues to `generateScenarios` regardless, but later when the user tries to generate images, the missing source IDs cause downstream failures.

3. **Memory pressure on mobile devices**: The user's viewport (393x371) suggests a mobile device. Large product images stored as `File` objects + base64 data URLs for previews + simultaneous network requests for upload and scenario generation can cause out-of-memory tab crashes on mobile browsers, which presents as "reload page."

4. **State update race condition**: `setIsAnalyzingImages` is called with `new Array(productImages.length).fill(true)` at line 597, but `productImages` can change during the async upload loop, causing array length mismatches with `isAnalyzing` prop on next render.

### Fix Plan

**File: `src/api/scenario-api.ts`**
- Add null/undefined guard for `data` before accessing `data.error` and `data.scenarios`
- Return clear error messages for each null case

**File: `src/pages/CreateUGCGeminiBase.tsx`**
- In `getScenariosFromConversation`:
  - Capture `productImages.length` at start to avoid race conditions with `isAnalyzingImages` array
  - If all image uploads fail (uploadedSourceIds still empty after loop), abort early with a toast and don't call `generateScenarios`
  - Wrap the entire function body in an additional safety try/catch that always resets `isLoadingScenarios`
  - Add an `isMounted` ref guard to prevent state updates after unmount
- In `generateMoreScenarios` (line 645-649):
  - Add guard: don't clear scenarios and restart if already loading
- Add defensive rendering for scenario items — check `scenario?.idea` before rendering

**File: `src/hooks/useSourceImageUpload.ts`**
- Remove the re-throw on line 94 (it throws after already showing a toast). The calling code in `getScenariosFromConversation` catches it, but the re-throw pattern makes error handling fragile. Instead, return `null` on failure so callers can check the result.

### Files Modified
1. `src/api/scenario-api.ts` — Null-safe data access
2. `src/pages/CreateUGCGeminiBase.tsx` — Abort on upload failure, race condition fix, unmount guard
3. `src/hooks/useSourceImageUpload.ts` — Return null instead of re-throwing

