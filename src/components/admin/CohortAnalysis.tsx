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
      const months: CohortData[] = [];
      const now = new Date();

      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const monthKey = monthStart.toISOString().slice(0, 7);
        const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const [{ data: signupsData }, { data: onboardingData }, { data: subscribersData }] = await Promise.all([
          supabase.from('profiles').select('id, onboarding_completed').gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
          supabase.from('profiles').select('id').eq('onboarding_completed', true).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
          supabase.from('subscribers').select('user_id, subscribed').eq('subscribed', true).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString())
        ]);

        const signups = signupsData?.length || 0;
        const onboardingComplete = onboardingData?.length || 0;
        let createdContent = 0;

        if (signupsData && signupsData.length > 0) {
          const userIds = signupsData.map(p => p.id);
          const { data: contentUsers } = await supabase.from('generated_images').select('user_id').in('user_id', userIds);
          const { data: ugcUsers } = await supabase.from('ugc_images').select('user_id').in('user_id', userIds);
          createdContent = new Set([...(contentUsers?.map(u => u.user_id) || []), ...(ugcUsers?.map(u => u.user_id) || [])]).size;
        }

        months.push({
          month: monthKey, monthLabel, signups, onboardingComplete, createdContent,
          converted: subscribersData?.length || 0,
          onboardingRate: signups > 0 ? (onboardingComplete / signups) * 100 : 0,
          contentRate: signups > 0 ? (createdContent / signups) * 100 : 0,
          conversionRate: signups > 0 ? ((subscribersData?.length || 0) / signups) * 100 : 0
        });
      }
      setCohorts(months.filter(m => m.signups > 0));
    } catch (error) {
      console.error('Error fetching cohort data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate: number, type: 'onboarding' | 'content' | 'conversion') => {
    const thresholds = { onboarding: { good: 50, avg: 30 }, content: { good: 40, avg: 20 }, conversion: { good: 5, avg: 2 } };
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
      <p className="text-sm text-muted-foreground mb-4">By signup month</p>

      <div className="rounded-xl overflow-hidden border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Signups</TableHead>
              <TableHead className="text-right">Onboarding %</TableHead>
              <TableHead className="text-right">Content %</TableHead>
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
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getRateColor(cohort.contentRate, 'content'))}>
                    {cohort.contentRate.toFixed(1)}%
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
