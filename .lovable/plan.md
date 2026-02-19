

# Upgrade /lp Testimonials with Real Customer Stories + Translations

## What Changes

Replace the current placeholder testimonials on `/lp` with **real customer quotes** (from the existing SocialProofSection) and enhance the card design with avatars, company names, and scroll-in animations.

---

## 1. Update TestimonialsSection.tsx

**File:** `src/components/landing-v2/TestimonialsSection.tsx`

Replace the 3 fictional testimonials with the real ones already used on the main landing page:

| Name | Role | Company | Quote |
|---|---|---|---|
| Andreia Vieira | CEO | OGatoDasFraldas | "A tool with great potential. A valuable addition for generating stand-out, unique images." |
| Sofia Santos | Creative Director | Bug Hug | "We are already achieving very, very interesting results! The results were shocking! They were so good!!" |
| Luis Alves | Founder | Yonos | "Good ease of use is a fact but the end result...what a show" |

**Card enhancements (matching SocialProofSection style):**
- Add `Avatar` with initials fallback for each testimonial
- Add company name below the role
- Add framer-motion fade-in animations (using `useInView`)
- Add a subtle hover shadow on cards
- Keep the existing Quote icon, star rating, and card border styling

**Updated data structure:**
```
{ quote, name, role, company, stars }
```

All text pulled from i18n keys, including the new `company` field.

---

## 2. Update Translation Files (all 5 languages)

Add `company` field to each testimonial and update quotes/names/roles to match the real customers.

**Keys updated under `landingV2.testimonials`:**

```json
"t1": {
  "quote": "A tool with great potential...",
  "name": "Andreia Vieira",
  "role": "CEO",
  "company": "OGatoDasFraldas"
},
"t2": {
  "quote": "We are already achieving very interesting results!...",
  "name": "Sofia Santos",
  "role": "Creative Director",
  "company": "Bug Hug"
},
"t3": {
  "quote": "Good ease of use is a fact but the end result...what a show",
  "name": "Luis Alves",
  "role": "Founder",
  "company": "Yonos"
}
```

Since these are real quotes from Portuguese-speaking customers, the quotes will be translated into each language while names/companies stay the same.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/landing-v2/TestimonialsSection.tsx` | Replace fictional testimonials with real ones; add Avatar, company name, framer-motion animations, hover shadow |
| `src/i18n/locales/en.json` | Update testimonial keys with real customer data |
| `src/i18n/locales/pt.json` | Same (Portuguese translations of quotes) |
| `src/i18n/locales/es.json` | Same (Spanish) |
| `src/i18n/locales/fr.json` | Same (French) |
| `src/i18n/locales/de.json` | Same (German) |

## No new dependencies

Uses existing Avatar, framer-motion, react-intersection-observer, and Lucide icons already in the project.

