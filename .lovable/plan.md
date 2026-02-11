

# Outfit Swap: Mobile Vertical Layout with Smooth Scrolling

## Overview
Replace the current step-based navigation (Step 1 / Step 2 with a "Continue" button) with a vertical progressive-disclosure layout matching the Bulk Background module. On mobile, all sections appear vertically as prerequisites are met, with smooth auto-scrolling to newly revealed sections. The step indicator and explicit "Continue" / "Back" buttons are removed.

## Current Problem
- Step 1 shows the model selector; after selecting a model, the "Continue" button is below the scroll area and users can't find it
- The step-based approach hides the garment uploader until the user explicitly clicks "Continue"
- Mobile users get stuck because they don't realize they need to scroll down

## New Behaviour
- **Section 1 (Select Model)**: Always visible, wrapped in a Card (matching Bulk Background style)
- **Section 2 (Upload Garments)**: Appears automatically once a model is selected, with smooth scroll into view
- **Section 3 (Review & Start)**: Appears automatically once garments are uploaded, with smooth scroll into view
- No step indicator, no "Continue" / "Back" buttons
- A "Change Model" link inside Section 2 header lets users go back (scrolls to top and clears model)

## Technical Changes

### File: `src/pages/OutfitSwap.tsx`

1. **Remove step state**: Delete `currentStep` state and all step indicator UI (the numbered circles at lines 203-219)

2. **Remove step-based conditional rendering**: Instead of `{currentStep === 1 && ...}` and `{currentStep === 2 && ...}`, show sections based on data readiness:
   - Model selector: always visible
   - Garment uploader: visible when `selectedModel !== null`
   - Review + Start button: visible when `selectedModel !== null && garmentFiles.length > 0`

3. **Add scroll refs** (same pattern as BulkBackground):
   - `garmentRef` for the garment upload section
   - `reviewRef` for the review/start section

4. **Add smooth scroll effects** (same pattern as BulkBackground):
   - When `selectedModel` changes from null to a value, scroll to `garmentRef`
   - When `garmentFiles.length` changes from 0 to >0, scroll to `reviewRef`

5. **Wrap sections in Cards** with `rounded-apple shadow-lg scroll-mt-6` classes to match Bulk Background styling

6. **Remove "Continue" and "Back" buttons**: Replace with a small "Change Model" button in the garment section header (same as BulkBackground's "Change Background" pattern)

7. **Keep the batch preview logic unchanged** (the `batch || replicateMode` branch stays as-is)

### No translation changes needed
All existing translation keys are reused; only the layout/flow changes.

### No other files affected
`BaseModelSelector`, `MultiGarmentUploader`, `OutfitSwapSettings`, and `BatchSwapPreview` remain untouched.

