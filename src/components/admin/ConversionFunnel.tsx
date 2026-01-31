import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Image, CreditCard, ShoppingCart, ArrowDown } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
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

      // Parallel queries for each stage
      const [
        { count: accountsCount },
        { count: onboardingCount },
        testedData,
        { count: exhaustedCount },
        { count: purchasedCount }
      ] = await Promise.all([
        // 1. Accounts created
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', cutoff || '1970-01-01'),
        
        // 2. Onboarding completed
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('onboarding_completed', true)
          .gte('created_at', cutoff || '1970-01-01'),
        
        // 3. Tested product (users who have generated images OR ugc images)
        supabase
          .from('profiles')
          .select('id')
          .gte('created_at', cutoff || '1970-01-01'),
        
        // 4. Exhausted credits (free users with 0 or less credits)
        supabase
          .from('subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_tier', 'Free')
          .lte('credits_balance', 0)
          .gte('created_at', cutoff || '1970-01-01'),
        
        // 5. Purchased (subscribed users)
        supabase
          .from('subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('subscribed', true)
          .gte('created_at', cutoff || '1970-01-01'),
      ]);

      // For "tested product", we need to check if users have any generated images or ugc images
      const profileIds = testedData.data?.map(p => p.id) || [];
      let testedCount = 0;
      
      if (profileIds.length > 0) {
        // Check for users who have generated any content
        const { data: usersWithContent } = await supabase
          .from('generated_images')
          .select('user_id')
          .in('user_id', profileIds);
        
        const { data: usersWithUgc } = await supabase
          .from('ugc_images')
          .select('user_id')
          .in('user_id', profileIds);
        
        const uniqueUsers = new Set([
          ...(usersWithContent?.map(u => u.user_id) || []),
          ...(usersWithUgc?.map(u => u.user_id) || [])
        ]);
        testedCount = uniqueUsers.size;
      }

      const total = accountsCount || 0;
      
      const newStages: FunnelStage[] = [
        {
          name: 'Accounts Created',
          count: total,
          percentage: 100,
          icon: <Users className="h-5 w-5" />,
          color: 'hsl(var(--primary))'
        },
        {
          name: 'Onboarding Complete',
          count: onboardingCount || 0,
          percentage: total > 0 ? ((onboardingCount || 0) / total) * 100 : 0,
          icon: <UserCheck className="h-5 w-5" />,
          color: 'hsl(217, 91%, 60%)'
        },
        {
          name: 'Tested Product',
          count: testedCount,
          percentage: total > 0 ? (testedCount / total) * 100 : 0,
          icon: <Image className="h-5 w-5" />,
          color: 'hsl(262, 83%, 58%)'
        },
        {
          name: 'Exhausted Credits',
          count: exhaustedCount || 0,
          percentage: total > 0 ? ((exhaustedCount || 0) / total) * 100 : 0,
          icon: <CreditCard className="h-5 w-5" />,
          color: 'hsl(25, 95%, 53%)'
        },
        {
          name: 'Converted',
          count: purchasedCount || 0,
          percentage: total > 0 ? ((purchasedCount || 0) / total) * 100 : 0,
          icon: <ShoppingCart className="h-5 w-5" />,
          color: 'hsl(142, 76%, 36%)'
        }
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
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Conversion Funnel</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const dropOff = getDropOff(index);
            const maxWidth = 100;
            const barWidth = Math.max(stage.percentage, 5); // minimum 5% for visibility
            
            return (
              <div key={stage.name}>
                {index > 0 && dropOff !== null && (
                  <div className="flex items-center justify-center py-1 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    <span className={dropOff > 50 ? 'text-destructive' : dropOff > 30 ? 'text-yellow-500' : 'text-green-500'}>
                      {dropOff.toFixed(1)}% drop-off
                    </span>
                  </div>
                )}
                <div className="relative">
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: stage.color,
                      minWidth: '200px'
                    }}
                  >
                    <div className="flex items-center gap-2 text-white font-medium">
                      {stage.icon}
                      <span>{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <span className="font-bold text-lg">{stage.count}</span>
                      <span className="text-white/80 text-sm">({stage.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Conversion Summary */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Onboarding Rate</div>
            <div className="text-xl font-bold">
              {stages[1]?.percentage.toFixed(1) || 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Product Test Rate</div>
            <div className="text-xl font-bold">
              {stages[2]?.percentage.toFixed(1) || 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Credit Exhaustion</div>
            <div className="text-xl font-bold">
              {stages[3]?.percentage.toFixed(1) || 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
            <div className="text-xl font-bold text-green-600">
              {stages[4]?.percentage.toFixed(1) || 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
