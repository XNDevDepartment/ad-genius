/**
 * Google Search Console — Sitemap Submission Script
 *
 * Authenticates via a Google Service Account (no extra npm packages needed)
 * and submits the sitemap to the Search Console API.
 *
 * Setup:
 *   1. Create a Service Account in Google Cloud Console
 *   2. Grant it "Owner" or "Full User" permission in Search Console
 *      (Search Console → Settings → Users & permissions)
 *   3. Set env vars (or add to .env.local — never commit to git):
 *        GSC_SITE_URL=https://produktpix.com/
 *        GOOGLE_SERVICE_ACCOUNT_KEY=<full JSON string of the service-account key>
 *      OR point to a key file:
 *        GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/gsc-service-account.json
 *
 * Run: node scripts/submit-sitemap-gsc.js
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

// ─── Config ───────────────────────────────────────────────────────────────────
const SITE_URL = process.env.GSC_SITE_URL ?? 'https://produktpix.com/';

// Sitemap URL must always be a real https:// address, even for sc-domain: properties
const SITEMAP_URL = process.env.GSC_SITEMAP_URL ?? 'https://produktpix.com/sitemap.xml';

// Load service-account credentials
function loadServiceAccount() {
  // Try env var first, but fall through to file if it fails to parse
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      console.log('  Auth:    env var GOOGLE_SERVICE_ACCOUNT_KEY');
      return parsed;
    } catch {
      console.warn('  Warning: GOOGLE_SERVICE_ACCOUNT_KEY env var is set but not valid JSON — falling back to key file.');
    }
  }

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ?? 'gsc-service-account.json';
  try {
    const raw = readFileSync(keyFile, 'utf8');
    const parsed = JSON.parse(raw);
    console.log(`  Auth:    key file → ${keyFile}`);
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(
        `✗ Key file not found: ${keyFile}\n` +
        '  Place your Google service-account JSON key at gsc-service-account.json in the project root,\n' +
        '  or set GOOGLE_SERVICE_ACCOUNT_KEY_FILE to the correct path.',
      );
    } else {
      console.error(`✗ Failed to parse key file "${keyFile}": ${err.message}`);
    }
    process.exit(1);
  }
}

// ─── JWT / OAuth2 helper ──────────────────────────────────────────────────────
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to obtain access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ─── List all sites the service account can see ───────────────────────────────
async function listSites() {
  const serviceAccount = loadServiceAccount();
  const accessToken    = await getAccessToken(serviceAccount);

  const res  = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();

  const sites = data.siteEntry ?? [];
  if (sites.length === 0) {
    console.log('No sites found for this service account.');
    console.log('Make sure you added the service account email as Owner in Search Console.');
    return;
  }

  console.log('Sites accessible by this service account:');
  sites.forEach(s => console.log(`  ${s.permissionLevel.padEnd(20)} ${s.siteUrl}`));
  console.log('\nUse the exact siteUrl above as your GSC_SITE_URL env var.');
}

// ─── Submit sitemap ───────────────────────────────────────────────────────────
async function submitSitemap() {
  console.log(`Submitting sitemap to Google Search Console…`);
  console.log(`  Site:    ${SITE_URL}`);
  console.log(`  Sitemap: ${SITEMAP_URL}`);

  const serviceAccount = loadServiceAccount();
  const accessToken    = await getAccessToken(serviceAccount);

  const apiUrl =
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}` +
    `/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;

  const res = await fetch(apiUrl, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 200 OK or 204 No Content both indicate success
  if (res.ok) {
    console.log(`✓ Sitemap successfully submitted!`);
    return;
  }

  const body = await res.text();
  throw new Error(`GSC API returned ${res.status}: ${body}`);
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────
const command = process.argv[2];

if (command === '--list-sites') {
  listSites().catch(err => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
} else {
  submitSitemap().catch(err => {
    console.error(`✗ Sitemap submission failed: ${err.message}`);
    process.exit(1);
  });
}
