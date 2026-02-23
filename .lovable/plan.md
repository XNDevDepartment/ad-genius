
# Fix: Inputs Clearing After Browser Extension Error Suppression

## Problem

The previous fix to suppress browser-extension DOM errors in `getDerivedStateFromError` has a side effect: when React catches an error during rendering, it unmounts the component subtree and remounts it -- even if `getDerivedStateFromError` returns `{ hasError: false }`. This causes all `useState` values (uploaded images, audience text, product specs, etc.) to reset, clearing the user's work.

## Solution

Instead of suppressing these errors inside the ErrorBoundary (which still triggers React's error recovery and remounting), catch them at the **window level** before they ever reach React's error boundary mechanism.

### 1. `src/components/ErrorBoundary.tsx`

- **Remove** the browser-extension check from `getDerivedStateFromError` (revert to simple `return { hasError: true, error }`)
- **Add** a `window.addEventListener('error', ...)` in `componentDidMount` that intercepts these DOM manipulation errors and calls `event.preventDefault()` + `event.stopPropagation()` to prevent them from reaching React
- **Clean up** the listener in `componentWillUnmount`

The window-level error handler will check for the same patterns (`removeChild`, `insertBefore`, `appendChild`, `The object can not be found here`, `Minified React error #300`) and silently swallow them. This prevents React from ever seeing the error, so no unmount/remount occurs and no user state is lost.

### Technical Details

| Aspect | Before (broken) | After (fixed) |
|---|---|---|
| Where errors are caught | `getDerivedStateFromError` (React render phase) | `window.addEventListener('error')` (before React) |
| React subtree behavior | Unmounts and remounts children (clears state) | No unmount, children remain intact |
| User experience | Inputs cleared silently | No visible effect |

This is the standard approach for handling non-React DOM errors that shouldn't trigger React's error recovery.
