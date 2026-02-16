

# Fix: Redirect Back to Promo Page After Sign-In

## Problem

When an unauthenticated user clicks the 9.99 EUR offer button:
1. They are sent to `/account`, which shows a **sign-up** form
2. If they already have an account and sign in, they get redirected to `/` (home) -- not back to the promo page
3. They should be sent to a **sign-in** page (with option to sign up), and after authenticating, return to the promo page automatically

## Solution

### 1. Promo pages: redirect to `/signin` instead of `/account`

**Files:** `src/pages/Promo1Mes.tsx`, `src/pages/Promo1MesCheckout.tsx`

- Change `navigate('/account')` to `navigate('/signin')`
- Keep the `sessionStorage.setItem('promo_redirect', ...)` logic as-is

### 2. SignIn page: check for `promo_redirect` after auth

**File:** `src/pages/SignIn.tsx`

- In `handleSuccess` and in the `useEffect` that fires when `user` becomes truthy, check `sessionStorage.getItem('promo_redirect')`
- If it exists, navigate to that URL and remove it from sessionStorage
- Otherwise, navigate to `/` as before

### 3. SignUp page: same redirect logic

**File:** `src/pages/SignUp.tsx`

- Apply the same `promo_redirect` check in `handleSuccess` and the `useEffect`
- This covers users who choose to create an account from the sign-in page

### 4. Account page: same redirect logic (safety net)

**File:** `src/pages/Account.tsx`

- No changes needed since we're redirecting to `/signin` now instead of `/account`

## Technical Details

The redirect helper in SignIn/SignUp will look like:

```
const getRedirectPath = () => {
  const promo = sessionStorage.getItem('promo_redirect');
  if (promo) {
    sessionStorage.removeItem('promo_redirect');
    return promo;
  }
  return '/';
};
```

This is used in both the `useEffect` (for already-logged-in users) and `handleSuccess` (for fresh logins).

### Files Changed
- `src/pages/Promo1Mes.tsx` -- redirect to `/signin`
- `src/pages/Promo1MesCheckout.tsx` -- redirect to `/signin`
- `src/pages/SignIn.tsx` -- check `promo_redirect` after auth
- `src/pages/SignUp.tsx` -- check `promo_redirect` after auth
