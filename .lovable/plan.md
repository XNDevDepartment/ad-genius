

# Admin Panel Redesign — Professional Backoffice

## Current Problems

1. **No sidebar navigation** — everything crammed into a single page with 8 horizontal tabs that overflow on smaller screens
2. **Plain header** — just "Admin Dashboard" with a shield icon, no branding consistency with the landing page
3. **Redundant data** — Dashboard tab shows EnhancedMetrics + ConversionFunnel + UserGrowthMetrics; the Funnel tab repeats ConversionFunnel; Revenue tab repeats FinancialDashboard data already in RevenueMetrics
4. **Mock growth data** — EnhancedMetrics uses hardcoded percentages (`0.4, 0.5, 0.6...`) instead of real date-based queries
5. **No quick-action capability** — to manually fix a user's subscription (like the recent `joeguimareas4` issue), you must leave the admin panel
6. **Inconsistent styling** — cards use default shadcn styling with no visual hierarchy; Landing V2 uses `rounded-2xl`, `backdrop-blur-lg`, gradient accents, and `bg-background/80` — none of that carries into admin

## Redesign Architecture

```text
┌─────────────────────────────────────────────────────┐
│  Fixed Header (backdrop-blur, logo, user, sign out) │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│  Side  │   Main Content Area                        │
│  bar   │                                            │
│        │   /admin           → Dashboard overview    │
│  Nav   │   /admin/users     → Users list            │
│  icons │   /admin/revenue   → Revenue & subs        │
│  +     │   /admin/content   → Images/Videos/Swaps   │
│  labels│   /admin/marketing → Affiliates & Promos   │
│  +     │   /admin/settings  → Prompts & Admins      │
│  badge │   /admin/errors    → Error reports          │
│  counts│   /admin/base-models → (existing page)     │
│        │   /admin/subscription-audit → (existing)   │
│        │                                            │
└────────┴────────────────────────────────────────────┘
```

## What Changes

### 1. Layout: Sidebar + Sub-routes (replaces tabs)

**New file: `src/components/admin/AdminSidebar.tsx`**

A collapsible sidebar using the existing `Sidebar` component with sections:
- **Overview** (Dashboard icon) — KPI cards + funnel + signups chart
- **Users** (Users icon) — UsersList with subscriber data merged in
- **Revenue** (DollarSign icon) — RevenueMetrics + FinancialDashboard (deduplicated)
- **Content** (Image icon) — Sub-tabs: Images, Videos, Outfit Swaps
- **Marketing** (Megaphone icon) — Sub-tabs: Affiliates, Promo Codes
- **Settings** (Settings icon) — Sub-tabs: AI Prompts, Admin Users
- **Errors** (AlertTriangle icon) — with a red badge showing today's error count
- **Divider**
- **Base Models** (link to `/admin/base-models`)
- **Subscription Audit** (link to `/admin/subscription-audit`)

Each section becomes a nested route under `/admin/*` instead of a tab, so you can deep-link to `/admin/users` directly.

**Modified file: `src/pages/AdminDashboard.tsx`**

Wraps `AdminSidebar` + an `<Outlet />` for sub-routes. No more `AdminOverview` monolith.

**Modified file: `src/App.tsx`**

Replace the single `/admin` route with nested routes:
```
/admin              → AdminDashboardLayout (sidebar + outlet)
  index             → AdminDashboardOverview
  users             → AdminUsersPage
  revenue           → AdminRevenuePage
  content           → AdminContentPage
  marketing         → AdminMarketingPage
  settings          → AdminSettingsPage
  errors            → AdminErrorsPage
```

### 2. Styling: Landing V2 Design Tokens

Apply across all admin components:

- **Cards**: `rounded-2xl border-0 shadow-apple bg-card/80 backdrop-blur-sm` instead of default `rounded-lg border shadow-sm`
- **KPI cards**: Colored left-border accent (green for revenue, blue for users, purple for content, orange for alerts)
- **Header**: `bg-background/80 backdrop-blur-lg border-b border-border/50` matching `MinimalHeader`
- **Sidebar**: `bg-card/50 backdrop-blur-lg` with subtle hover states
- **Section headers**: `text-2xl font-bold` with a muted subtitle, no icon prefixes
- **Tables**: Alternating row tint with `hover:bg-primary/5`
- **Badges**: `rounded-full` pill style with softer colors

### 3. Dashboard Overview: Real Data + Actionable Widgets

**Modified file: `src/components/admin/EnhancedMetrics.tsx`**

Remove mock growth data. Replace the 7 static KPI cards with 4 primary KPIs in a clean row:
- **MRR** (green accent, euro value)
- **Total Users** (blue accent, with today's signup count as delta)
- **Active Users** (purple accent, percentage badge)
- **Errors Today** (red accent if > 0, links to errors page)

Below: a single real chart showing daily signups (last 30 days) using actual `profiles.created_at` data (already done in `UserGrowthMetrics` — reuse that query, remove the duplicate component).

Below: the conversion funnel (keep `ConversionFunnel` but restyle bars to use `rounded-xl` with gradient fills instead of raw HSL backgrounds).

### 4. Users Page: Merged Subscriber Data

**Modified file: `src/components/admin/UsersList.tsx`**

Join `profiles` with `subscribers` in the query to show:
- Email, name, join date (existing)
- **Subscription tier** badge (color-coded)
- **Credits balance** 
- **Subscribed** status (active/free/churned)

Add a "Quick Actions" dropdown per user: View Profile, Copy User ID, Open in Stripe (if `stripe_customer_id` exists).

### 5. Deduplicate Revenue

**Delete overlap**: Remove `FinancialDashboard.tsx` (its 2 cards — credits used / credits balance — are already shown better in `RevenueMetrics`). Merge the credit balance data into `RevenueMetrics`.

### 6. Restyle Error Reports

**Modified file: `src/components/admin/AdminErrorReports.tsx`**

- Replace the 3 stat cards with inline metrics in the section header (e.g., "Error Reports · 47 total · 3 today · 12 unique")
- Use `rounded-2xl` card wrapper
- Add severity color dots instead of badge text

### 7. Admin Header Refinement

**Modified file: `src/components/admin/AdminHeader.tsx`**

- Use the product logo from `logo_horizontal.png` (like MinimalHeader)
- Add `backdrop-blur-lg bg-background/80` 
- Include `SidebarTrigger` for mobile collapse
- Show current admin user email

## Files to Create
1. `src/components/admin/AdminSidebar.tsx` — new sidebar navigation
2. `src/components/admin/AdminDashboardOverview.tsx` — cleaned-up dashboard (replaces EnhancedMetrics + UserGrowthMetrics combo)
3. `src/pages/admin/AdminUsersPage.tsx` — wrapper for enhanced UsersList
4. `src/pages/admin/AdminRevenuePage.tsx` — wrapper for RevenueMetrics (with credits data merged)
5. `src/pages/admin/AdminContentPage.tsx` — wrapper for Images/Videos/Swaps tabs
6. `src/pages/admin/AdminMarketingPage.tsx` — wrapper for Affiliates + Promos
7. `src/pages/admin/AdminSettingsPage.tsx` — wrapper for Prompts + Admins
8. `src/pages/admin/AdminErrorsPage.tsx` — wrapper for error reports

## Files to Modify
1. `src/pages/AdminDashboard.tsx` — sidebar layout + `<Outlet />`
2. `src/App.tsx` — nested admin routes
3. `src/components/admin/AdminHeader.tsx` — visual refresh + sidebar trigger
4. `src/components/admin/AdminOverview.tsx` — can be removed (replaced by sub-routes)
5. `src/components/admin/EnhancedMetrics.tsx` — remove mock data, slim down to 4 KPIs
6. `src/components/admin/UsersList.tsx` — merge subscriber data
7. `src/components/admin/RevenueMetrics.tsx` — absorb credits balance from FinancialDashboard
8. `src/components/admin/AdminErrorReports.tsx` — restyle
9. `src/components/admin/ConversionFunnel.tsx` — restyle bars

## Implementation Scope

This is a large change touching ~17 files. I recommend breaking it into 3 phases:

**Phase 1**: Layout + routing (sidebar, nested routes, header) — the structural change
**Phase 2**: Restyle all cards/tables/charts with Landing V2 tokens
**Phase 3**: Data improvements (merge subscriber data into users, remove mock data, deduplicate revenue)

Shall I start with Phase 1?

