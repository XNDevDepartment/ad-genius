import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface CohortData {
  month: string;
  monthLabel: string;
  signups: number;
  onboardingComplete: number;
  createdContent: number;
  converted: number;
  onboardingRate: number;
  contentRate: number;
  conversionRate: number;
}

export const CohortAnalysis = () => {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCohortData(); }, []);

  const fetchCohortData = async () => {
    setLoading(true);
    try {
      // Batch fetch: get all profiles and subscribers in 2 queries instead of 36+
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      twelveMonthsAgo.setDate(1);

      const [{ data: profiles }, { data: subscribers }] = await Promise.all([
        supabase.from('profiles')
          .select('id, created_at, onboarding_completed')
          .gte('created_at', twelveMonthsAgo.toISOString())
          .order('created_at', { ascending: true }),
        supabase.from('subscribers')
          .select('user_id, subscribed, created_at')
          .eq('subscribed', true)
          .gte('created_at', twelveMonthsAgo.toISOString()),
      ]);

      if (!profiles) { setCohorts([]); return; }

      // Group profiles by month
      const monthMap: Record<string, {
        signups: string[];
        onboarding: number;
        converted: number;
      }> = {};

      profiles.forEach(p => {
        const key = new Date(p.created_at).toISOString().slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { signups: [], onboarding: 0, converted: 0 };
        monthMap[key].signups.push(p.id);
        if (p.onboarding_completed) monthMap[key].onboarding++;
      });

      // Map subscribers to their signup month
      const subscriberSet = new Set(subscribers?.map(s => s.user_id) || []);
      Object.values(monthMap).forEach(month => {
        month.converted = month.signups.filter(id => subscriberSet.has(id)).length;
      });

      // Note: content creation count would require another query per month
      // For now we skip it to keep the batch approach fast
      const months: CohortData[] = Object.entries(monthMap)
        .map(([key, data]) => {
          const d = new Date(key + '-01');
          const signups = data.signups.length;
          return {
            month: key,
            monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            signups,
            onboardingComplete: data.onboarding,
            createdContent: 0, // Omitted for performance
            converted: data.converted,
            onboardingRate: signups > 0 ? (data.onboarding / signups) * 100 : 0,
            contentRate: 0,
            conversionRate: signups > 0 ? (data.converted / signups) * 100 : 0,
          };
        })
        .filter(m => m.signups > 0)
        .sort((a, b) => b.month.localeCompare(a.month));

      setCohorts(months);
    } catch (error) {
      console.error('Error fetching cohort data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate: number, type: 'onboarding' | 'conversion') => {
    const thresholds = { onboarding: { good: 50, avg: 30 }, conversion: { good: 5, avg: 2 } };
    const { good, avg } = thresholds[type];
    if (rate >= good) return 'text-green-600 bg-green-500/10';
    if (rate >= avg) return 'text-amber-600 bg-amber-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="h-6 w-48 bg-muted rounded-lg mb-4" />
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
      <h3 className="text-lg font-semibold mb-1">Cohort Analysis</h3>
      <p className="text-sm text-muted-foreground mb-4">By signup month (batched query — fast load)</p>

      <div className="rounded-xl overflow-hidden border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Signups</TableHead>
              <TableHead className="text-right">Onboarding %</TableHead>
              <TableHead className="text-right">Converted %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.map((cohort) => (
              <TableRow key={cohort.month} className="hover:bg-primary/5">
                <TableCell className="font-medium">{cohort.monthLabel}</TableCell>
                <TableCell className="text-right">{cohort.signups}</TableCell>
                <TableCell className="text-right">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getRateColor(cohort.onboardingRate, 'onboarding'))}>
                    {cohort.onboardingRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getRateColor(cohort.conversionRate, 'conversion'))}>
                    {cohort.conversionRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {cohorts.length === 0 && <div className="text-center py-8 text-muted-foreground">No cohort data available</div>}

      <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-6 text-xs">
        <span className="text-muted-foreground">Rate colors:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Good</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Average</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Needs Attention</span>
      </div>
    </div>
  );
};
