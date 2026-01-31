
## Admin Dashboard Overhaul - Funnel Analytics & Financial Fix

### Problem Analysis

Based on the current implementation and database exploration:

**Financial Dashboard Issues:**
- Revenue chart shows **fake mock data** (lines 84-91 in FinancialDashboard.tsx multiply current revenue by arbitrary percentages)
- Real MRR: **€675.80** from 24 paying subscribers - but dashboard shows calculated estimates
- No historical revenue tracking (would need Stripe webhooks to log payment events)

**Missing Funnel Analytics (as shown in your spreadsheet):**
The spreadsheet tracks: `Visits → Accounts → Onboarding → Tested → Exhausted Credits → Purchased`

Current data available in the database:
| Metric | Data Available | Source |
|--------|----------------|--------|
| Visits | NOT in database | External (Google Analytics/Clarity) |
| Accounts Created | ✅ Yes | profiles.created_at |
| Onboarding Complete | ✅ Yes | profiles.onboarding_completed |
| Tested Product | ✅ Yes | generated_images + ugc_images |
| Exhausted Free Credits | ✅ Yes | subscribers.credits_balance <= 0 |
| Purchased | ✅ Yes | subscribers.subscribed + tier |

**Real funnel data from last 7 days:**
- Accounts Created: 71
- Onboarding Complete: 21 (29.6%)
- Tested Product: 43 (60.6%)
- Exhausted Credits: 5 (7.0%)
- Purchased: 1 (1.4%)

---

### Solution Architecture

#### 1. New Component: `ConversionFunnel.tsx`
Visual funnel chart showing the customer journey with:
- Horizontal funnel bars with percentage drop-offs between stages
- Time period selector (7 days, 30 days, 90 days, all time)
- Conversion rates between each stage
- Color-coded health indicators

```
┌─────────────────────────────────────────────────────────────────┐
│ ACCOUNTS CREATED                                           71  │
├────────────────────────────────────────────────────────────┐    │
│ ONBOARDING COMPLETE (29.6%)                           21  │    │
├─────────────────────────────────────────────────────┐      │    │
│ TESTED PRODUCT (60.6%)                         43  │       │    │
├──────────────────────────────────────────────┐      │      │    │
│ EXHAUSTED CREDITS (7.0%)                 5  │       │      │    │
├──────────────────────────────────────┐       │       │     │    │
│ CONVERTED (1.4%)                1   │        │       │     │    │
└──────────────────────────────────────────────────────────────────┘
```

#### 2. New Component: `CohortAnalysis.tsx`
Monthly cohort table showing conversion rates per signup month:

| Cohort | Signups | Onboarding % | Created Content % | Converted % |
|--------|---------|--------------|-------------------|-------------|
| Jan 2026 | 106 | 50% | 56% | 2.8% |
| Dec 2025 | 28 | 100% | 39% | 0% |
| Nov 2025 | 74 | 100% | 54% | 10.8% |

#### 3. Fix: `FinancialDashboard.tsx`
- Remove mock revenue chart data
- Calculate real MRR from current active subscriptions
- Show actual subscription count per tier
- Add "No historical data available" notice for revenue trend

#### 4. New Component: `RevenueMetrics.tsx`
- Real MRR based on active subscriptions and tier prices
- LTV (Lifetime Value) estimation
- ARPU (Average Revenue Per User)
- Churn rate (if payment_failed_at data available)

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/ConversionFunnel.tsx` | Visual funnel with stages and percentages |
| `src/components/admin/CohortAnalysis.tsx` | Monthly cohort table with conversion rates |
| `src/components/admin/RevenueMetrics.tsx` | Accurate revenue KPIs |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AdminOverview.tsx` | Add new Funnel tab, reorganize layout |
| `src/components/admin/FinancialDashboard.tsx` | Fix mock data, show real MRR, remove fake chart |

---

### Technical Implementation

#### ConversionFunnel Component

```typescript
interface FunnelStage {
  name: string;
  count: number;
  percentage: number; // % of total accounts
  dropOff: number; // % drop from previous stage
  color: string;
}

// Data fetching query pattern
const fetchFunnelData = async (days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  // Single query with CTEs for efficiency
  const { data } = await supabase.rpc('get_conversion_funnel', { 
    since_date: cutoff.toISOString() 
  });
  
  // Or multiple parallel queries for each stage
};
```

#### Database Function (Optional Enhancement)
Create a Postgres function `get_conversion_funnel(since_date)` that returns all funnel metrics in one call for better performance.

#### Real MRR Calculation

```typescript
const tierPrices: Record<string, number> = {
  'Free': 0,
  'Starter': 29,
  'Plus': 49,
  'Pro': 99,
  'Founders': 19.99,
};

// Sum only ACTIVE subscriptions
const mrr = subscribers
  .filter(s => s.subscribed && s.subscription_tier !== 'Free')
  .reduce((sum, s) => sum + (tierPrices[s.subscription_tier] || 0), 0);
```

---

### UI/UX Design

#### Funnel Visualization
- Horizontal stacked bar chart using Recharts FunnelChart or custom SVG
- Each stage shows: Stage name, Count, Percentage
- Arrows between stages showing drop-off rate
- Color gradient from green (high conversion) to red (low conversion)
- Tooltip with detailed breakdown on hover

#### Time Period Selector
- Tabs: "7 Days" | "30 Days" | "90 Days" | "All Time"
- Auto-refresh with real-time subscription on new signups

#### Cohort Table
- Rows: Months (most recent first)
- Columns: Signups, Onboarding %, Content %, Converted %
- Color-coded cells (green = good, yellow = average, red = needs attention)
- Click on cohort to see detailed user list

---

### Admin Overview Tab Restructure

**Current tabs (11):** Overview, Financial, Users, Images, Videos, Outfit Swaps, Affiliates, AI Prompts, Promo Codes, Errors, Admins

**New structure (reorganized):**
1. **Dashboard** - Key metrics overview + ConversionFunnel
2. **Funnel** - Detailed ConversionFunnel + CohortAnalysis
3. **Revenue** - Fixed FinancialDashboard + RevenueMetrics
4. **Users** - UsersList (unchanged)
5. **Content** - Images + Videos + Outfit Swaps combined
6. **Marketing** - Affiliates + Promo Codes combined
7. **Settings** - AI Prompts + Admins combined
8. **Errors** - Error reports

This reduces from 11 tabs to 8, making navigation cleaner.

---

### Notes

**Visits Tracking:**
The spreadsheet shows "nº visitas" (visits) which isn't tracked in Supabase. This would require:
- Google Analytics integration (external)
- Microsoft Clarity (already installed based on the diff shown)
- Or custom event tracking table

For now, the funnel will start from "Accounts Created" rather than visits.

**Historical Revenue:**
Without storing Stripe payment events historically, we can only show current MRR, not trends. Consider adding a `payment_events` table to log Stripe webhook data for future historical analysis.
