# Product Swap Module — Plan

A new module that takes a **reference scene image** (with an existing product) and a **new product image**, and generates a new image where only the product is swapped — preserving scene, lighting, model, and composition. Audience and scenario are required and steer subtle styling, exactly like the UGC Creator panel.

## User Flow

1. User opens **Product Swap** from the module selection grid.
2. **Step 1 — Reference scene**: pick from Library (their generated UGC/photoshoot images) OR upload a new image. Tabbed picker.
3. **Step 2 — New product image**: upload from device or pick from existing source images.
4. **Step 3 — Audience + Scenario** (required, mirrors UGC Creator): textareas with the existing **Saved Audiences** and **Saved Scenarios** modals already built.
5. **Step 4 — Resolution / aspect ratio** (1K/2K/4K, same tier rules and free-tier locks).
6. Submit → credit deduction (1/2/3) → job runs → result appears in Library with a `product_swap` source tag.

## Data Model

New table `product_swap_jobs`:

- `id`, `user_id`, `status` (queued/processing/completed/failed/canceled), `progress`
- `reference_image_id` (nullable FK to `generated_images` or `ugc_images`) + `reference_image_url`
- `new_product_image_id` (FK to `source_images`) + `new_product_image_url`
- `audience` text, `scenario` text
- `settings` jsonb (size, aspect_ratio, resolution_tier)
- `result_image_id` (FK to `generated_images` once produced), `result_url`
- `error`, timestamps

RLS: users manage their own rows (`auth.uid() = user_id`). No new storage bucket — reuse `source-images` for uploads and write results to `generated-images`.

## Backend — Edge Function `product-swap`

New function at `supabase/functions/product-swap/index.ts`, `verify_jwt = false` with manual JWT validation (project standard).

Responsibilities:
1. Validate inputs (Zod): `referenceImageUrl`, `newProductImageUrl`, `audience`, `scenario`, `settings`.
2. Pre-flight: check credits via `deduct_user_credits` (cost from `get_image_credit_cost` based on resolution).
3. Create `product_swap_jobs` row, status `processing`.
4. Build a **Gemini multi-image prompt** (using existing `Nano banana` pattern) that sends BOTH images:
   - Image 1: reference scene
   - Image 2: new product (isolated)
   - Text prompt: imperative "MANDATORY RULES" — preserve scene, lighting, model, framing; replace ONLY the product currently held/worn/displayed with the new product from Image 2; maintain pattern fidelity, true colors, proportions; respect audience tone and scenario context.
5. On success: upload result to `generated-images`, insert into `generated_images` with `metadata.source = 'product_swap'`, update job row, return URL. On failure: refund credits.
6. Auto-save audience/scenario into `custom_audiences` / `custom_scenarios` (reuse existing pattern from UGC panel).

## Frontend

**New files:**
- `src/pages/ProductSwap.tsx` — main page, 4-step layout matching the visual style of `OutfitSwap.tsx` and `CreateUGCGeminiBase.tsx`.
- `src/api/product-swap-api.ts` — `createJob`, `getJob`, `subscribeToJob` (mirrors `outfit-swap-api.ts`).
- `src/hooks/useProductSwap.ts` — job state machine (setup → processing → results), realtime subscription.
- `src/components/product-swap/ReferenceImagePicker.tsx` — tabs: Library | Upload (reuses `useLibraryImages`, `useSourceImageUpload`).
- `src/components/product-swap/NewProductPicker.tsx` — upload + existing source images grid.

**Edits:**
- `src/App.tsx` — add lazy route `/product-swap`.
- `src/pages/ModuleSelection.tsx` — add Product Swap tile (icon: `Replace` from lucide).
- Sidebar/nav components — add link.
- `src/i18n/locales/{en,pt,es,fr,de}.json` — add `productSwap.*` strings (5 languages, mandatory).

**Reuse without modification:**
- `SavedAudiencesModal`, `SavedScenariosModal`, `useCustomAudiences`, `useCustomScenarios`
- `aspectSizes.ts`, `useCredits`, free-tier lock pattern (Crown icon)
- Mobile modal pattern (`h-[100dvh]`, sticky footer)

## Credit & Tier Rules (per project memory)

- 1K = 1 credit, 2K = 2, 4K = 3.
- Free tier: 1K only, locked aspect ratios 9:16 and 4:5.
- Single output image per job.

## Out of Scope (v1)

- Batch / multi-product swap.
- Variations (>1 output image).
- Auto-detection of product type / category.
- API gateway exposure (can be added later).

## Technical Risks

- **Gemini fidelity**: swapping a product while preserving pose/hand grip is the hardest case. Prompt must include strong "PATTERN FIDELITY" + "preserve grip/contact points" rules. Will iterate on prompt after first end-to-end test.
- **Reference image URL access**: Library images are already public URLs in `generated-images` bucket — Gemini can fetch them directly, no signing needed.

## Files Touched (summary)

- New migration: `product_swap_jobs` table + RLS.
- New: `supabase/functions/product-swap/index.ts`, `supabase/config.toml` entry.
- New: `src/pages/ProductSwap.tsx`, `src/api/product-swap-api.ts`, `src/hooks/useProductSwap.ts`, 2 picker components.
- Edited: `src/App.tsx`, `src/pages/ModuleSelection.tsx`, sidebar nav, 5 i18n locale files.
