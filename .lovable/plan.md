

# Admin Panel Improvements: Revenue Fix, Content Redesign & User-Content Linking

## Problems Identified

### 1. Revenue Calculation is Wrong
The current `RevenueMetrics.tsx` uses **hardcoded tier prices** (`TIER_PRICES`) instead of querying actual Stripe payment data. Issues:
- Founders price is hardcoded as `€19.99` but some may have different pricing
- It counts `subscribed=true` users and multiplies by the hardcoded price, which doesn't reflect actual Stripe charges (discounts, promos, trials)
- The `credits_transactions` query fetches ALL transactions (could hit the 1000-row Supabase limit), making "Credits Used" inaccurate
- No distinction between monthly vs annual billing

**Fix**: Query Stripe invoices via a new edge function to get **real MRR** from actual paid invoices in the last 30 days. As a fallback (since Stripe queries are slow), keep the subscriber-based calculation but fix the 1000-row limit issue and add a note that it's an estimate. Also add a "Sync from Stripe" button that calls the edge function for accurate data.

### 2. Content Tab is Basic and Disconnected from Users
Current content tab has 3 sub-tabs (Images, Videos, Outfit Swaps) but:
- No way to filter by user
- No link from Users table to Content
- Each sub-tab fetches data independently with no shared filtering
- No summary stats (total images per type, generation trends)
- No outfit creator results shown
- Queries hit the 1000-row limit silently

### 3. No User → Content Navigation
The UsersList has a "View" button that opens a modal, but no way to see that user's generated content.

---

## Plan

### A. Fix Revenue Metrics

**Modify `src/components/admin/RevenueMetrics.tsx`**:
- Fix the 1000-row limit on `credits_transactions` by using a count/sum approach instead of fetching all rows — use `.select('amount')` with pagination or better yet, compute totals server-side
- Add a note "(estimate based on tier prices)" next to MRR
- Create a new edge function `admin-revenue-stats` that queries Stripe for actual invoice totals in the last 30 days, returning real MRR
- Add a "Refresh from Stripe" button that calls this edge function and shows accurate data
- Fix subscriber query to also fetch `stripe_customer_id` so we can count truly active Stripe subscribers vs manually-set ones

**Create `supabase/functions/admin-revenue-stats/index.ts`**:
- Validates admin role
- Queries Stripe `invoices.list` for the last 30 days with `status: 'paid'`
- Sums up paid amounts to compute real MRR
- Returns breakdown by product/plan
- Returns active subscription count from Stripe

### B. Redesign Content Tab with User Filtering

**Rewrite `src/pages/admin/AdminContentPage.tsx`**:
- Accept optional `userId` query parameter (`/admin/content?userId=xxx`)
- Show a unified content view with KPI stats at the top (total images, UGC, videos, outfit swaps, outfit creator results)
- Add filter bar: content type dropdown, date range, user filter (with clear button showing user email when filtered)
- Single unified table showing all content types with a "Type" badge column
- Include `outfit_creator_results` in the content listing (currently missing)
- Pagination aware of the 1000-row limit — paginate server-side or fetch in batches

**Modify `src/components/admin/AdminImagesList.tsx`** → Replace with a new unified `AdminContentList.tsx`:
- Single component that fetches from all content tables: `generated_images`, `ugc_images`, `kling_jobs`, `outfit_swap_results`, `outfit_creator_results`, `bulk_background_results`
- Accepts `userId` prop for filtering
- Unified columns: Preview thumbnail, Type badge, User (email), Prompt/Description, Status, Date, Actions
- Grid/Table view toggle (keep existing)
- Type filter chips instead of dropdown (Generated, UGC, Video, Outfit Swap, Outfit Creator, Background)
- Date range filter (Today, 7d, 30d, All)

### C. Add "View Content" Action to Users Table

**Modify `src/components/admin/UsersList.tsx`**:
- Add a new column "Actions" with a dropdown menu containing:
  - "View Profile" (existing modal)
  - "View Content" → navigates to `/admin/content?userId={user.id}`
- Show content count badge next to user (optional, could be expensive — skip for now)

**Modify `src/components/admin/UserProfileModal.tsx`**:
- Add a "View Content" button in Quick Actions that navigates to `/admin/content?userId={user.id}` and closes the modal

### D. Files Summary

**New files**:
1. `src/components/admin/AdminContentList.tsx` — unified content browser with user filtering, type chips, date filters
2. `supabase/functions/admin-revenue-stats/index.ts` — Stripe-based real revenue calculation

**Modified files**:
1. `src/pages/admin/AdminContentPage.tsx` — read `userId` from URL params, pass to AdminContentList, show user banner when filtered
2. `src/components/admin/RevenueMetrics.tsx` — fix 1000-row limit, add Stripe sync button, mark estimates
3. `src/components/admin/UsersList.tsx` — add dropdown actions column with "View Content" navigation
4. `src/components/admin/UserProfileModal.tsx` — add "View Content" quick action button
5. `supabase/config.toml` — add `admin-revenue-stats` function config

**Deleted files** (merged into AdminContentList):
- `src/components/admin/AdminImagesList.tsx` (functionality merged)
- `src/components/admin/AdminVideosList.tsx` (functionality merged)
- `src/components/admin/AdminOutfitSwapsList.tsx` (functionality merged)

### E. Technical Details

**Revenue edge function authentication**:
```sql
-- Verify caller is admin before returning Stripe data
SELECT is_admin(auth.uid()) -- reuse existing function
```

**Content query strategy** (avoiding 1000-row limit):
- Fetch each content type separately with `.limit(200)` per type when unfiltered
- When filtered by user, fetch all of that user's content (no limit needed, users won't have 1000+)
- Sort merged results client-side by `created_at`

**URL parameter flow**:
```
UsersList → click "View Content" → navigate("/admin/content?userId=xxx")
AdminContentPage → reads searchParams.get("userId") → passes to AdminContentList
AdminContentList → adds .eq("user_id", userId) to all queries when userId is present
```

**Content type unification schema**:
```typescript
interface UnifiedContent {
  id: string;
  type: 'generated' | 'ugc' | 'video' | 'outfit_swap' | 'outfit_creator' | 'background';
  thumbnail_url: string | null;
  title: string; // prompt or label
  status: string;
  user_id: string;
  user_email: string;
  created_at: string;
  raw: any; // original row for detail view
}
```

