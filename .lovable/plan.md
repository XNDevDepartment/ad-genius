

## Fix User Account + PaymentFailedBanner Overlap Issue

### Part 1: Fix User antoniotiago.stessa@gmail.com Account (Database)

**Current state:**
- Tier: Starter, subscribed: true
- Status: `past_due`, `payment_failed_at: 2026-04-01`
- Credits: 0.00
- Subscription end: 2026-05-01 (new subscription is active in Stripe)

**Problem:** User canceled and re-subscribed to reset credits. The new subscription created a new billing cycle (end: May 1), but the old subscription's failed invoice left `payment_failed_at` and `subscription_status: past_due` in the database. Credits were never allocated for the new cycle.

**Fix via migration:**
- Clear `payment_failed_at` → `NULL`
- Set `subscription_status` → `'active'`
- Set `credits_balance` → `90` (80 Starter + 10 bonus for the inconvenience)
- Update `last_reset_at` to now
- Insert a `credits_transactions` record for 90 credits with reason `'manual_credit_adjustment'` and metadata noting the bonus

### Part 2: Fix PaymentFailedBanner Overlapping Sidebar (UI Bug)

**Problem:** The `PaymentFailedBanner` is rendered outside and above the `SidebarProvider` in `AppLayout.tsx` (line 34). On desktop, it renders at the full page width but the sidebar overlaps it because the sidebar has its own stacking context.

**Fix:** Move the `PaymentFailedBanner` inside the desktop sidebar layout, between `AppSidebar` and the main content area — specifically inside the `flex-1 flex flex-col` div, before `<main>`. Also keep it in the mobile layout section. Remove the current top-level placement.

**File: `src/components/AppLayout.tsx`**

```
// Remove lines 33-36 (top-level banner)

// Desktop: add inside the flex-1 column (line 58-60 area)
<div className="flex-1 flex flex-col">
  {subscriptionData?.payment_failed_at && (
    <PaymentFailedBanner paymentFailedAt={subscriptionData.payment_failed_at} />
  )}
  <main className="flex-1">
    <Outlet />
  </main>
</div>

// Mobile: add inside the mobile layout (line 39-49 area)
<div className="lg:hidden">
  {user && subscriptionData?.payment_failed_at && (
    <PaymentFailedBanner paymentFailedAt={subscriptionData.payment_failed_at} />
  )}
  {showHeader && user && <NavigationHeader />}
  ...
</div>
```

This ensures the banner sits within the content area, next to (not behind) the sidebar.

### Files Modified
1. **New migration** — fix user account: clear payment_failed_at, set active, grant 90 credits
2. `src/components/AppLayout.tsx` — move PaymentFailedBanner inside layout sections

