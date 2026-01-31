

## Outfit-Swap Mobile Layout Fix & Photoshoot CTA Optimization

### Current Issues Identified

1. **Mobile Layout Problems in `BatchSwapPreview.tsx`:**
   - The result card actions use a 2x3 grid (`grid-cols-2`) that becomes cramped on mobile
   - All 6 buttons (Preview, Open, Animate, E-commerce, Photoshoot, Download) have equal visual weight
   - The Photoshoot button is buried among other options instead of being highlighted
   - No mobile-specific detection - same layout for all screen sizes

2. **Mobile Layout in `OutfitSwap.tsx`:**
   - Step indicators and headers could be more compact on mobile
   - The "Continue" and "Start Batch" buttons need better mobile positioning (sticky/fixed bottom)

3. **Permissions - VERIFIED CORRECT:**
   - `outfit_swap_jobs`: Users can INSERT, SELECT, UPDATE their own jobs
   - `outfit_swap_results`: Users can INSERT, SELECT, UPDATE, DELETE their own results
   - `outfit_swap_photoshoots`: Users can INSERT, SELECT, UPDATE their own photoshoots
   - No tier restrictions - all authenticated users (including Free) can use these features

---

### Solution Architecture

#### 1. Result Card Action Redesign (`BatchSwapPreview.tsx`)

**Current layout (all 6 buttons equal):**
```
[Preview] [Open]
[Animate] [E-commerce]
[Photoshoot] [Download]
```

**New mobile-optimized layout (Photoshoot highlighted):**
```
┌─────────────────────────────────────┐
│    📸 CREATE PHOTOSHOOT             │  ← Featured CTA (full width, highlighted)
│    Generate 4 professional angles   │
└─────────────────────────────────────┘
[Preview] [Open] [Download]              ← Primary actions (compact row)
[Animate] [E-commerce]                   ← Secondary actions (compact row)
```

**Desktop maintains current layout with Photoshoot highlighted in the grid.**

#### 2. Mobile-Specific Enhancements

| Component | Change |
|-----------|--------|
| Header section | Compact on mobile, hide secondary text |
| Action buttons | Sticky bottom bar on mobile for "Download All" / "New Batch" |
| Result cards | Single column grid on mobile (currently responsive but can improve) |
| Photoshoot CTA | Full-width with gradient background and sparkle icon |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/BatchSwapPreview.tsx` | Redesign result card actions, add mobile detection, highlight Photoshoot button |
| `src/pages/OutfitSwap.tsx` | Add sticky mobile footer, compact mobile header |

---

### Technical Implementation

#### BatchSwapPreview.tsx - Result Card Actions

```typescript
// Import mobile hook
import { useIsMobile } from "@/hooks/use-mobile";

// Inside component
const isMobile = useIsMobile();

// New action layout for result cards
{result && (
  <div className="space-y-3 mt-3">
    {/* Featured Photoshoot CTA - Full Width, Highlighted */}
    <Button
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
      onClick={() => handleCreatePhotoshoot(result)}
    >
      <Camera className="w-4 h-4 mr-2" />
      <span className="flex-1">{t('outfitSwap.buttons.createPhotoshoot')}</span>
      <Badge variant="secondary" className="ml-2 text-xs">
        4 angles
      </Badge>
    </Button>
    
    {/* Compact action grid */}
    <div className={cn(
      "grid gap-2",
      isMobile ? "grid-cols-3" : "grid-cols-2"
    )}>
      {/* Preview */}
      <Button size="sm" variant="outline" onClick={...}>
        <Eye className="w-3 h-3" />
        {!isMobile && <span className="ml-1">Preview</span>}
      </Button>
      {/* ... other buttons icon-only on mobile */}
    </div>
    
    {/* Secondary actions - collapsible on mobile */}
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" onClick={handleAnimate}>
        <Film className="w-3 h-3 mr-1" />
        {t('outfitSwap.buttons.animate')}
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCreateEcommercePhoto}>
        <ShoppingBag className="w-3 h-3 mr-1" />
        {t('outfitSwap.buttons.ecommerce')}
      </Button>
    </div>
  </div>
)}
```

#### OutfitSwap.tsx - Mobile Sticky Footer

```typescript
// Mobile sticky footer for primary actions
{isMobile && (isCompleted || isFailed) && (
  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
    <div className="flex gap-2">
      <Button className="flex-1" onClick={downloadAll}>
        <Download className="w-4 h-4 mr-2" />
        Download All
      </Button>
      <Button variant="outline" onClick={onReset}>
        New Batch
      </Button>
    </div>
  </div>
)}
```

---

### UI/UX Improvements Summary

| Element | Desktop | Mobile |
|---------|---------|--------|
| Photoshoot CTA | Highlighted in grid (spans 2 cols) | Full-width gradient button at top |
| Primary actions | 2-column grid with text | 3-column grid, icon-only |
| Secondary actions | Same row as primary | Collapsed row below |
| Header actions | Full buttons | Compact/hidden labels |
| Main CTAs | Inline | Sticky bottom bar |

---

### Translation Keys to Add

```json
{
  "outfitSwap": {
    "buttons": {
      "createPhotoshoot": "Create Photoshoot",
      "photoshootSubtitle": "Generate 4 professional angles"
    }
  }
}
```

---

### Permission Verification Summary

All users (including Free tier) have full access to:
- Create outfit swap jobs
- View their own results
- Create photoshoots from results
- All RLS policies are correctly scoped to `auth.uid()`

No database changes required.

---

### Mobile Styling Strategy

1. Use `useIsMobile()` hook consistently
2. Apply conditional Tailwind classes via `cn()` utility
3. Maintain touch-friendly tap targets (min 44px)
4. Use `fixed bottom-0` for sticky action bars
5. Collapse labels to icons on small screens

