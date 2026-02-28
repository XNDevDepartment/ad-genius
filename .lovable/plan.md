

# Fix: Photoshoot Must Preserve Original Image Background

## Problem
All `ANGLE_PROMPTS` hardcode "Seamless light-grey background", so generated photoshoot angles always get a grey background — ignoring whatever background the source/hero image has (e.g., black studio, outdoor scene, etc.).

## Solution
Append a background preservation instruction to every photoshoot prompt at runtime, and remove the hardcoded background references from the angle prompts.

### 1. `supabase/functions/outfit-swap/index.ts`

**A. Update all `ANGLE_PROMPTS` entries** (~lines 1375-1401):
- Replace every occurrence of "Seamless light-grey background" with "SAME background as the source image"
- Same for `BACK_WITH_REFERENCE_PROMPT` (~line 1416)

**B. In `processPhotoshoot`** (~line 1616, after selecting the prompt):
- Append a mandatory background instruction to every prompt:
  ```
  prompt += "\n\nBACKGROUND RULE: You MUST keep the EXACT SAME background, lighting, and environment as the source image. Do NOT change the background color, texture, or setting. If the source has a black background, the output MUST have a black background. NEVER default to grey or white.";
  ```

### Files to modify
1. `supabase/functions/outfit-swap/index.ts` — update angle prompts and add runtime background rule

