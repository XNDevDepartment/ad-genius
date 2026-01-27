

## Move Onboarding Checklist to a Floating Card

### Overview

Transform the onboarding checklist from an inline component (that replaces "Your Activity") into a **floating, collapsible card** fixed in the **bottom-right corner** of the screen on desktop only.

---

### Current Implementation

| Aspect | Current State |
|--------|---------------|
| Location | Embedded inside `Index.tsx` at `lg:col-span-5`, replacing `UserStatsPanel` |
| Visibility | Only on desktop, when onboarding not completed |
| Behavior | Static, non-collapsible |

---

### Proposed Changes

#### 1. Create New Floating Component

Create a new wrapper component `FloatingOnboardingCard.tsx` that:
- Wraps the `OnboardingChecklist` in a fixed position container
- Adds collapse/expand functionality with smooth animation
- Persists collapsed state to localStorage
- Only renders on desktop (uses `useIsMobile()` hook)
- Uses Radix Collapsible for toggle behavior

**Position**: `fixed bottom-6 right-6 z-50`

**Features**:
- Collapsible header showing "Getting Started" with progress indicator
- When collapsed: shows only a small floating button/badge with progress
- When expanded: shows the full checklist card
- Smooth Framer Motion animations for open/close

---

#### 2. Update Index.tsx

- Remove the conditional OnboardingChecklist rendering from the grid layout
- Always show `UserStatsPanel` in the right column
- The floating card will render independently via `AppLayout.tsx`

---

#### 3. Update AppLayout.tsx

- Import and render `FloatingOnboardingCard` inside the desktop authenticated layout
- This ensures the floating card appears on ALL pages (not just Index), which is better UX for onboarding

---

### Technical Implementation

```text
New File: src/components/onboarding/FloatingOnboardingCard.tsx

Structure:
- Fixed positioning: bottom-6 right-6 z-50
- Collapsible wrapper with state persistence
- Collapsed view: Small badge with rocket icon + "X/4 completed"
- Expanded view: Full OnboardingChecklist card
- Animation: Framer Motion scale/opacity transitions
- Desktop only: Early return null if isMobile
```

**Collapsed State UI (when minimized):**
```
+----------------------------+
| 🚀 Getting Started   ⌄    |
|    2/4 completed          |
+----------------------------+
```

**Expanded State UI (full card):**
```
+----------------------------+
| 🚀 Getting Started    ×   |
| Earn 20 free credits      |
| [progress bar]            |
|                           |
| [ ] Create UGC image   →  |
| [✓] Animate image      →  |
| [ ] Outfit Swap        →  |
| [ ] Bonus (locked)        |
|                           |
| Skip and explore freely   |
+----------------------------+
```

---

### Files to Modify

| File | Action |
|------|--------|
| `src/components/onboarding/FloatingOnboardingCard.tsx` | **CREATE** - New floating wrapper component |
| `src/pages/Index.tsx` | **MODIFY** - Remove OnboardingChecklist from grid, always show UserStatsPanel |
| `src/components/AppLayout.tsx` | **MODIFY** - Add FloatingOnboardingCard to desktop authenticated layout |

---

### Component Structure

```typescript
// FloatingOnboardingCard.tsx
export const FloatingOnboardingCard = () => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(() => 
    localStorage.getItem('onboarding_card_collapsed') === 'true'
  );
  const { completed, loading } = useOnboarding();
  const { completedCount } = useOnboardingMilestones();

  // Don't render on mobile or if onboarding is complete
  if (isMobile || completed || loading) return null;

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('onboarding_card_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <CollapsedView onClick={() => setIsCollapsed(false)} count={completedCount} />
        ) : (
          <ExpandedView onCollapse={() => setIsCollapsed(true)} onComplete={...} />
        )}
      </AnimatePresence>
    </div>
  );
};
```

---

### Key Features

1. **Collapsible**: Users can minimize the card to a small badge
2. **Persistent**: Collapsed state saved to localStorage
3. **Global**: Appears on all pages (not just home)
4. **Non-intrusive**: Floats in corner, doesn't push content
5. **Animated**: Smooth open/close transitions with Framer Motion
6. **Auto-hide**: Disappears completely when onboarding is finished

---

### Summary

This transforms the onboarding checklist from a content-replacing panel into a helpful floating widget that follows users across the app, can be minimized when not needed, and provides persistent access to the onboarding milestones without taking up valuable screen real estate.

