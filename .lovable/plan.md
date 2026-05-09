## Goal

Mirror the existing "Saved Scenarios" feature for **Audience**, so users can pick a previously used audience instead of retyping it for every new product.

## What exists today (reference pattern)

- **Table**: `custom_scenarios` (`id`, `user_id`, `title`, `description`, `used_at`, `created_at`) with RLS "Users manage own scenarios".
- **Hook**: `src/hooks/useCustomScenarios.ts` — list (top 20 by `used_at`), upsert-on-use (updates `used_at` if same description exists), delete.
- **Modal**: `src/components/SavedScenariosModal.tsx` — list with title + truncated description, click to select, delete button on hover.
- **Trigger**: a button under the custom-scenario textarea opens the modal.
- **Save trigger**: in `CreateUGCGeminiBase.tsx` at line 929, `saveScenario({ title, description })` is called automatically when a generation is submitted with a custom scenario.

## Plan: Saved Audiences (same pattern)

### 1. Database (new migration)

Create `custom_audiences` table:
- `id` uuid PK
- `user_id` uuid (not FK to auth.users)
- `label` text (short name shown in the list — first ~40 chars of audience or auto-derived)
- `audience` text (full audience text, max 500 to match input)
- `used_at` timestamptz default `now()`
- `created_at` timestamptz default `now()`
- Unique index on `(user_id, audience)` to keep the upsert-on-use logic simple.

RLS: single policy "Users manage own audiences" — `auth.uid() = user_id` for ALL on `authenticated`.

### 2. Hook

`src/hooks/useCustomAudiences.ts` — copy of `useCustomScenarios.ts`:
- `useQuery` returning top 20 ordered by `used_at desc`.
- `saveAudience({ label, audience })` — if exact `audience` exists for user, update `used_at` + `label`; else insert.
- `deleteAudience(id)`.
- React Query key `['custom-audiences', user?.id]`, `staleTime: 60_000`.

### 3. Modal component

`src/components/SavedAudiencesModal.tsx` — copy of `SavedScenariosModal.tsx`:
- Same Dialog + ScrollArea + list-item layout.
- Title uses `Users` icon (lucide) instead of `Clock`.
- `onSelect(audience: string)` populates the audience textarea and closes.
- Inline delete button per item.

### 4. UI integration in `CreateUGCGeminiBase.tsx`

- Add state `savedAudiencesOpen` and `useCustomAudiences()`.
- Next to the existing "Audience" `Label` (line 1191), add a small **"Saved audiences"** ghost button (Users icon) that opens the modal — only visible when the user has at least 1 saved audience (or always, with empty state).
- On modal `onSelect`, call `handleAudienceChange(value)` so the existing textarea logic (length counter, scenario-fetch enable) stays intact.
- **Auto-save on use**: in the same `handleSubmit` block where `saveScenario` is called (around line 929), also call `saveAudience({ label: desiredAudience.slice(0, 60), audience: desiredAudience.trim() })` when `desiredAudience.trim()` is non-empty. This guarantees only audiences actually used for a generation get saved (matches scenarios behavior).

### 5. i18n

Add strings under `ugc.savedAudiences` (`title`, `loading`, `empty`, optionally `openButton`) to all 5 locale files (en, pt, es, fr, de).

### 6. Apply the same to `CreateUGCGeminiV3` if it has its own audience input

Quick check — if `CreateUGCGeminiV3.tsx` uses the same `CreateUGCGeminiBase`, no extra work needed; otherwise add the same wiring.

## Files touched

- New: `supabase/migrations/<timestamp>_custom_audiences.sql`
- New: `src/hooks/useCustomAudiences.ts`
- New: `src/components/SavedAudiencesModal.tsx`
- Edit: `src/pages/CreateUGCGeminiBase.tsx` (button next to Label, modal mount, save-on-submit)
- Edit: `src/i18n/locales/{en,pt,es,fr,de}.json`

## Out of scope

- Editing saved audiences (only select/delete, like scenarios).
- Sharing audiences across users.
- Migration of historical generations into saved audiences.
