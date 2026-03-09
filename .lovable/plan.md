

## Onboarding Redesign: 3-Step Pack-Based Flow with Fashion Detection

### Flow

```text
Step 1: Upload product photo (existing OnboardingStep1)
        → After upload, auto-detect if fashion via Gemini API call
Step 2: Pick a Pack (NEW — OnboardingPackSelect)
        → 3 cards: E-commerce / Social Media / Advertisement
        → Content of each card adapts based on isFashion flag
Step 3: Results Gallery (rewritten OnboardingResults)
        → 4 images generated in parallel via UGC-Gemini
        → Each image uses a different style prompt from the selected pack
        → Displayed in 2×2 grid with type labels
        → Pricing offer on completion
```

### Fashion Detection

After the user uploads their product image in Step 1, we call the existing `ugc-gemini` edge function (or a lightweight new one) to ask Gemini:

> "Preciso que me analises esta imagem e detetes se este produto é moda/vestuário ou não? responde diretamente dizendo 'yes' ou 'no'"

This happens transparently while transitioning to Step 2. The result (`isFashion: boolean`) is stored in `OnboardingData` and determines which pack configuration to show.

We'll create a small edge function `analyze-product-type` that receives the source image URL and returns `{ isFashion: boolean }` using the Gemini API. This keeps it fast and isolated.

### Pack Definitions

**Fashion packs:**

| Pack | Style 1 | Style 2 | Style 3 | Style 4 | Ratio |
|------|---------|---------|---------|---------|-------|
| E-commerce | Hero product (model, clean bg) | Catalog clean (invisible mannequin) | Detail macro (close-up texture) | Model neutral (natural pose) | 1:1 |
| Social Media | Lifestyle scene | Influencer style | Street style | Casual scene | 4:5 (3:4) |
| Advertisement | Magazine editorial | Campaign shot | Dramatic lighting | Bold background | 4:5 (3:4) |

**Non-fashion (product) packs:**

| Pack | Style 1 | Style 2 | Style 3 | Style 4 | Ratio |
|------|---------|---------|---------|---------|-------|
| E-commerce | Hero packshot (white bg) | Angle variation | Detail macro | Scale context | 1:1 |
| Social Media | Environment scene | Hand interaction | Lifestyle scene | Flat lay | 4:5 (3:4) |
| Advertisement | Floating product | Bold background | Motion scene | Dramatic spotlight | 4:5 (3:4) |

Note: The API supports `3:4` as the closest to `4:5`. We'll use `3:4` for social/ads packs.

### Generation Strategy

All 4 images are generated via `useGeminiImageJobUnified` — **one job with `number: 4`**, using a combined prompt that requests 4 distinct styles. Each style gets its own detailed prompt section within the single job prompt. This is simpler and more reliable than managing 4 parallel jobs.

The prompt will be structured as:
```
Generate 4 distinct product images in the following styles:
IMAGE 1: [style prompt with fashion/product rules]
IMAGE 2: [style prompt]
IMAGE 3: [style prompt]
IMAGE 4: [style prompt]

MANDATORY RULES:
- [fashion rules if isFashion, product rules otherwise]
- Product integrity rules
```

### Files to Create/Change

| File | Change |
|------|--------|
| `src/data/onboarding-packs.ts` | **New** — Pack configs for fashion + product, with style prompts and ratios |
| `src/components/onboarding/OnboardingPackSelect.tsx` | **New** — 3 visual pack cards (E-commerce, Social Media, Advertisement) with style previews |
| `src/components/onboarding/OnboardingResults.tsx` | Rewrite: generate 4 images from pack config, show in labeled 2×2 grid |
| `src/components/onboarding/OnboardingWizard.tsx` | Update step mapping: 0=Welcome, 1=Upload, 2=PackSelect, 3=Results. Add fashion detection between step 1→2 |
| `src/hooks/useOnboarding.ts` | Add `selectedPack`, `isFashion` to `OnboardingData` |
| `supabase/functions/analyze-product-type/index.ts` | **New** — Lightweight edge function: sends image to Gemini with "yes/no" fashion question |
| `src/i18n/locales/en.json` | Add translations for pack names, style labels |
| `src/i18n/locales/pt.json` | Add Portuguese translations |

### Technical Details

**Edge function `analyze-product-type`:**
- Receives `{ sourceImageUrl: string }`
- Fetches image, sends to Gemini with the exact Portuguese prompt
- Parses response for "yes" or "no"
- Returns `{ isFashion: boolean }`
- Uses `GOOGLE_AI_API_KEY` (already available)

**OnboardingWizard step flow:**
```tsx
// After step 1 upload completes:
nextStep({ imageUrl, sourceImageId });
// In wizard, between step 1→2: trigger fashion detection
// Store result in onboarding data before rendering step 2
```

**Pack prompts — fashion example (E-commerce):**
```ts
{
  id: 'ecommerce',
  ratio: '1:1',
  styles: [
    { id: 'hero_product', prompt: 'Professional catalog hero shot. Product displayed on model in clean studio. Neutral background, even lighting. Full product visibility.' },
    { id: 'catalog_clean', prompt: 'Clean catalog photo. Product on invisible mannequin or ghost mannequin. Pure white background. E-commerce ready.' },
    { id: 'detail_macro', prompt: 'Extreme close-up macro shot. Focus on texture, stitching, material quality. Shallow depth of field.' },
    { id: 'model_neutral', prompt: 'Model wearing product in neutral standing pose. Minimal background. Natural expression. Catalog style.' }
  ]
}
```

**Fashion mandatory rules injected into every prompt:**
```
MANDATORY: Product MUST be displayed on a model or invisible mannequin.
NEVER lay flat on any surface, table, or floor.
NEVER show the product folded or crumpled.
```

**Product mandatory rules:**
```
Display product standing, floating, or on appropriate surface.
Professional product catalog photography style.
Clean, well-lit composition.
```

### What Does NOT Change
- `OnboardingGuard` stays disabled (not reactivating per user request)
- `OnboardingStep1` (upload) stays as-is
- Welcome step (step 0) stays as-is
- No database schema changes needed
- Existing UGC generation edge function reused as-is

