

# Fix Microsoft Clarity: Missing CSP Domains

## Problem

The CSP was partially updated but still blocks Clarity because two domains are missing per the [official Clarity CSP documentation](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp).

## What's Wrong

| Directive | Current Value | Required by Clarity | Status |
|-----------|--------------|---------------------|--------|
| `script-src` | `https://www.clarity.ms` | `https://*.clarity.ms` (wildcard) | Needs wildcard -- Clarity loads scripts from `a.clarity.ms`, `b.clarity.ms`, etc. |
| `img-src` | `https://*.clarity.ms` | `https://c.bing.com` also needed | Missing `c.bing.com` |
| `connect-src` | `https://*.clarity.ms` | `https://*.clarity.ms` | OK |
| `font-src` | `'self' data:` | `data:` | OK |
| `worker-src` | `'self' blob:` | `blob:` | OK |

## Fix

**File:** `index.html` (CSP meta tag, lines 18-36)

Two changes:

1. **`script-src`**: Replace `https://www.clarity.ms` with `https://*.clarity.ms`
2. **`img-src`**: Add `https://c.bing.com`

### Before

```text
img-src 'self' data: blob: https://dhqdamfisdbbcieqlpvt.supabase.co https://www.facebook.com https://*.clarity.ms;
script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.clarity.ms https://analytics.tiktok.com;
```

### After

```text
img-src 'self' data: blob: https://dhqdamfisdbbcieqlpvt.supabase.co https://www.facebook.com https://*.clarity.ms https://c.bing.com;
script-src 'self' 'unsafe-inline' https://connect.facebook.net https://*.clarity.ms https://analytics.tiktok.com;
```

## Why This Was Missed

The initial fix only added `https://www.clarity.ms` to `script-src`, but Clarity load-balances script delivery across multiple subdomains (a-z). The wildcard `*.clarity.ms` is required. Additionally, Clarity uses `c.bing.com` for image tracking which was not in the original plan.

## Reference

Official documentation: [Clarity CSP Requirements](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp)

