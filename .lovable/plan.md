

## Fix: Floating Onboarding Card Layout

### Issues Identified from Screenshot

1. **Collapse button positioning**: The chevron (collapse) button is positioned independently in `FloatingOnboardingCard.tsx` at `right-12`, causing it to overlap awkwardly with the X (close) button in the header
2. **Header button alignment**: Need to integrate collapse and close buttons into a single cohesive button group in the header
3. **Visual hierarchy**: The header needs cleaner organization with the collapse chevron and close button properly aligned on the right side

---

### Current vs Expected Layout

**Current (broken):**
```
| Rocket + Getting Started          X |  <- X button in OnboardingChecklist
|                           ⌄         |  <- Chevron overlay from FloatingCard (mispositioned)
```

**Expected (fixed):**
```
| Rocket + Getting Started    ⌄   X | <- Both buttons aligned together
```

---

### Solution

Move the collapse functionality **into** the `OnboardingChecklist` component header by passing an `onCollapse` prop, removing the absolute positioned overlay button from `FloatingOnboardingCard`.

---

### Technical Changes

#### 1. Update `OnboardingChecklist.tsx`

Add a new optional `onCollapse` prop that, when provided, renders a collapse (chevron down) button next to the X button in the header:

```typescript
interface OnboardingChecklistProps {
  onComplete?: () => void;
  onCollapse?: () => void;  // NEW: allows floating card to pass collapse handler
}

// In the CardHeader, modify the button group:
<div className="flex items-center gap-1">
  {onCollapse && (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={onCollapse}
      className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  )}
  <Button 
    variant="ghost" 
    size="sm"
    onClick={handleSkip}
    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 -mr-2"
  >
    <X className="h-4 w-4" />
  </Button>
</div>
```

#### 2. Update `FloatingOnboardingCard.tsx`

- Remove the absolute positioned collapse button overlay (lines 74-81)
- Pass `onCollapse` prop to `OnboardingChecklist`

```typescript
// Remove this block:
{/* <button
  onClick={() => setIsCollapsed(true)}
  className="absolute top-3 right-12 z-10 ..."
>
  <ChevronDown className="h-4 w-4" />
</button> */}

// Add onCollapse prop:
<OnboardingChecklist 
  onComplete={refetch} 
  onCollapse={() => setIsCollapsed(true)}  // NEW
/>
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/onboarding/OnboardingChecklist.tsx` | Add `onCollapse` prop and render collapse button in header next to X |
| `src/components/onboarding/FloatingOnboardingCard.tsx` | Remove absolute overlay button, pass `onCollapse` to checklist |

---

### Summary

This fix integrates the collapse button directly into the card's header alongside the close button, rather than positioning it as an absolute overlay. This ensures proper alignment and prevents the visual overlap issue shown in the screenshot.

