

## Fix SSR Fallback Colors to Match Actual Landing Page

### Problem
The prerendered HTML in `index.html` uses purple (`#6d28d9`) as the primary color throughout, but the actual CSS design system defines `--primary: 225 86% 50%` which is a vivid blue (`#1249ED`). Additionally, borders use visible gray (`#e5e7eb`) but the actual `--border` variable is `0 0% 100%` (white/invisible).

### Color Corrections

| Token | SSR (wrong) | Actual CSS variable | Correct hex |
|-------|------------|-------------------|-------------|
| Primary | `#6d28d9` (purple) | `hsl(225 86% 50%)` | `#1249ED` (blue) |
| Primary rgba | `rgba(109,40,217,...)` | — | `rgba(18,73,237,...)` |
| Border | `#e5e7eb` (gray) | `hsl(0 0% 100%)` | `#ffffff` (invisible) |
| Background | `#fff` | `hsl(0 0% 98%)` | `#fafafa` |
| Foreground | `#1a1a2e` | `hsl(0 0% 11%)` | `#1c1c1e` |
| Muted text | `#555` | `hsl(0 0% 43%)` | `#6e6e6e` |
| Muted bg | `#f9fafb` | `hsl(0 0% 95%)` at 30% | `#f2f2f2` at 30% ≈ `#f8f8f8` |
| Card | `#fff` | `hsl(0 0% 100%)` | `#ffffff` (correct) |

### Changes

**File: `index.html`** — Global find-and-replace across the SSR fallback block (lines 148–462):

1. Replace all `#6d28d9` → `#1249ED`
2. Replace all `rgba(109,40,217,` → `rgba(18,73,237,`
3. Replace `#1a1a2e` → `#1c1c1e`
4. Replace `background:#fff` (page bg) → `background:#fafafa`
5. Replace border `#e5e7eb` → very light border `rgba(0,0,0,0.06)` (since the actual border is white/invisible on white, but for SSR readability we keep a very subtle hint)
6. Replace muted text `#555` → `#6e6e6e`
7. Replace section backgrounds `#f9fafb` → `#f8f8f8`
8. Replace table header `#f3f4f6` → `#f5f5f5`
9. Replace `#dc2626` (red X in table) stays the same (destructive color matches)
10. Update noscript links from purple to blue as well

### Technical Notes
- The popular pricing card background changes from purple to blue (`#1249ED`)
- The hero gradient text accent changes from purple to blue
- CTA buttons change from purple to blue
- Step number circles change from purple to blue
- Badge backgrounds change from purple-tinted to blue-tinted
- All shadow colors update from purple to blue (`rgba(18,73,237,0.25)`)

### Files Modified
1. `index.html` — Color corrections throughout SSR fallback and noscript blocks

