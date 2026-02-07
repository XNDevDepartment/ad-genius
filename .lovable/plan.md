
# Fix Microsoft Clarity Session Recording

## Problem

Microsoft Clarity is installed but not capturing sessions because your **Content Security Policy (CSP)** blocks the required domains.

## Root Cause Analysis

| CSP Directive | Currently Allows | Missing for Clarity |
|---------------|------------------|---------------------|
| `script-src` | `'self' 'unsafe-inline' https://connect.facebook.net` | `https://www.clarity.ms` |
| `connect-src` | Supabase, Facebook only | `https://*.clarity.ms` |

The Clarity script at line 124-130 in `index.html` loads correctly, but:
1. Its external scripts are blocked by `script-src`
2. Session data can't be sent due to `connect-src` restrictions

## Solution

Update the CSP in `index.html` to allow Clarity (and fix TikTok Pixel while we're at it).

### File to Modify

**`index.html`** - Lines 18-36

### Changes Required

```text
Before (script-src):
script-src 'self' 'unsafe-inline' https://connect.facebook.net;

After (script-src):
script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.clarity.ms https://analytics.tiktok.com;

Before (connect-src):
connect-src 'self' https://dhqdamfisdbbcieqlpvt.supabase.co ...;

After (connect-src):
connect-src 'self'
  https://dhqdamfisdbbcieqlpvt.supabase.co
  wss://dhqdamfisdbbcieqlpvt.supabase.co
  https://dhqdamfisdbbcieqlpvt.functions.supabase.co
  https://saasfame.com/badge-light.svg
  https://www.facebook.com
  https://connect.facebook.net
  https://*.clarity.ms
  https://analytics.tiktok.com
  ws://localhost:* wss://localhost:*;
```

### Optional: Add img-src for Clarity

Clarity may also need image permissions for heatmaps:

```text
img-src 'self' data: blob: https://dhqdamfisdbbcieqlpvt.supabase.co https://www.facebook.com https://*.clarity.ms;
```

---

## Technical Details

### Why CSP Blocks Clarity

When the browser loads your page, it parses the CSP header and blocks any resources not explicitly allowed. The Clarity inline script executes (because of `'unsafe-inline'`), but when it tries to:

1. **Load additional scripts** from `https://www.clarity.ms/tag/v9stklh1ib` → blocked by `script-src`
2. **Send session data** to Clarity servers → blocked by `connect-src`

The browser silently drops these requests, which is why no errors appear in your console (CSP violations are logged to a separate console category or suppressed).

### Domains Required by Clarity

Microsoft Clarity uses these endpoints:
- `https://www.clarity.ms` - Main script CDN
- `https://*.clarity.ms` - Data collection endpoints (wildcard needed)

---

## Summary

| Step | Action |
|------|--------|
| 1 | Add `https://www.clarity.ms` to `script-src` directive |
| 2 | Add `https://*.clarity.ms` to `connect-src` directive |
| 3 | Add `https://analytics.tiktok.com` to both (bonus fix) |
| 4 | Optionally add `https://*.clarity.ms` to `img-src` |

After this change, Clarity will be able to load its full tracking script and transmit session recordings to Microsoft's servers.
