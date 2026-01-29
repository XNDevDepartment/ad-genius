

## Fix Landing Page Translation Errors

### Problem Identified

The landing page is showing raw translation keys (e.g., `landing.hero.trustBadge`) instead of translated text because of **duplicate `landing` keys** in all 5 locale JSON files.

**Root Cause**: JSON doesn't allow duplicate keys. When the parser encounters two `landing` objects:
1. First `landing` (line ~306): Contains complete hero translations (trustBadge, headlines, description, stats, etc.)
2. Second `landing` (line ~1990): Contains only partial translations (bookDemo + fashionCatalog)

The second occurrence **overwrites** the first, losing all the hero translations.

---

### Solution

Merge the two `landing` objects into one by:
1. Keeping the first `landing` object with all hero translations
2. Adding the `fashionCatalog` section from the second `landing` object into the first
3. Removing the duplicate second `landing` object entirely

---

### Files to Fix

| File | First `landing` location | Second `landing` location |
|------|-------------------------|--------------------------|
| `src/i18n/locales/pt.json` | Lines 310-329 | Lines 1971-1997 |
| `src/i18n/locales/en.json` | Lines 306-325 | Lines 1990-2016 |
| `src/i18n/locales/de.json` | Lines 310-329 | Lines 1920-1946 |
| `src/i18n/locales/fr.json` | Lines 310-329 | Lines 1920-1946 |
| `src/i18n/locales/es.json` | Lines 310-329 | Lines 1920-1946 |

---

### Technical Changes

For each locale file:

**Step 1**: Add `fashionCatalog` to the first `landing` object (after the `hero` section closes)

```json
"landing": {
  "hero": {
    "bookDemo": "...",
    "trustBadge": "...",
    "headline1": "...",
    // ... all hero keys
    "generatedIn": "..."
  },
  "fashionCatalog": {    // <-- ADD THIS SECTION
    "badge": "...",
    "title": "...",
    // ... all fashionCatalog keys
  }
}
```

**Step 2**: Remove the duplicate second `landing` object entirely

---

### Merged Structure (Example - English)

```json
"landing": {
  "hero": {
    "bookDemo": "Book a Free Demo",
    "trustBadge": "🚀 #1 AI Image Generator for E-commerce",
    "headline1": "Create AI Product Images that sell for you",
    "headline2": "Showcase your products in real, authentic contexts",
    "headline3": "Make them look like they're already in customers' hands.",
    "headline4": "Build instant trust and credibility for your brand.",
    "description": "Transform any product into authentic, UGC-style visuals...",
    "descriptionBold": "Genius AI Intelligence",
    "descriptionExtended": "No studios, no photographers, no designers...",
    "startCreatingFree": "Start Creating Free",
    "stats": {
      "avgTimeLabel": "Average Time for Everything",
      "imagesLabel": "Generated Images Per User Monthly",
      "satisfactionLabel": "Satisfaction Rate on our Users"
    },
    "generatedIn": "Generated in"
  },
  "fashionCatalog": {
    "badge": "Virtual Fashion Catalog",
    "title": "One Garment. Endless Catalog.",
    "subtitle": "Upload a single product photo...",
    "sourceLabel": "Your Garment",
    "transformLabel": "AI Creates",
    "resultsLabel": "6+ Catalog Shots",
    "benefits": {
      "uploadGarments": "Upload one flat-lay or mannequin shot",
      "chooseModels": "AI generates diverse model variations",
      "catalogShots": "Get 6+ catalog-ready images instantly",
      "batchProcess": "Process your entire inventory in batch"
    },
    "useCases": {
      "apparel": "Apparel Brands",
      "fashion": "Fashion Retailers",
      "footwear": "Footwear Stores",
      "accessories": "Accessories Shops"
    },
    "cta": "Create Your Catalog",
    "perfectFor": "Perfect for:"
  }
}
```

---

### Expected Result

After the fix, the landing page will correctly display:
- Trust badge: "🚀 #1 Gerador de Imagens IA para E-commerce"
- Headlines rotating through all 4 translated versions
- Description with bold "Genius AI Intelligence"
- Stats labels: "Tempo Médio para Tudo", etc.
- "Gerado em" on the floating card
- All existing `fashionCatalog` translations preserved

