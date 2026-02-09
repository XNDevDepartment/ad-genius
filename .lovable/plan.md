
# Add Editable Prompt Field and Thumbnail Images to Background Presets

## Overview

Add representative thumbnail images to each background preset and an editable "Prompt" textarea field (like the UGC scenario description field) that auto-fills when a preset is selected. The user can then edit the prompt before processing.

## Changes

### 1. Map thumbnail images to presets (`src/data/background-presets.ts`)

Each category folder has 4 images matching the 4 presets in order. Add `thumbnail` imports:

- **Studio** (4 presets, 4 images): white-seamless, black-studio, gradient-gray, soft-pink
- **Lifestyle** (4 presets, 4 images): living-room, kitchen, bedroom, home-office
- **Magazine** (4 presets, 4 images): editorial, fashion, minimal, vogue
- **Nature** (4 presets, 4 images): beach, forest, garden, mountain
- **Urban** (4 presets, 4 images): cafe, street, rooftop, subway
- **Seasonal** (4 presets, 4 images): christmas, summer, autumn, spring

Import each image and assign it to the corresponding preset's `thumbnail` field.

### 2. Show thumbnails in BackgroundPresets component (`src/components/bulk-background/BackgroundPresets.tsx`)

Replace the current placeholder `div` (gradient with text) with an actual `img` tag using the preset's `thumbnail` when available. Keep the name overlay and selection indicator as they are.

### 3. Add editable prompt field to BackgroundPicker (`src/components/bulk-background/BackgroundPicker.tsx`)

- Add a new prop: `promptValue: string` and `onPromptChange: (value: string) => void`
- After the `BackgroundPresets` grid (in preset mode), render a `Textarea` similar to the UGC scenario description field:
  - Label: "Prompt" or similar
  - Auto-fills with the selected preset's `prompt` when a preset is clicked
  - Editable by the user
  - Disabled when no preset is selected
  - Styled with `min-h-[80px] rounded-apple-sm`
- Also show the textarea in custom mode (for custom background uploads) so the user can describe their desired result

### 4. Wire prompt state through BulkBackground page (`src/pages/BulkBackground.tsx`)

- Add `backgroundPrompt` state (string)
- When a preset is selected, auto-fill `backgroundPrompt` from `backgroundPresets.find(p => p.id === presetId)?.prompt`
- When custom background is uploaded, set a default prompt like "Place the product on this background with a clean, professional look"
- Pass `backgroundPrompt` and `setBackgroundPrompt` to `BackgroundPicker`
- Include the prompt in the `createJob` call via the `settings` field: `settings: { outputFormat: 'webp', quality: 'high', customPrompt: backgroundPrompt }`

### 5. Update edge function to use custom prompt (`supabase/functions/bulk-background/index.ts`)

- In the `createJob` action, pass `settings.customPrompt` through to the job record (already stored in JSONB `settings` column)
- In `buildPrompt` / where prompt is constructed for Gemini, check if `job.settings.customPrompt` exists and use it instead of auto-building from preset hints
- Fallback to current `buildPrompt` logic if no custom prompt is present

### 6. Update API types (`src/api/bulk-background-api.ts`)

- Add `customPrompt?: string` to the `settings` field of `CreateBulkJobPayload`

## Technical Details

**Prompt flow:**
1. User selects preset -> prompt auto-fills from preset data
2. User optionally edits the prompt text
3. On "Start Processing", the final prompt text is sent in `settings.customPrompt`
4. Edge function uses `settings.customPrompt` as the prompt for Gemini, falling back to the old preset-based prompt building if absent

**No database schema changes needed** -- the `settings` JSONB column can store the custom prompt without migration.
