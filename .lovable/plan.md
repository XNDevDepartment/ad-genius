

## Save & Reuse Custom Scenarios in UGC Module

### Summary
Create a `custom_scenarios` table in Supabase to persist user-written custom scenarios. Add a "Previous Scenarios" button inside the custom scenario textarea area that opens a modal/popover listing saved scenarios for quick selection. Scenarios are auto-saved when used for generation.

### Database

**New table: `custom_scenarios`**
```sql
CREATE TABLE public.custom_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own scenarios
CREATE POLICY "Users manage own scenarios"
  ON public.custom_scenarios FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_custom_scenarios_user ON public.custom_scenarios(user_id, used_at DESC);
```

### Frontend Changes

**1. New component: `src/components/SavedScenariosModal.tsx`**
- Dialog/Sheet listing user's saved scenarios ordered by `used_at DESC`
- Each item shows title (truncated) + description preview
- Click fills the parent textarea
- Swipe-to-delete or trash icon to remove scenarios
- Empty state with message

**2. Modified: `src/pages/CreateUGCGeminiBase.tsx`**
- When `customScenarioMode` is active, add a small `History` (clock icon) button next to the textarea
- On image generation with a custom scenario: upsert the scenario into `custom_scenarios` (deduplicate by description match)
- When user selects a saved scenario from the modal, populate `selectedScenario.description`

**3. Hook: `src/hooks/useCustomScenarios.ts`**
- `fetchScenarios()` — query `custom_scenarios` ordered by `used_at DESC`, limit 20
- `saveScenario(title, description)` — insert or update `used_at` if description already exists
- `deleteScenario(id)` — delete by id
- Uses TanStack Query for caching

**4. i18n keys** (all 5 locale files)
- `ugc.scenarios.savedScenarios` — "Previous Scenarios" / "Cenários Anteriores" / etc.
- `ugc.scenarios.noSavedScenarios` — empty state message
- `ugc.scenarios.deleteSavedScenario` — delete confirmation

### Flow
1. User enters custom scenario mode → writes description → generates images
2. On generation, scenario is auto-saved to `custom_scenarios`
3. Next time user enters custom mode, a clock icon button appears next to the textarea
4. Clicking it opens modal with saved scenarios
5. Selecting one fills the textarea; user can edit before generating

### Files Modified
1. **Migration** — new `custom_scenarios` table + RLS + index
2. `src/hooks/useCustomScenarios.ts` — new hook for CRUD
3. `src/components/SavedScenariosModal.tsx` — new modal component
4. `src/pages/CreateUGCGeminiBase.tsx` — integrate button + auto-save
5. `src/i18n/locales/en.json` — new keys
6. `src/i18n/locales/pt.json` — new keys
7. `src/i18n/locales/es.json` — new keys
8. `src/i18n/locales/fr.json` — new keys
9. `src/i18n/locales/de.json` — new keys

