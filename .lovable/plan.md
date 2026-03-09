

## Admin Sales Funnel Dashboard — Complete Overhaul

### Current Problems

1. **No shared date filter** — each component has its own independent time filter (or none at all). EnhancedMetrics has no filter; ConversionFunnel has 7D/30D/90D; UserGrowthMetrics has Daily/Weekly/Monthly; CohortAnalysis has none.
2. **1000-row Supabase limit** — EnhancedMetrics fetches `credits_transactions`, `generated_images`, and `ugc_images` rows directly, hitting the 1000-row ceiling silently, producing inaccurate counts for active users and credit usage.
3. **CohortAnalysis makes 12+ sequential API calls** — one per month, each with sub-queries. Very slow loading.
4. **Revenue is on a separate page** — key MRR/ARPU data is disconnected from the funnel overview.
5. **Missing actionable funnel insights** — no step-to-step conversion rates, no "time to convert" metrics, no comparison between periods.

### What to Build

#### 1. Global Date Range Filter at the top of `AdminDashboardOverview`
A single date range control (7D / 30D / 90D / All) that passes the selected period down to all child components. All components will accept `dateFrom: string | null` as a prop and use it consistently.

#### 2. Rewrite `EnhancedMetrics` to use count-only queries with date filter
- Replace raw `select('user_id')` calls with `select('id', { count: 'exact', head: true })` + date filter
- Use `admin_sum_credits_used` and `admin_sum_credits_balance` RPCs (already exist) for credit data
- Add period-over-period comparison (e.g., "↑12% vs previous period")

#### 3. Unified Sales Funnel with step-to-step conversion
Rewrite `ConversionFunnel` to show clear step-by-step rates:
- Signup → Onboarding: X%
- Onboarding → First Generation: X%
- First Generation → Credits Exhausted: X%
- Credits Exhausted → Paid: X%
- Overall Signup → Paid: X%

Add a "Funnel Leaks" section highlighting the biggest drop-off point with actionable text.

#### 4. Inline Revenue Summary row
Pull key revenue KPIs (MRR, ARPU, Paying count, Churn risk) from the existing `RevenueMetrics` logic directly into the overview page as a compact card row, so admins don't need to navigate to `/admin/revenue`.

#### 5. Optimize CohortAnalysis with a single batched query
Instead of 12 sequential calls, fetch all profiles + subscribers in one query each (with date range), then group client-side by month. Much faster.

#### 6. Add "Quick Actions" section
Small action cards at the top: "Users with failed payments", "Free users with 0 credits (conversion targets)", "Users who tested but didn't convert" — each linking to the Users page with appropriate filters.

---

### Files to Change

| File | Change |
|---|---|
| `src/components/admin/AdminDashboardOverview.tsx` | Add global date filter state, pass `dateFrom` to all children, add inline revenue summary row, add quick actions section |
| `src/components/admin/EnhancedMetrics.tsx` | Accept `dateFrom` prop, use count-only queries with date filter, add period comparison arrows, use RPCs for credits |
| `src/components/admin/ConversionFunnel.tsx` | Accept `dateFrom` prop (remove internal filter), add step-to-step conversion rates, add "biggest leak" highlight |
| `src/components/admin/UserGrowthMetrics.tsx` | Accept `dateFrom` prop (remove internal filter), keep chart but sync with global filter |
| `src/components/admin/CohortAnalysis.tsx` | Batch-fetch all profiles+subscribers in 2 queries, group by month client-side |

---

### Technical Details

**Global filter in AdminDashboardOverview:**
```tsx
const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'all'>('30d');
const dateFrom = period === 'all' ? null : 
  new Date(Date.now() - {7d:7,30d:30,90d:90}[period]*86400000).toISOString();
```

**EnhancedMetrics — fix 1000-row limit for active users:**
Replace fetching all `user_id` rows with a count query using the existing `get_user_library_images` pattern, or simply count distinct users via two `head: true` queries per table filtered by date.

For active users, since we can't do `COUNT(DISTINCT user_id)` directly, we'll create a small DB function `admin_count_active_users(p_since timestamptz)` that returns the count accurately.

**New DB function needed:**
```sql
CREATE OR REPLACE FUNCTION public.admin_count_active_users(p_since timestamptz DEFAULT NULL)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::integer FROM (
    SELECT user_id FROM public.generated_images 
    WHERE (p_since IS NULL OR created_at >= p_since)
    UNION
    SELECT user_id FROM public.ugc_images 
    WHERE (p_since IS NULL OR created_at >= p_since)
  ) sub;
$$;
```

**CohortAnalysis optimization:**
Fetch all profiles with `created_at` in a single query (up to 1000 — if more, paginate). Same for subscribers. Group by `YYYY-MM` client-side. Reduces from ~36 API calls to 2-3.

**Quick Actions cards:**
```tsx
// Fetch counts for actionable segments
const [failedPayments, exhaustedFree, testedNotConverted] = await Promise.all([
  supabase.from('subscribers').select('id', {count:'exact',head:true}).not('payment_failed_at','is',null),
  supabase.from('subscribers').select('id', {count:'exact',head:true}).eq('subscription_tier','Free').lte('credits_balance',0),
  // testedNotConverted: active users who are still Free
]);
```

Each card links to `/admin/users?filter=...` for drill-down.

---

### What Does NOT Change
- Admin auth flow and sidebar navigation
- Revenue page (`/admin/revenue`) stays as-is for detailed Stripe sync
- No new edge functions needed (just one small DB function)
- CohortAnalysis table structure stays the same, only the data-fetching is optimized

