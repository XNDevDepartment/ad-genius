

## Fix: Prevent Barefoot Models in Fashion Catalog

### Problem
The FULL_OUTFIT, BOTTOM, and ACCESSORY prompt templates in the outfit-swap edge function do not explicitly forbid barefoot models. Only the TOP and FOOTWEAR prompts include "barefoot" in their FORBIDDEN lines. The uploaded image confirms the issue — a child model generated barefoot in a dress.

### Changes

**File: `supabase/functions/outfit-swap/index.ts`**

Update 3 prompt templates to add "barefoot" to their FORBIDDEN lines and strengthen footwear instructions:

1. **BOTTOM** (line 125): Add `barefoot` to FORBIDDEN line. Already has "FEET: Appropriate shoes" in requirements.

2. **FULL_OUTFIT** (line 192-203):
   - Line 192: Change "Add appropriate footwear (heels for elegant, sneakers for casual)" to "MUST wear appropriate footwear — NEVER barefoot (heels for elegant, sneakers for casual)"
   - Line 203: Add `barefoot` to FORBIDDEN line

3. **ACCESSORY** (line 230-241):
   - Line 230: Already says "shoes" in requirements — strengthen to "Model must be wearing full clothing (top, bottom, shoes) — NEVER barefoot"
   - Line 241: Add `barefoot` to FORBIDDEN line

### Specific Line Changes

| Line | Current FORBIDDEN | Updated FORBIDDEN |
|---|---|---|
| 125 | `...bare torso, focusing on the top instead of the BOTTOM` | `...bare torso, barefoot, focusing on the top instead of the BOTTOM` |
| 203 | `...shapewear worn alone, bikini-like appearance` | `...shapewear worn alone, bikini-like appearance, barefoot` |
| 241 | `...clothing overshadowing the accessory` | `...clothing overshadowing the accessory, barefoot` |

### Files Modified
1. `supabase/functions/outfit-swap/index.ts` — add "barefoot" to FORBIDDEN lines + strengthen footwear instructions in FULL_OUTFIT and ACCESSORY prompts

