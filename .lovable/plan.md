

## Fix Book a Demo Button Visibility and Layout + Swap Landing Page CTA Priority

### Overview

Address three issues:
1. Make the "Book a Demo" button visible on the authenticated homepage (currently has poor contrast)
2. Improve the layout of the CTA section on the homepage
3. Swap the priority of CTAs on the landing page - "Book a Demo" becomes primary, "Start Creating Free" becomes secondary

---

### Issue 1: Homepage "Book a Demo" Button Not Visible

**Current Problem (Index.tsx lines 71-83)**:
```tsx
<Button 
  variant="outline" 
  className="border-white/30 text-white hover:bg-white/10"  // ← Barely visible on purple
>
```

The outline variant with white/30 border on a purple gradient background has very low contrast.

**Fix**: Make the "Book a Demo" button the PRIMARY action with a solid white background (like the current "Start Creating" button) and make "Start Creating" the secondary option.

---

### Issue 2: Homepage Layout Problems

**Current layout**:
```
[Start Creating] [Book Demo + description nested below it]
```

The description is nested inside the button's wrapper, creating awkward alignment.

**Proposed layout**:
```
[  Book a Demo (Primary)  ] [Start Creating (Secondary)]

Get a guided tour on how to get the best out of your products
```

Move the description below both buttons, spanning the full width.

---

### Issue 3: Landing Page Button Priority Swap

**Current (HeroSection.tsx lines 117-136)**:
- "Start Creating Free" = Primary (gradient background)
- "Book a Demo" = Secondary (outline)

**Proposed**:
- "Book a Demo" = Primary (gradient background)
- "Start Creating Free" = Secondary (outline)

---

### Technical Changes

#### File 1: `src/pages/Index.tsx`

Update lines 61-84 with new layout:

```tsx
<div className="flex flex-col sm:flex-row gap-4 mt-6">
  {/* Primary CTA - Book a Demo */}
  <Button 
    variant="default" 
    size="lg"
    onClick={() => window.open('https://cal.com/genius-clklot/demonstracao-privada', '_blank')}
    className="lg:text-lg lg:px-8 lg:py-4 bg-white text-primary hover:bg-white/90"
  >
    <Play className="mr-2 h-5 w-5" />
    {t("index.auth.bookDemo", "Book a Demo")}
  </Button>
  
  {/* Secondary CTA - Start Creating */}
  <Button 
    variant="outline" 
    size="lg"
    onClick={() => navigate("/create/ugc")}
    className="lg:text-lg lg:px-8 lg:py-4 bg-white/10 border-white/50 text-white hover:bg-white/20"
  >
    {t("index.auth.startCreating")}
  </Button>
</div>

{/* Description below buttons */}
<p className="text-sm text-white/80 mt-2">
  {t("index.auth.bookDemoDescription", "Get a guided tour on how to get the best out of your products")}
</p>
```

#### File 2: `src/components/landing/HeroSection.tsx`

Update lines 117-136 to swap button priorities:

```tsx
{/* CTA Buttons */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6, delay: 0.6 }}
  className="flex flex-col sm:flex-row gap-4"
>
  {/* Primary CTA - Book a Demo */}
  <Button 
    size="lg"
    onClick={() => window.open('https://cal.com/genius-clklot/demonstracao-privada', '_blank')}
    className="group bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant text-lg px-8 py-4"
  >
    <Play className="mr-2 h-5 w-5" />
    {t('landing.hero.bookDemo', 'Book a Demo')}
  </Button>

  {/* Secondary CTA - Start Creating Free */}
  <Button
    variant="outline"
    size="lg"
    className="border-2 border-primary/20 hover:border-primary/40 text-lg px-8 py-4"
    onClick={() => navigate("/signup")}
  >
    {t('landing.hero.startCreating', 'Start Creating Free')}
    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
  </Button>
</motion.div>
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Swap button priority, fix visibility, move description below buttons |
| `src/components/landing/HeroSection.tsx` | Swap "Book a Demo" to primary, "Start Creating Free" to secondary |

---

### Visual Result

**Landing Page (before):**
```
[ Start Creating Free (Primary) ] [ Book a Demo (Secondary) ]
```

**Landing Page (after):**
```
[ Book a Demo (Primary) ] [ Start Creating Free (Secondary) ]
```

**Authenticated Homepage (before - broken):**
```
[ Start Creating ] [ Book Demo (barely visible) ]
                    Get a guided tour...
```

**Authenticated Homepage (after - fixed):**
```
[ Book a Demo (Primary/White) ] [ Start Creating (Secondary) ]
Get a guided tour on how to get the best out of your products
```

