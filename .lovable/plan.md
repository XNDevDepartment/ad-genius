

# Remove Email Activation Block + Add Email Verification to Desktop Onboarding + Module Selection Demo Images

## Summary

Three related changes:

1. **Remove the email activation gate from Image Animator (Video Generator)** -- both frontend and backend
2. **Add an "Activate Email" step to the desktop onboarding checklist** so users are encouraged (but not forced) to verify their email
3. **Replace icons with demo images in the Module Selection page** to showcase what each module produces

---

## 1. Remove Email Activation Block from Video Access

### Frontend: `src/hooks/useCredits.tsx`

- In `canAccessVideos()` (line 127-135): Remove the `if (!isActivated) return false;` check. All authenticated users can now access videos.
- In `getVideoAccessMessage()` (line 137-146): Remove the activation-specific message block.
- The activation-related exports (`isAccountActivated`, `needsActivation`, etc.) can remain for other uses (e.g., the new onboarding step), but they no longer block video access.

### Backend: `supabase/functions/kling-video/index.ts`

- Remove the server-side activation check block (lines 138-161) that queries `profiles.account_activated` and returns `activation_required: true`. This entire block gets deleted so unactivated accounts can generate videos.

### Frontend: `src/pages/Index.tsx`

- In `mobileModules` array (line 20): Remove `needsVideoAccess: true` from the video module entry so the video tile is no longer locked on mobile.

### Frontend: `src/pages/ModuleSelection.tsx`

- Line 53: Change `locked: !canAccessVideos()` to `locked: false` for the video module.

---

## 2. Add "Verify Email" Step to Desktop Onboarding Checklist

### `src/components/onboarding/OnboardingChecklist.tsx`

- Add a new milestone item for email verification, positioned as the first item in the checklist (before UGC)
- This is a non-blocking, informational step -- it does NOT gate any features
- When clicked, it triggers the `requestActivation` function from `useAccountActivation` to send/resend the activation email
- Shows a checkmark when `isActivated` is true
- No credits are awarded for this step (it's a trust/security encouragement, not a reward milestone)
- Import `useAccountActivation` hook
- Add a `Mail` icon import from lucide-react

The milestone item will look like:
```
icon: Mail
title: "Verify your email"
description: "Confirm your email for account security"
cta: "Send Email" (if not activated) / checkmark (if activated)
```

### `src/i18n/locales/*.json` (all 5 locales)

Add translation keys:
- `onboarding.checklist.milestones.email.title`
- `onboarding.checklist.milestones.email.description`
- `onboarding.checklist.milestones.email.cta`
- `onboarding.checklist.milestones.email.sent`

---

## 3. Replace Icons with Demo Images in Module Selection

### `src/pages/ModuleSelection.tsx`

Replace the icon-based cards with image-showcase cards. Each module card will display a demo image from existing assets instead of a colored icon circle.

**Image mapping using existing assets:**

| Module | Image Asset |
|---|---|
| UGC Creator | `src/assets/demo.webp` |
| Image Animator | `src/assets/catalog_showcase/1.png` |
| Outfit Swap | `src/assets/outfit_square_final.png` |
| Bulk Background | `src/assets/catalog_showcase/3.png` |
| In Progress | No image (keep sparkle icon) |

**Card layout changes:**

- **Mobile**: Replace the 10x10 icon circle with a rounded image thumbnail (aspect-square, object-cover, w-full) filling most of the card, with the title overlaid at the bottom
- **Desktop**: Replace the 16x16 icon circle with a larger image preview (aspect-video or fixed height, rounded-lg), title and description below

The card structure changes from:
```
[Icon Circle]
[Title]
```
to:
```
[Demo Image - rounded, object-cover]
[Title + Badge]
[Description (desktop only)]
```

Import the image assets at the top of the file. Each workflow object gets a new `demoImage` property instead of relying solely on `icon`.

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useCredits.tsx` | Remove activation check from `canAccessVideos()` and `getVideoAccessMessage()` |
| `supabase/functions/kling-video/index.ts` | Remove server-side activation block (lines 138-161) |
| `src/pages/Index.tsx` | Remove `needsVideoAccess` from video module in mobile grid |
| `src/pages/ModuleSelection.tsx` | Unlock video module + replace icons with demo images |
| `src/components/onboarding/OnboardingChecklist.tsx` | Add email verification step (non-blocking, no credits) |
| `src/i18n/locales/en.json` | Add email verification milestone translations |
| `src/i18n/locales/pt.json` | Portuguese translations |
| `src/i18n/locales/es.json` | Spanish translations |
| `src/i18n/locales/fr.json` | French translations |
| `src/i18n/locales/de.json` | German translations |

