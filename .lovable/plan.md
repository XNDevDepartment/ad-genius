
# Fix: Browser Extension DOM Errors Crashing the App

## Problem

The `insertBefore` error shown is caused by a **browser extension** (e.g., translation, Grammarly, ad blocker) modifying the DOM that React manages. The ErrorBoundary already identifies these as browser-specific errors and skips reporting them, but it still sets `hasError: true` -- which crashes the UI and shows the error page to the user.

## Root Cause

In `src/components/ErrorBoundary.tsx`, `getDerivedStateFromError` unconditionally sets `hasError: true` for all errors. While `componentDidCatch` correctly skips reporting browser-extension errors, the component still renders the error fallback UI.

## Solution

Update `getDerivedStateFromError` to check the error message and **not** set `hasError: true` for known browser-extension DOM manipulation errors (`insertBefore`, `removeChild`, `appendChild`, etc.).

### File: `src/components/ErrorBoundary.tsx`

- Modify `getDerivedStateFromError` to check the error message against the same list of browser-specific patterns already used in `reportError`
- If the error matches a browser-extension pattern, return `{ hasError: false }` instead of `{ hasError: true, error }`
- This way the app continues rendering normally instead of showing the error page

### What changes

| Aspect | Before | After |
|---|---|---|
| `getDerivedStateFromError` | Always sets `hasError: true` | Skips for DOM extension errors |
| User experience | Sees error page for browser extension issues | App continues working normally |
| Error reporting | Already skipped for these errors | No change needed |

This is a minimal, safe fix -- it only affects errors that are already identified as non-actionable browser extension issues.
