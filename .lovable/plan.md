

## Temporarily Deactivate Mobile Onboarding

### Current Behavior
The `OnboardingGuard` component shows the mandatory onboarding wizard to mobile users who haven't completed it.

### Change
Bypass all onboarding logic on mobile devices by making the guard always render its children directly.

---

### Implementation

**File to modify:** `src/components/OnboardingGuard.tsx`

**Change:** Add an early return at the top of the component to always skip onboarding:

```typescript
export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  // TEMPORARILY DISABLED: Mobile onboarding is deactivated
  // Remove this line to re-enable mobile onboarding
  return <>{children}</>;
  
  // Original logic below (commented out or kept for easy re-activation)
  // ...
};
```

### Result
- Mobile users will go directly to the app without seeing the onboarding wizard
- Desktop behavior remains unchanged (desktop already uses the floating checklist instead)
- Easy to re-enable by removing the early return line

---

### Re-enabling Later
When ready to re-activate mobile onboarding, simply remove the early `return <>{children}</>;` line and the original logic will work again.

