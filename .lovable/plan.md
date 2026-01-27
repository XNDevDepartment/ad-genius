

## Fix Onboarding Checklist Layout for Longer Translations

### Problem

When switching to Portuguese, the milestone item for "Outfit Swap" breaks the layout because:
1. Portuguese title "Crie o seu primeiro Outfit Swap" is longer than English "Create your first Outfit Swap"
2. The current flex layout doesn't handle text wrapping properly
3. The "+5" badge, title, and CTA button compete for space in a single row

### Root Cause

In `MilestoneItem` component (lines 230-252), the title and badge are in a horizontal flex container:
```tsx
<div className="flex items-center gap-2">
  <h4>...</h4>
  <span>+5</span>  {/* Badge */}
</div>
```

When the title wraps, the badge stays inline causing awkward alignment.

### Solution

Restructure the layout to be more resilient to longer text:

1. **Stack title and badge vertically on small widths** - Allow the title to wrap naturally without affecting the badge
2. **Make the title use `line-clamp-2`** - Allow 2 lines maximum instead of truncating to 1 line
3. **Move badge to a fixed position** - Place the "+5" indicator as a flex-shrink-0 element

### Technical Changes

**File: `src/components/onboarding/OnboardingChecklist.tsx`**

Update the `MilestoneItem` component's content section (lines 229-252):

```tsx
{/* Content */}
<div className="flex-1 min-w-0 overflow-hidden">
  <div className="flex items-start justify-between gap-2">
    <h4 className={cn(
      "font-medium text-sm line-clamp-2",
      state.credited ? "text-primary" : "text-foreground"
    )}>
      {title}
    </h4>
    <div className="flex-shrink-0">
      {state.credited && (
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
          +5 ✓
        </span>
      )}
      {!state.credited && !isLocked && (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          +5
        </span>
      )}
    </div>
  </div>
  <p className="text-xs text-muted-foreground mt-0.5 truncate">
    {description}
  </p>
</div>
```

Key changes:
- Changed `items-center` to `items-start` so badge stays at top when title wraps
- Added `justify-between` to push badge to the right edge
- Wrapped badge in a `flex-shrink-0` div to prevent it from shrinking
- Added `whitespace-nowrap` to badge spans to prevent badge text from wrapping
- Changed title from `truncate` (implied by single line) to `line-clamp-2` to allow 2 lines
- Added `overflow-hidden` to the content container for proper clipping

### Files to Modify

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingChecklist.tsx` | Restructure MilestoneItem content layout to handle longer translations |

### Visual Result

**Before (broken in Portuguese):**
```
| [icon] | Crie o seu      | +5  Experimentar > |
|        | primeiro        |                    |
|        | Outfit          |                    |
|        | Swap            |                    |
```

**After (fixed):**
```
| [icon] | Crie o seu primeiro    +5 | Experimentar > |
|        | Outfit Swap                |                |
|        | Experimente roupas...      |                |
```

The title can now span up to 2 lines, the badge stays right-aligned at the top, and the CTA button remains properly positioned on the right.

