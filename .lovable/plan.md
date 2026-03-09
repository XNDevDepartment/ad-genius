

## Custom Date Range Filter for Admin Dashboard

### What to Build

Replace the current preset-only filter (7D/30D/90D/All) with a hybrid approach: keep the quick presets but add a **custom date range picker** so you can select exact start and end dates. This lets you filter by any period — specific weeks, months, or custom windows.

### UI Design

The filter area will have:
1. **Quick preset tabs** (7D, 30D, 90D, All) — same as now, for fast access
2. **A "Custom" tab** that reveals a date range picker (two calendar popovers: From / To)

When "Custom" is selected, two date picker buttons appear inline showing the selected range. Selecting a preset clears the custom range.

### Files to Change

| File | Change |
|---|---|
| `src/components/admin/AdminDashboardOverview.tsx` | Add `custom` to the Period type, add `customFrom`/`customTo` state, render date pickers when custom is selected, compute `dateFrom`/`dateTo` from either preset or custom range, pass both to children |
| `src/components/admin/EnhancedMetrics.tsx` | Accept optional `dateTo` prop, apply `.lte('created_at', dateTo)` when provided |
| `src/components/admin/ConversionFunnel.tsx` | Accept optional `dateTo` prop, apply upper bound filter |
| `src/components/admin/UserGrowthMetrics.tsx` | Accept optional `dateTo` prop, apply upper bound filter |
| `src/components/admin/CohortAnalysis.tsx` | No change needed (already fetches last 12 months independently) |

### Implementation Details

**AdminDashboardOverview — new state and filter logic:**
```tsx
type Period = '7d' | '30d' | '90d' | 'all' | 'custom';

const [customFrom, setCustomFrom] = useState<Date | undefined>();
const [customTo, setCustomTo] = useState<Date | undefined>();

// Compute dateFrom/dateTo
let dateFrom: string | null = null;
let dateTo: string | null = null;

if (period === 'custom') {
  dateFrom = customFrom ? customFrom.toISOString() : null;
  dateTo = customTo ? customTo.toISOString() : null;
} else {
  const days = PERIOD_DAYS[period];
  dateFrom = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
}
```

**Date pickers** — use Shadcn Calendar + Popover (already available in the project). Show two inline date pickers when the "Custom" tab is active:
```tsx
{period === 'custom' && (
  <div className="flex items-center gap-2">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {customFrom ? format(customFrom, 'dd MMM yyyy') : 'From'}
        </Button>
      </PopoverTrigger>
      <PopoverContent><Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} /></PopoverContent>
    </Popover>
    {/* Same for customTo */}
  </div>
)}
```

**Child components** — add `dateTo?: string | null` prop. In queries that already use `.gte('created_at', dateFrom)`, add a conditional `.lte('created_at', dateTo)` when `dateTo` is provided. This is a small change in each component's fetch function.

