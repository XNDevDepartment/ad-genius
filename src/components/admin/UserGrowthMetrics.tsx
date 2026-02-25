import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface SignupData { date: string; count: number }
interface TierBreakdown { tier: string; count: number }

interface UserGrowthData {
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  totalAccounts: number;
  signupsByDate: SignupData[];
  totalFreeUsers: number;
  exhaustedFreeUsers: number;
  exhaustionRate: number;
  totalPaidUsers: number;
  conversionRate: number;
  tierBreakdown: TierBreakdown[];
}

const chartConfig = {
  count: { label: "Signups", color: "hsl(var(--primary))" },
};

export const UserGrowthMetrics = () => {
  const [data, setData] = useState<UserGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchMetrics();
  }, [timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalAccountsResult, signupsTodayResult, signupsWeekResult, signupsMonthResult,
        freeUsersResult, exhaustedUsersResult, paidUsersResult, tierBreakdownResult, signupsByDateResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'Free'),
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'Free').lte('credits_balance', 0),
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).neq('subscription_tier', 'Free').eq('subscribed', true),
        supabase.from('subscribers').select('subscription_tier').neq('subscription_tier', 'Free').eq('subscribed', true),
        supabase.from('profiles').select('created_at').gte('created_at', monthAgo).order('created_at', { ascending: true })
      ]);

      const signupsByDate: SignupData[] = [];
      if (signupsByDateResult.data) {
        const groupedByDate: Record<string, number> = {};
        signupsByDateResult.data.forEach(profile => {
          const date = new Date(profile.created_at!).toISOString().split('T')[0];
          groupedByDate[date] = (groupedByDate[date] || 0) + 1;
        });
        const startDate = new Date(monthAgo);
        for (let d = startDate; d <= now; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          signupsByDate.push({ date: dateStr, count: groupedByDate[dateStr] || 0 });
        }
      }

      const tierBreakdown: TierBreakdown[] = [];
      if (tierBreakdownResult.data) {
        const tierCounts: Record<string, number> = {};
        tierBreakdownResult.data.forEach(sub => {
          const tier = sub.subscription_tier || 'Unknown';
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        Object.entries(tierCounts).forEach(([tier, count]) => tierBreakdown.push({ tier, count }));
        tierBreakdown.sort((a, b) => b.count - a.count);
      }

      const totalAccounts = totalAccountsResult.count || 0;
      const totalFreeUsers = freeUsersResult.count || 0;
      const exhaustedFreeUsers = exhaustedUsersResult.count || 0;
      const totalPaidUsers = paidUsersResult.count || 0;

      setData({
        signupsToday: signupsTodayResult.count || 0,
        signupsThisWeek: signupsWeekResult.count || 0,
        signupsThisMonth: signupsMonthResult.count || 0,
        totalAccounts,
        signupsByDate,
        totalFreeUsers,
        exhaustedFreeUsers,
        exhaustionRate: totalFreeUsers > 0 ? (exhaustedFreeUsers / totalFreeUsers) * 100 : 0,
        totalPaidUsers,
        conversionRate: totalAccounts > 0 ? (totalPaidUsers / totalAccounts) * 100 : 0,
        tierBreakdown
      });
    } catch (error) {
      console.error('Error fetching user growth metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-card/80 backdrop-blur-sm shadow-apple p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-3" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Founders': return 'bg-amber-500';
      case 'Pro': return 'bg-purple-500';
      case 'Plus': return 'bg-blue-500';
      case 'Starter': return 'bg-green-500';
      default: return 'bg-muted-foreground';
    }
  };

  const signupCards = [
    { label: 'Today', value: data.signupsToday, icon: Users, accent: 'border-l-blue-500' },
    { label: 'This Week', value: data.signupsThisWeek, icon: Users, accent: 'border-l-indigo-500' },
    { label: 'This Month', value: data.signupsThisMonth, icon: Users, accent: 'border-l-purple-500' },
    { label: 'Total Accounts', value: data.totalAccounts, icon: UserCheck, accent: 'border-l-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Acquisition & Conversion</h3>
          <p className="text-sm text-muted-foreground">Track signups, credit usage, and conversions</p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <TabsList className="rounded-xl bg-muted/50">
            <TabsTrigger value="daily" className="rounded-lg text-xs">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg text-xs">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Signup Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {signupCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-5 border-l-4 ${card.accent}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">new signups</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <h4 className="text-base font-semibold mb-4">Signups Over Time (Last 30 Days)</h4>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.signupsByDate}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Free User Funnel & Conversion */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-base font-semibold">Free User Credit Funnel</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Free</p>
              <p className="text-2xl font-bold">{data.totalFreeUsers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exhausted</p>
              <p className="text-2xl font-bold text-destructive">{data.exhaustedFreeUsers}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exhaustion Rate</span>
              <span className="font-medium">{data.exhaustionRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-destructive rounded-full transition-all duration-500" style={{ width: `${data.exhaustionRate}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-base font-semibold">Conversion Metrics</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-primary">{data.totalPaidUsers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold flex items-center gap-1">
                {data.conversionRate.toFixed(1)}%
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tier Breakdown</p>
            {data.tierBreakdown.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getTierColor(tier.tier)}`} />
                  <span className="text-sm">{tier.tier}</span>
                </div>
                <span className="text-sm font-medium">{tier.count}</span>
              </div>
            ))}
            {data.tierBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No paid users yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
