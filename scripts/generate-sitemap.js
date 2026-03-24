/**
 * Dynamic Sitemap Generator for ProduktPix
 *
 * Reads all public routes (static + dynamic slugs) and writes public/sitemap.xml.
 * Run: node scripts/generate-sitemap.js
 * Auto-runs before every build via the "prebuild" npm script.
 *
 * To add new routes: update STATIC_ROUTES, USE_CASE_SLUGS, CASE_STUDY_SLUGS, or INTEGRATION_SLUGS below.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TODAY = new Date().toISOString().split('T')[0];
const BASE_URL = 'https://produktpix.com';

// ─── Static public routes ────────────────────────────────────────────────────
const STATIC_ROUTES = [
  { path: '/',                      changefreq: 'weekly',  priority: '1.0' },
  { path: '/pricing',               changefreq: 'monthly', priority: '0.9' },
  { path: '/founders',              changefreq: 'monthly', priority: '0.8' },
  { path: '/afiliados',             changefreq: 'monthly', priority: '0.7' },
  { path: '/promo/first-month',     changefreq: 'monthly', priority: '0.7' },
  { path: '/promo/1mes',            changefreq: 'monthly', priority: '0.7' },
  { path: '/promo/3meses',          changefreq: 'monthly', priority: '0.7' },
  { path: '/help/getting-started',  changefreq: 'monthly', priority: '0.7' },
  { path: '/help/faq',              changefreq: 'monthly', priority: '0.7' },
  { path: '/help/tutorials',        changefreq: 'monthly', priority: '0.6' },
  { path: '/help/api-docs',         changefreq: 'monthly', priority: '0.6' },
  { path: '/help/integrations',     changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy',               changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms',                 changefreq: 'yearly',  priority: '0.3' },
  { path: '/cookies',               changefreq: 'yearly',  priority: '0.3' },
];

// ─── Dynamic slugs (keep in sync with src/data/*.ts) ─────────────────────────
const USE_CASE_SLUGS = [
  'amazon-product-photos',
  'shopify-listing-images',
  'fashion-model-photography',
  'jewelry-product-photos',
  'cosmetics-packaging',
  'food-photography',
  'furniture-lifestyle',
  'electronics-tech',
  'etsy-handmade',
  'white-background-photos',
];

const CASE_STUDY_SLUGS = [
  'ogato-das-fraldas',
  'bug-hug',
  'yonos',
];

const INTEGRATION_SLUGS = [
  'shopify',
  'amazon',
  'etsy',
  'woocommerce',
  'bigcommerce',
];

// ─── Build full URL list ──────────────────────────────────────────────────────
const urls = [
  ...STATIC_ROUTES,
  ...USE_CASE_SLUGS.map(slug  => ({ path: `/use-cases/${slug}`,    changefreq: 'monthly', priority: '0.8' })),
  ...CASE_STUDY_SLUGS.map(slug => ({ path: `/case-studies/${slug}`, changefreq: 'monthly', priority: '0.8' })),
  ...INTEGRATION_SLUGS.map(slug => ({ path: `/integrations/${slug}`, changefreq: 'monthly', priority: '0.8' })),
];

// ─── Generate XML ─────────────────────────────────────────────────────────────
const urlEntries = urls
  .map(({ path, changefreq, priority }) =>
    `  <url>\n    <loc>${BASE_URL}${path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>
`;

const outputPath = join(ROOT, 'public', 'sitemap.xml');
writeFileSync(outputPath, xml, 'utf8');
console.log(`✓ sitemap.xml generated — ${urls.length} URLs → ${outputPath}`);
