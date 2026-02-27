

# Plan: 3 Changes

## 1. Bug Fix: Library picker scroll blocked

The `GarmentLibraryPicker` uses `ScrollArea` with `className="flex-1 min-h-[300px]"` inside a `DialogContent` with `max-h-[85vh] flex flex-col`. The problem is that `ScrollArea` needs an explicit max height to enable scrolling -- `flex-1` alone doesn't constrain it, so the Radix ScrollArea viewport never activates its scrollbar.

**Fix in `src/components/GarmentLibraryPicker.tsx`:**
- Change `ScrollArea` from `className="flex-1 min-h-[300px]"` to `className="flex-1 min-h-[300px] max-h-[60vh]"` so the scroll viewport has a bounded height.
- Also add `overflow-hidden` to the `DialogContent` to prevent the dialog itself from growing beyond bounds.

## 2. Order base models: female first, then by creation date descending

**Fix in `src/hooks/useBaseModels.ts`:**
- Change the `fetchSystemModels` query ordering from `.order("display_order", { ascending: true })` to `.order("gender", { ascending: true }).order("created_at", { ascending: false })`.
- Since "female" < "male" alphabetically, `ascending: true` on gender will naturally put females first.

## 3. Remove garment detection, always use full body framing

The `analyzeGarment` function in `supabase/functions/outfit-swap/index.ts` detects garment category (TOP, BOTTOM, etc.) and picks category-specific prompts that focus on different body parts (e.g., "upper body focus" for tops, "lower body focus" for pants). The user wants full body framing every time.

**Fix in `supabase/functions/outfit-swap/index.ts`:**
- After garment analysis completes (around line 808), override the prompt selection to always use `CATEGORY_SWAP_PROMPTS.FULL_OUTFIT` regardless of detected category.
- Update the `FULL_OUTFIT` prompt's framing instruction (line 178) to be clearer: always full body head-to-toe.
- Update the TOP prompt (line 78) to change framing from "Upper body focus (head to hips)" to "Full body (head to toe)".
- Update the BOTTOM prompt (line 111) to change framing from "Lower body focus (waist to feet)" to "Full body (head to toe)".
- Update the FOOTWEAR prompt (line 145) similarly.
- Simplest approach: on line 808, always use `FULL_OUTFIT` prompt: change `const categoryPrompt = CATEGORY_SWAP_PROMPTS[garmentAnalysis.category] || CATEGORY_SWAP_PROMPTS.FULL_OUTFIT;` to `const categoryPrompt = CATEGORY_SWAP_PROMPTS.FULL_OUTFIT;`.

This keeps the garment analysis for metadata/logging but always generates a full-body result.

### Files to modify
1. `src/components/GarmentLibraryPicker.tsx` -- fix scroll
2. `src/hooks/useBaseModels.ts` -- reorder query
3. `supabase/functions/outfit-swap/index.ts` -- always use FULL_OUTFIT prompt

