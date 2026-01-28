

## Revert Homepage to Single "Start Creating" Button

### Overview

Remove the "Book a Demo" button and description text from the authenticated homepage, keeping only the original "Start Creating" button. The landing page changes will remain as-is (with "Book a Demo" as primary).

---

### Current State (lines 61-87)

```tsx
<div className="flex flex-col sm:flex-row gap-4 mt-6">
  {/* Primary CTA - Book a Demo */}
  <Button onClick={() => window.open('https://cal.com/...')}>
    <Play /> Book a Demo
  </Button>
  
  {/* Secondary CTA - Start Creating */}
  <Button variant="outline" onClick={() => navigate("/create/ugc")}>
    Start Creating
  </Button>
</div>

<p className="text-sm text-white/80 mt-2">
  Get a guided tour...
</p>
```

---

### Target State

```tsx
<Button 
  variant="default" 
  size="lg"
  onClick={() => navigate("/create/ugc")}
  className="lg:text-lg lg:px-8 lg:py-4 bg-white text-primary hover:bg-white/90"
>
  {t("index.auth.startCreating")}
</Button>
```

---

### Technical Changes

**File: `src/pages/Index.tsx`**

1. **Remove the `Play` icon import** (line 7) - no longer needed
2. **Replace lines 61-87** with a single "Start Creating" button:
   - Remove "Book a Demo" button
   - Remove description paragraph
   - Keep only the "Start Creating" button with primary styling (white background)

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove "Book a Demo" button, remove description text, keep only "Start Creating" button |

