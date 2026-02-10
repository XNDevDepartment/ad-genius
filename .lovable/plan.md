

# Bulk Background: Desktop Layout + New Job After Completion

## Changes

### 1. Wider desktop layout (match Outfit Swap style)
**File:** `src/pages/BulkBackground.tsx`

Currently the page uses `max-w-2xl` for all screen sizes. Change to:
- Mobile: keep the narrow vertical layout as-is
- Desktop (`lg:`): widen to `max-w-5xl` (similar to Outfit Swap's `max-w-7xl container`)
- Keep the vertical single-column flow (no side-by-side panels)
- Add responsive padding: `px-4 py-4 lg:py-8`

The outer wrapper changes from:
```
max-w-2xl mx-auto
```
to:
```
max-w-2xl lg:max-w-5xl mx-auto
```

### 2. Mobile optimization
- Reduce padding on mobile for cards (`p-4` on mobile, `p-6 lg:p-8` on desktop)
- Make the header more compact on mobile (smaller text, tighter gaps)
- Results grid: `grid-cols-2` on mobile, `sm:grid-cols-3 lg:grid-cols-4` on desktop

### 3. "New Background" flow after job completion
Currently `handleNewBatch` resets everything including uploaded product images. Add a second action that keeps the uploaded images but lets the user pick a new background:

- Add a **"Change Background"** button alongside "New Batch" and "Download All" in the completion section
- This button clears only the background selection, prompt, and job state -- but keeps `productImages` intact
- The user scrolls back up to the background picker to choose a new background and start again
- Add translation keys for the new button

### Technical Details

**File:** `src/pages/BulkBackground.tsx`
- Change `max-w-2xl` to `max-w-2xl lg:max-w-5xl` on line 224
- Update results grid from `grid-cols-2 sm:grid-cols-3` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Add `handleChangeBackground` function that resets job/background state but keeps product images
- Add a new button in the completion actions area

**Files:** `src/i18n/locales/en.json`, `pt.json`, `es.json`, `de.json`, `fr.json`
- Add `bulkBackground.buttons.changeBackground` translation key

