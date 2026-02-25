

# Investigation Results: Signup Crash on "Send Verification Code"

## Evidence Found

Yes, there are recorded crash reports. The `error_reports` table contains entries from `/signup`:

| Date | Error | Browser | Device |
|---|---|---|---|
| Feb 17 (x2) | **React error #306**: Element type is invalid — expected a component but got `undefined` | Instagram in-app browser | iPhone 17 Pro Max, iOS 26.2 |
| Jan 28 | "The object can not be found here" | Chrome iOS | iPhone, iOS 26.2 |
| Jan 18 (x2) | "The object can not be found here" | Safari iOS | iPhone, iOS 18.7 |

All crashes are from **iOS users** — particularly Instagram's in-app browser and Safari WebViews.

## Root Cause

**React error #306** means: *"Expected a string (for built-in components) or a class/function but got: `undefined`."*

When the user presses "Send Verification Code", `handleSendOtp` succeeds and sets `signupStep = 'otp'`. This triggers rendering of the `InputOTP` component (from the `input-otp` library). The `InputOTP` component wraps `OTPInput` from `input-otp`.

In Instagram's in-app WebView (and potentially other restricted iOS WebViews), the `OTPInput` export from the `input-otp` package resolves to `undefined`. When React tries to render `<OTPInput ... />` and gets `undefined`, it throws error #306, which the ErrorBoundary catches and shows as "Failed to load page."

The "The object can not be found here" errors are a separate, known iOS Safari/WebView issue (already filtered in the ErrorBoundary but some still get through on the signup page).

## Proposed Fix

### File 1: `src/components/auth/AuthModal.tsx`

**A. Add a runtime guard before rendering InputOTP**

Wrap the OTP step in a check that verifies the `InputOTP` component exists before rendering. If it doesn't (broken import in WebView), fall back to a simple 6-digit text input instead of crashing:

```typescript
// At the top of AuthModal, after imports
const OTP_AVAILABLE = typeof InputOTP === 'function';
```

In the OTP step rendering (lines 590-604), wrap with:
```typescript
{OTP_AVAILABLE ? (
  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
    <InputOTPGroup>
      <InputOTPSlot index={0} /> ... <InputOTPSlot index={5} />
    </InputOTPGroup>
  </InputOTP>
) : (
  <Input
    type="text"
    inputMode="numeric"
    maxLength={6}
    value={otpCode}
    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
    placeholder="000000"
    className="text-center text-2xl tracking-[0.5em] font-mono"
    autoComplete="one-time-code"
  />
)}
```

**B. Wrap `handleSendOtp` error handling more defensively**

The current try/catch is good, but `setSendingOtp(false)` can be missed in certain early-return paths. Ensure the `finally` block always runs even when domain validation fails early:

```typescript
// Move setSendingOtp(true) inside try, and ensure finally always resets it
```

### File 2: `src/components/auth/PhoneVerification.tsx`

Apply the same `OTP_AVAILABLE` guard for consistency, since this component also uses `InputOTP` and is used in other flows.

### File 3: `src/components/ErrorBoundary.tsx`

**Add React error #306 to the "browser extension" filter** so it doesn't show the scary error page for this known WebView incompatibility:

```typescript
const isBrowserExtensionError = (error: Error | undefined | null): boolean => {
  const msg = error?.message || '';
  return (
    msg.includes('removeChild') ||
    msg.includes('insertBefore') ||
    msg.includes('appendChild') ||
    msg.includes('The object can not be found here') ||
    msg.includes('Minified React error #300') ||
    msg.includes('Minified React error #306')  // WebView component resolution failure
  );
};
```

## What This Fixes

| Scenario | Before | After |
|---|---|---|
| OTP step in Instagram WebView | Crash + "Failed to load page" | Graceful fallback to plain text input |
| OTP step in normal browsers | Works fine (InputOTP) | Still uses InputOTP (no change) |
| Any iOS "object not found" error | Shows error page | Suppressed (non-actionable) |

## Files Changed

1. `src/components/auth/AuthModal.tsx` — OTP fallback + defensive error handling
2. `src/components/auth/PhoneVerification.tsx` — same OTP fallback
3. `src/components/ErrorBoundary.tsx` — suppress #306 in error boundary

