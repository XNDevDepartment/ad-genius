import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE_URL = 'https://produktpix.com';
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr', 'de'];

interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastmod?: string;
}

const staticPages: SitemapEntry[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/lp', priority: 0.9, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changefreq: 'monthly' },
  { path: '/founders', priority: 0.8, changefreq: 'monthly' },
  { path: '/afiliados', priority: 0.7, changefreq: 'monthly' },
  { path: '/help/faq', priority: 0.7, changefreq: 'monthly' },
  { path: '/help/getting-started', priority: 0.7, changefreq: 'monthly' },
  { path: '/help/tutorials', priority: 0.6, changefreq: 'monthly' },
  { path: '/help/api-docs', priority: 0.6, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/cookies', priority: 0.3, changefreq: 'yearly' },
];

function generateHreflangTags(path: string): string {
  const tags = SUPPORTED_LANGUAGES.map(
    (lang) => `      <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}${path}?lang=${lang}"/>`
  ).join('\n');
  
  return `${tags}\n      <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}"/>`;
}

function generateSitemap(): string {
  const today = new Date().toISOString().split('T')[0];
  
  const urlEntries = staticPages
    .map((page) => {
      return `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${page.lastmod || today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
${generateHreflangTags(page.path)}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const sitemap = generateSitemap();
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});
