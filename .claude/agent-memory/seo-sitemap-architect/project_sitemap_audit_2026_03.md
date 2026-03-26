---
name: Sitemap Audit March 2026
description: Full sitemap audit results - 35 URLs total, all routes have corresponding pages, script at scripts/generate-sitemap.js
type: project
---

Full sitemap audit completed 2026-03-26.

- 35 URLs in sitemap after adding /signin and /signup (previously missing).
- All dynamic slug pages (use-cases, case-studies, integrations) have corresponding data in src/data/*.ts files.
- No orphaned sitemap URLs found -- every URL has a working route + page component.
- Admin-only pages correctly excluded: /create/adgenius, /create/product-studio, /create/magazine-photoshoot, /create/video-ads, /create/custom-model, /genius-agent.
- Auth-gated tool pages correctly excluded: /create/ugc, /create/ugc-v3, /create/video, /create/outfit-swap, /create/outfit-creator, etc.
- Sitemap generation script: scripts/generate-sitemap.js (ES module, runs as prebuild).
- SEO component at src/components/SEO.tsx handles meta, OG, Twitter, hreflang, canonical, and JSON-LD.

**Why:** Baseline for tracking sitemap health over time.
**How to apply:** Reference this when adding new public routes -- always update STATIC_ROUTES in generate-sitemap.js and verify data files for dynamic slugs.
