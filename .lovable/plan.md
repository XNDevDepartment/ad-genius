

# Transform Bulk Background Layout to Vertical Flow

## Overview

Change the Bulk Background page from a step-based wizard (showing one step at a time) to a vertical, narrow layout like the Create UGC module, where sections appear progressively as the user completes each one, with smooth scrolling to new sections.

## Layout Changes

### Current: Step Wizard
- Only one step visible at a time
- Navigation buttons (Back/Next) at the bottom
- Horizontal progress indicator with numbered circles
- Full-width `max-w-4xl` container

### New: Vertical Flow
- All completed + current sections visible simultaneously
- Sections appear as previous ones are filled in
- Smooth auto-scroll to newly revealed sections
- Narrow container matching UGC module (`lg:col-span-7` within a 12-col grid)
- No Back/Next navigation buttons -- flow is continuous
- Remove the step progress indicator (numbered circles + progress bar)

## Behavior

1. **Upload section** -- always visible
2. **Background picker** -- appears when at least 1 image is uploaded, smooth-scrolls into view
3. **Review + Start** -- appears when a background is selected, smooth-scrolls into view. Shows cost summary and "Start Processing" button inline
4. **Processing/Results** -- replaces review section content when processing starts

## Technical Details

### File: `src/pages/BulkBackground.tsx`

**Remove:**
- Step-based `{step === 1 && ...}` conditional rendering
- `Step` type and `goToStep` function
- Progress indicator (numbered circles, Progress bar)
- Back/Next navigation buttons at the bottom
- `stepTitles` array

**Replace with:**
- All sections rendered based on data state (e.g., `productImages.length > 0` shows background picker)
- `useRef` for each section + `useEffect` to auto-scroll when sections become visible
- Narrow centered layout: wrap content in `lg:grid lg:grid-cols-12 lg:gap-8` with main content in `lg:col-span-7` (or similar `max-w-2xl mx-auto`)
- Keep `step` state only for tracking processing (step 4), but sections 1-3 are always visible when data allows

**Add:**
- `backgroundRef`, `reviewRef` -- refs for smooth scroll targets
- `useEffect` watchers that scroll to new sections when `productImages.length` changes from 0 to >0, and when background is selected
- `scroll-mt-6` class on section Cards for scroll offset

**Keep unchanged:**
- All business logic (upload, background selection, processing, download)
- `useBulkBackgroundJob` hook usage
- Credit calculations
- Processing/results UI (step 4 content)

### Visual Structure

```text
+------ narrow column (max-w-2xl) ------+
|                                        |
|  [Back] Bulk Background                |
|  subtitle                              |
|                                        |
|  +----------------------------------+  |
|  | Upload Product Images            |  |
|  | [MultiImageUploader]             |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |  <- appears when images uploaded
|  | Select Background                |  |
|  | [BackgroundPicker]               |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |  <- appears when bg selected
|  | Review & Process                 |  |
|  | 5 images x 2 credits = 10       |  |
|  | [Start Processing]              |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |  <- replaces review on process
|  | Processing... 3/5               |  |
|  | [results grid]                  |  |
|  +----------------------------------+  |
|                                        |
+----------------------------------------+
```
