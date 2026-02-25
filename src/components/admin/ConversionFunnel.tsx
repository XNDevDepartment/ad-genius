import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Image, CreditCard, ShoppingCart, ArrowDown } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
  gradient: string;
}

type TimePeriod = '7d' | '30d' | '90d' | 'all';

export const ConversionFunnel = () => {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('30d');

  useEffect(() => {
    fetchFunnelData();
  }, [period]);

  const getDateCutoff = () => {
    if (period === 'all') return null;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString();
  };

  const fetchFunnelData = async () => {
    setLoading(true);
    try {
      const cutoff = getDateCutoff();

      const [
        { count: accountsCount },
        { count: onboardingCount },
        testedData,
        { count: exhaustedCount },
        { count: purchasedCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', cutoff || '1970-01-01'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true).gte('created_at', cutoff || '1970-01-01'),
        supabase.from('profiles').select('id').gte('created_at', cutoff || '1970-01-01'),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'Free').lte('credits_balance', 0).gte('created_at', cutoff || '1970-01-01'),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', cutoff || '1970-01-01'),
      ]);

      const profileIds = testedData.data?.map(p => p.id) || [];
      let testedCount = 0;
      
      if (profileIds.length > 0) {
        const { data: usersWithContent } = await supabase.from('generated_images').select('user_id').in('user_id', profileIds);
        const { data: usersWithUgc } = await supabase.from('ugc_images').select('user_id').in('user_id', profileIds);
        const uniqueUsers = new Set([
          ...(usersWithContent?.map(u => u.user_id) || []),
          ...(usersWithUgc?.map(u => u.user_id) || [])
        ]);
        testedCount = uniqueUsers.size;
      }

      const total = accountsCount || 0;
      
      const newStages: FunnelStage[] = [
        { name: 'Accounts Created', count: total, percentage: 100, icon: <Users className="h-4 w-4" />, gradient: 'from-blue-500 to-blue-600' },
        { name: 'Onboarding Complete', count: onboardingCount || 0, percentage: total > 0 ? ((onboardingCount || 0) / total) * 100 : 0, icon: <UserCheck className="h-4 w-4" />, gradient: 'from-indigo-500 to-indigo-600' },
        { name: 'Tested Product', count: testedCount, percentage: total > 0 ? (testedCount / total) * 100 : 0, icon: <Image className="h-4 w-4" />, gradient: 'from-purple-500 to-purple-600' },
        { name: 'Exhausted Credits', count: exhaustedCount || 0, percentage: total > 0 ? ((exhaustedCount || 0) / total) * 100 : 0, icon: <CreditCard className="h-4 w-4" />, gradient: 'from-amber-500 to-amber-600' },
        { name: 'Converted', count: purchasedCount || 0, percentage: total > 0 ? ((purchasedCount || 0) / total) * 100 : 0, icon: <ShoppingCart className="h-4 w-4" />, gradient: 'from-green-500 to-green-600' },
      ];

      setStages(newStages);
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDropOff = (index: number) => {
    if (index === 0) return null;
    const prev = stages[index - 1];
    const curr = stages[index];
    if (prev.count === 0) return 0;
    return ((prev.count - curr.count) / prev.count) * 100;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="h-6 w-48 bg-muted rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Conversion Funnel</h3>
          <p className="text-sm text-muted-foreground">User journey stages</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList className="rounded-xl bg-muted/50">
            <TabsTrigger value="7d" className="rounded-lg text-xs">7D</TabsTrigger>
            <TabsTrigger value="30d" className="rounded-lg text-xs">30D</TabsTrigger>
            <TabsTrigger value="90d" className="rounded-lg text-xs">90D</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => {
          const dropOff = getDropOff(index);
          const barWidth = Math.max(stage.percentage, 8);
          
          return (
            <div key={stage.name}>
              {index > 0 && dropOff !== null && (
                <div className="flex items-center justify-center py-1 text-xs text-muted-foreground">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  <span className={dropOff > 50 ? 'text-destructive' : dropOff > 30 ? 'text-amber-500' : 'text-green-500'}>
                    {dropOff.toFixed(1)}% drop-off
                  </span>
                </div>
              )}
              <div className="relative">
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r ${stage.gradient} transition-all`}
                  style={{ width: `${barWidth}%`, minWidth: '220px' }}
                >
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    {stage.icon}
                    <span>{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-bold">{stage.count}</span>
                    <span className="text-white/70 text-xs">({stage.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Onboarding Rate', value: stages[1]?.percentage },
          { label: 'Product Test Rate', value: stages[2]?.percentage },
          { label: 'Credit Exhaustion', value: stages[3]?.percentage },
          { label: 'Conversion Rate', value: stages[4]?.percentage, highlight: true },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
            <div className={`text-xl font-bold ${item.highlight ? 'text-green-500' : ''}`}>
              {(item.value || 0).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
