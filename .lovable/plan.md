

## Fix: Meta Pixel Under-Reporting Signups (~50% Missing)

### Root Cause

`trackSignUp()` is **only called in `SignUp.tsx`'s `handleSuccess`**. This misses two major flows:

1. **Google OAuth signups** — The user clicks "Sign up with Google", gets redirected to Google, then redirected back to `/` (not `/signup`). The `SignUp.tsx` component is never mounted on return, so `trackSignUp()` never fires.

2. **Cookie consent decline** — The Meta Pixel script loads regardless of consent, but if users decline cookies, there's no logic to prevent or defer pixel events. This is a minor issue but worth noting.

The Google OAuth gap alone could explain ~50% missing events if roughly half your users sign up via Google.

### Fix

Move the `CompleteRegistration` pixel event into `AuthContext.tsx`, where **all** signup paths converge — both email+phone and Google OAuth. The context already detects new users (the `isNewUser` check on line 175). Fire the pixel there.

### Changes

**1. `src/contexts/AuthContext.tsx`**
- Import `trackSignUp` from `@/lib/metaPixel`
- In the `onAuthStateChange` handler, when `event === 'SIGNED_IN'` and user is detected as new (`isNewUser && account_activated === null`), call `trackSignUp()`
- For email+phone signups: add a similar check — detect first-time `SIGNED_IN` event for non-OAuth users and fire the pixel
- Use a sessionStorage flag (`pixel_signup_fired_{userId}`) to prevent duplicate fires on page refreshes

**2. `src/pages/SignUp.tsx`**
- Remove the `trackSignUp()` call from `handleSuccess` (now handled centrally)
- Remove the unused `trackSignUp` import

### Result
- All signup methods (email+phone, Google OAuth) fire `CompleteRegistration`
- No duplicate events (guarded by sessionStorage)
- Pixel events fire from a single centralized location

