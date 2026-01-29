
## Landing Page Hero & Pricing Page Translation Update Plan

### Current State Analysis

#### Landing Page HeroSection (`src/components/landing/HeroSection.tsx`)

| Element | Current Status | Issue |
|---------|---------------|-------|
| Trust Badge | `"🚀 #1 AI Image Generator for E-commerce"` | **Hardcoded English** - Not using translations |
| Rotating Headlines (4) | Hardcoded array of English strings | **Hardcoded English** - Not using translations |
| Description paragraph | Hardcoded English text | **Hardcoded English** - Not using translations |
| "Book a Demo" button | Uses `t('landing.hero.bookDemo')` | ✅ Translated |
| "Start Creating Free" button | `"Start Creating Free"` | **Hardcoded English** - Not using translations |
| Social proof stats labels | Hardcoded English: "Average Time...", "Generated Images...", "Satisfaction Rate..." | **Hardcoded English** - Not using translations |
| Floating card text | `"Generated in"` | **Hardcoded English** - Not using translations |

#### Pricing Page (`src/pages/Pricing.tsx`)

| Element | Current Status |
|---------|---------------|
| Main titles & toggle | ✅ Using `t('pricing.xxx')` |
| Plan cards | ✅ Using `t('pricing.plans.xxx')` |
| Price per image | ✅ Using `t('pricing.perImage', { price })` - **Already implemented** |
| Comparison table | ✅ Using `t('pricing.comparisonTable.xxx')` |
| FAQ section | ✅ Using `t('pricing.faq.xxx')` |
| Credit system | ✅ Using `t('pricing.creditSystem.xxx')` |

**Note**: The Pricing page is already fully translated - the `pricing.perImage` key was added in the previous implementation.

---

### Implementation Plan

#### 1. Add Missing Translation Keys to All Locale Files

Add new keys under `landing.hero` for all 5 language files:

```json
"landing": {
  "hero": {
    "bookDemo": "Book a Free Demo",
    "trustBadge": "🚀 #1 AI Image Generator for E-commerce",
    "headline1": "Create AI Product Images that sell for you",
    "headline2": "Showcase your products in real, authentic contexts",
    "headline3": "Make them look like they're already in customers' hands.",
    "headline4": "Build instant trust and credibility for your brand.",
    "description": "Transform any product into authentic, UGC-style visuals that build credibility and boost conversions — powered by our proprietary <b>Genius AI Intelligence</b>.",
    "descriptionExtended": "No studios, no photographers, no designers. Just upload and get sales-ready images instantly.",
    "startCreatingFree": "Start Creating Free",
    "stats": {
      "avgTimeValue": "80s",
      "avgTimeLabel": "Average Time for Everything",
      "imagesValue": "50+",
      "imagesLabel": "Generated Images Per User Monthly",
      "satisfactionValue": "98%",
      "satisfactionLabel": "Satisfaction Rate on our Users"
    },
    "generatedIn": "Generated in"
  }
}
```

#### 2. Update HeroSection Component

Replace all hardcoded strings with translation calls:

| Current | Change To |
|---------|-----------|
| `"🚀 #1 AI Image Generator..."` | `{t('landing.hero.trustBadge')}` |
| `headlines[currentHeadline]` | `{t(\`landing.hero.headline${currentHeadline + 1}\`)}` |
| Hardcoded description | `{t('landing.hero.description')}` + `{t('landing.hero.descriptionExtended')}` |
| `"Start Creating Free"` | `{t('landing.hero.startCreatingFree')}` |
| `socialProofStats[].label` | `{t(\`landing.hero.stats.${statKey}Label\`)}` |
| `"Generated in"` | `{t('landing.hero.generatedIn')}` |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Add `landing.hero.*` keys (trust badge, headlines, description, stats) |
| `src/i18n/locales/pt.json` | Add translated `landing.hero.*` keys |
| `src/i18n/locales/de.json` | Add translated `landing.hero.*` keys |
| `src/i18n/locales/fr.json` | Add translated `landing.hero.*` keys |
| `src/i18n/locales/es.json` | Add translated `landing.hero.*` keys |
| `src/components/landing/HeroSection.tsx` | Replace hardcoded strings with `t()` calls |

---

### Translation Content

#### English (en.json) - Reference
```json
"landing": {
  "hero": {
    "bookDemo": "Book a Free Demo",
    "trustBadge": "🚀 #1 AI Image Generator for E-commerce",
    "headline1": "Create AI Product Images that sell for you",
    "headline2": "Showcase your products in real, authentic contexts",
    "headline3": "Make them look like they're already in customers' hands.",
    "headline4": "Build instant trust and credibility for your brand.",
    "description": "Transform any product into authentic, UGC-style visuals that build credibility and boost conversions — powered by our proprietary <bold>Genius AI Intelligence</bold>.",
    "descriptionExtended": "No studios, no photographers, no designers. Just upload and get sales-ready images instantly.",
    "startCreatingFree": "Start Creating Free",
    "stats": {
      "avgTimeLabel": "Average Time for Everything",
      "imagesLabel": "Generated Images Per User Monthly",
      "satisfactionLabel": "Satisfaction Rate on our Users"
    },
    "generatedIn": "Generated in"
  }
}
```

#### Portuguese (pt.json)
```json
"landing": {
  "hero": {
    "bookDemo": "Marcar Demonstração Grátis",
    "trustBadge": "🚀 #1 Gerador de Imagens IA para E-commerce",
    "headline1": "Crie Imagens de Produto com IA que vendem por si",
    "headline2": "Apresente os seus produtos em contextos reais e autênticos",
    "headline3": "Faça parecer que já estão nas mãos dos seus clientes.",
    "headline4": "Construa confiança e credibilidade instantânea para a sua marca.",
    "description": "Transforme qualquer produto em visuais autênticos estilo UGC que constroem credibilidade e aumentam conversões — powered by <bold>Genius AI Intelligence</bold>.",
    "descriptionExtended": "Sem estúdios, sem fotógrafos, sem designers. Carregue e obtenha imagens prontas para vender instantaneamente.",
    "startCreatingFree": "Comece a Criar Grátis",
    "stats": {
      "avgTimeLabel": "Tempo Médio para Tudo",
      "imagesLabel": "Imagens Geradas Por Utilizador/Mês",
      "satisfactionLabel": "Taxa de Satisfação dos Nossos Utilizadores"
    },
    "generatedIn": "Gerado em"
  }
}
```

#### German (de.json)
```json
"landing": {
  "hero": {
    "bookDemo": "Free Demo Buchen",
    "trustBadge": "🚀 #1 KI-Bildgenerator für E-Commerce",
    "headline1": "Erstellen Sie KI-Produktbilder, die für Sie verkaufen",
    "headline2": "Präsentieren Sie Ihre Produkte in echten, authentischen Kontexten",
    "headline3": "Lassen Sie sie aussehen, als wären sie bereits in Kundenhand.",
    "headline4": "Bauen Sie sofortiges Vertrauen und Glaubwürdigkeit für Ihre Marke auf.",
    "description": "Verwandeln Sie jedes Produkt in authentische UGC-Visuals, die Glaubwürdigkeit aufbauen und Conversions steigern — powered by <bold>Genius AI Intelligence</bold>.",
    "descriptionExtended": "Keine Studios, keine Fotografen, keine Designer. Einfach hochladen und verkaufsfertige Bilder sofort erhalten.",
    "startCreatingFree": "Kostenlos Erstellen",
    "stats": {
      "avgTimeLabel": "Durchschnittliche Zeit für Alles",
      "imagesLabel": "Generierte Bilder Pro Nutzer/Monat",
      "satisfactionLabel": "Zufriedenheitsrate unserer Nutzer"
    },
    "generatedIn": "Generiert in"
  }
}
```

#### French (fr.json)
```json
"landing": {
  "hero": {
    "bookDemo": "Réserver une Démo Gratuite",
    "trustBadge": "🚀 #1 Générateur d'Images IA pour E-commerce",
    "headline1": "Créez des Images Produit IA qui vendent pour vous",
    "headline2": "Présentez vos produits dans des contextes réels et authentiques",
    "headline3": "Faites-les paraître déjà entre les mains de vos clients.",
    "headline4": "Construisez instantanément confiance et crédibilité pour votre marque.",
    "description": "Transformez n'importe quel produit en visuels UGC authentiques qui renforcent la crédibilité et boostent les conversions — powered by <bold>Genius AI Intelligence</bold>.",
    "descriptionExtended": "Pas de studios, pas de photographes, pas de designers. Téléchargez et obtenez des images prêtes à vendre instantanément.",
    "startCreatingFree": "Commencer Gratuitement",
    "stats": {
      "avgTimeLabel": "Temps Moyen pour Tout",
      "imagesLabel": "Images Générées Par Utilisateur/Mois",
      "satisfactionLabel": "Taux de Satisfaction de nos Utilisateurs"
    },
    "generatedIn": "Généré en"
  }
}
```

#### Spanish (es.json)
```json
"landing": {
  "hero": {
    "bookDemo": "Reservar Demo Gratis",
    "trustBadge": "🚀 #1 Generador de Imágenes IA para E-commerce",
    "headline1": "Crea Imágenes de Producto con IA que venden por ti",
    "headline2": "Muestra tus productos en contextos reales y auténticos",
    "headline3": "Haz que parezcan que ya están en manos de tus clientes.",
    "headline4": "Construye confianza y credibilidad instantánea para tu marca.",
    "description": "Transforma cualquier producto en visuales UGC auténticos que construyen credibilidad y aumentan conversiones — powered by <bold>Genius AI Intelligence</bold>.",
    "descriptionExtended": "Sin estudios, sin fotógrafos, sin diseñadores. Sube y obtén imágenes listas para vender al instante.",
    "startCreatingFree": "Empieza a Crear Gratis",
    "stats": {
      "avgTimeLabel": "Tiempo Promedio para Todo",
      "imagesLabel": "Imágenes Generadas Por Usuario/Mes",
      "satisfactionLabel": "Tasa de Satisfacción de nuestros Usuarios"
    },
    "generatedIn": "Generado en"
  }
}
```

---

### Technical Changes to HeroSection.tsx

```typescript
// Replace hardcoded headlines array with translation-aware logic
const headlineKeys = ['headline1', 'headline2', 'headline3', 'headline4'];

// Replace socialProofStats with translation keys
const socialProofStats = [
  { icon: Zap, value: "80s", labelKey: "avgTimeLabel" },
  { icon: Image, value: "50+", labelKey: "imagesLabel" },
  { icon: Trophy, value: "98%", labelKey: "satisfactionLabel" }
];

// In JSX:
// Badge: {t('landing.hero.trustBadge')}
// Headlines: {t(`landing.hero.${headlineKeys[currentHeadline]}`)}
// Description: Use Trans component for bold text support
// Stats labels: {t(`landing.hero.stats.${stat.labelKey}`)}
// Floating card: {t('landing.hero.generatedIn')}
// Secondary CTA: {t('landing.hero.startCreatingFree')}
```

---

### Summary

| Task | Status |
|------|--------|
| Pricing page price-per-image | ✅ Already implemented |
| Pricing page full i18n | ✅ Already complete |
| Landing hero trust badge | 🔄 Needs translation |
| Landing hero headlines (4) | 🔄 Needs translation |
| Landing hero description | 🔄 Needs translation |
| Landing hero secondary CTA | 🔄 Needs translation |
| Landing hero stats labels | 🔄 Needs translation |
| Landing hero floating card | 🔄 Needs translation |
| Add translations to 5 locale files | 🔄 Needs implementation |

This plan will fully internationalize the landing page hero section while maintaining the existing visual design and animation behaviors.
