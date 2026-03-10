

## Upgrade Onboarding Prompts Using Proven Module Templates

### Problem
The onboarding pack prompts are generic and produce mediocre results. Meanwhile, the Outfit Swap module (fashion) and Bulk Background module (products) already have battle-tested prompts that deliver much better output.

### Strategy

**Fashion packs** → Adapt Outfit Swap's detailed imperative style with PATTERN FIDELITY, model preservation, and garment-specific rules. Since onboarding only provides one source image (not two like Outfit Swap), the prompts will reference "the product in the reference image" instead of "IMAGE 2."

**Product packs** → Adapt Bulk Background's `BASE_PROMPT` style (ultra-realistic studio, exact proportions, no CGI) but enhanced with premium "wow" elements: dramatic lighting, cinematic depth of field, and aspirational scene staging.

### Changes — Single File

**`src/data/onboarding-packs.ts`**

1. Replace `FASHION_RULES` with a comprehensive block adapted from Outfit Swap:
   - Model/mannequin mandatory display
   - PATTERN FIDELITY section (exact fabric reproduction)
   - Complete outfit requirement (no bare legs/underwear)
   - Natural human anatomy

2. Replace `PRODUCT_RULES` with an enhanced block adapted from Bulk Background:
   - Ultra-realistic studio photography mandate
   - Exact geometric proportions preserved
   - No CGI/3D reconstruction
   - Soft grounded shadows, natural lens

3. Rewrite all 24 style prompts (12 fashion + 12 product) using the imperative `MANDATORY RULES` format that works with Gemini 3 Pro:
   - Fashion styles: detailed model direction, framing, garment focus hierarchy
   - Product styles: enhanced with premium "wow" — dramatic lighting, particle effects, cinematic DOF, aspirational environments

4. Update `buildPackPrompt()` to output a stronger structured prompt with numbered mandatory rules rather than loose paragraphs.

### Example — Fashion Style (Before vs After)

**Before:**
```
Professional catalog hero shot. Product displayed on a model in a clean studio environment...
```

**After:**
```
TASK: Professional catalog hero shot.
MANDATORY RULES:
1. The EXACT product from the reference image MUST be worn by a model
2. Clean studio environment, neutral solid background, soft even studio lighting
3. Full product visibility — the garment is the VISUAL HERO
4. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture, colors from the reference — do NOT interpret or reimagine
5. Model must have natural anatomy, relaxed expression
6. Complete outfit: add neutral complementary pieces (simple jeans/pants, basic shoes) that do NOT distract
FORBIDDEN: Flat-lay, folded product, bare torso, underwear visible, product on surface
```

### Example — Product Style (Before vs After)

**Before:**
```
Professional hero packshot. Product standing or floating on pure white background...
```

**After:**
```
TASK: Premium hero packshot — ultra-realistic studio product photography.
MANDATORY RULES:
1. Product from the reference image is the ONLY object — exact proportions preserved, no stretching or warping
2. Pure white seamless background with soft professional studio lighting
3. Product standing or elegantly floating with soft grounded shadow — NO harsh shadows
4. Cinematic shallow depth of field drawing eye to product
5. Natural lens perspective — NO CGI, NO 3D reconstruction artifacts
6. Exact product colors, branding, labels, and surface details preserved from reference
FORBIDDEN: Multiple products, text overlays, watermarks, AI artifacts, distorted geometry
```

### Files

| File | Action |
|------|--------|
| `src/data/onboarding-packs.ts` | Rewrite rules blocks + all 24 style prompts + improved `buildPackPrompt()` |

