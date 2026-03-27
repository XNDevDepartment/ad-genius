

## Make Custom Scenarios Button More Prominent

### Problem
The "Previous Scenarios" button is a small ghost icon (`Clock`) absolutely positioned in the corner of the textarea — easy to miss.

### Change

**File: `src/pages/CreateUGCGeminiBase.tsx`** (lines 1225-1233)

Replace the small ghost icon button with a full-width outlined button placed **below the textarea** (outside the `relative` div), styled with the primary color and a clear label:

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2"
  onClick={(e) => { e.stopPropagation(); setSavedScenariosOpen(true); }}
>
  <Clock className="h-4 w-4" />
  {t('ugc.savedScenarios.title')}
</Button>
```

- Remove the `absolute top-1 right-1` positioning from inside the textarea wrapper
- Place the button as a sibling after the textarea `div`, so it's clearly visible
- Uses `variant="outline"` with primary color border for visual emphasis
- Shows the translated label text next to the icon

### Files Modified
1. `src/pages/CreateUGCGeminiBase.tsx` — restyle and reposition the saved scenarios button

