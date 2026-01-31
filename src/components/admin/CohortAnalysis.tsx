import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    fetchCohortData();
  }, []);

  const fetchCohortData = async () => {
    setLoading(true);
    try {
      // Get last 12 months of data
      const months: CohortData[] = [];
      const now = new Date();

      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        
        const monthKey = monthStart.toISOString().slice(0, 7);
        const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Fetch all metrics for this month in parallel
        const [
          { data: signupsData },
          { data: onboardingData },
          { data: subscribersData }
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, onboarding_completed')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('profiles')
            .select('id')
            .eq('onboarding_completed', true)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('subscribers')
            .select('user_id, subscribed')
            .eq('subscribed', true)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString())
        ]);

        const signups = signupsData?.length || 0;
        const onboardingComplete = onboardingData?.length || 0;
        
        // Check how many users from this cohort created content
        let createdContent = 0;
        if (signupsData && signupsData.length > 0) {
          const userIds = signupsData.map(p => p.id);
          
          const { data: contentUsers } = await supabase
            .from('generated_images')
            .select('user_id')
            .in('user_id', userIds);
          
          const { data: ugcUsers } = await supabase
            .from('ugc_images')
            .select('user_id')
            .in('user_id', userIds);
          
          const uniqueContentUsers = new Set([
            ...(contentUsers?.map(u => u.user_id) || []),
            ...(ugcUsers?.map(u => u.user_id) || [])
          ]);
          createdContent = uniqueContentUsers.size;
        }

        const converted = subscribersData?.length || 0;

        months.push({
          month: monthKey,
          monthLabel,
          signups,
          onboardingComplete,
          createdContent,
          converted,
          onboardingRate: signups > 0 ? (onboardingComplete / signups) * 100 : 0,
          contentRate: signups > 0 ? (createdContent / signups) * 100 : 0,
          conversionRate: signups > 0 ? (converted / signups) * 100 : 0
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
    const thresholds = {
      onboarding: { good: 50, avg: 30 },
      content: { good: 40, avg: 20 },
      conversion: { good: 5, avg: 2 }
    };
    
    const { good, avg } = thresholds[type];
    
    if (rate >= good) return 'text-green-600 bg-green-50 dark:bg-green-950/30';
    if (rate >= avg) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
    return 'text-red-600 bg-red-50 dark:bg-red-950/30';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Analysis by Signup Month</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Signups</TableHead>
              <TableHead className="text-right">Onboarding %</TableHead>
              <TableHead className="text-right">Created Content %</TableHead>
              <TableHead className="text-right">Converted %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.map((cohort) => (
              <TableRow key={cohort.month}>
                <TableCell className="font-medium">{cohort.monthLabel}</TableCell>
                <TableCell className="text-right">{cohort.signups}</TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    'px-2 py-1 rounded text-sm font-medium',
                    getRateColor(cohort.onboardingRate, 'onboarding')
                  )}>
                    {cohort.onboardingRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    'px-2 py-1 rounded text-sm font-medium',
                    getRateColor(cohort.contentRate, 'content')
                  )}>
                    {cohort.contentRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    'px-2 py-1 rounded text-sm font-medium',
                    getRateColor(cohort.conversionRate, 'conversion')
                  )}>
                    {cohort.conversionRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {cohorts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No cohort data available
          </div>
        )}
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm">
          <span className="text-muted-foreground">Rate colors:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500"></span> Average
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span> Needs Attention
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
