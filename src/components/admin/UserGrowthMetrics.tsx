import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, TrendingUp, CreditCard, AlertCircle, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface SignupData {
  date: string;
  count: number;
}

interface TierBreakdown {
  tier: string;
  count: number;
}

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
  count: {
    label: "Signups",
    color: "hsl(var(--primary))",
  },
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

      // Fetch all metrics in parallel
      const [
        totalAccountsResult,
        signupsTodayResult,
        signupsWeekResult,
        signupsMonthResult,
        freeUsersResult,
        exhaustedUsersResult,
        paidUsersResult,
        tierBreakdownResult,
        signupsByDateResult
      ] = await Promise.all([
        // Total accounts
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Today's signups
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        // Week's signups
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        // Month's signups
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        // Free users
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'Free'),
        // Exhausted free users
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'Free').lte('credits_balance', 0),
        // Paid users
        supabase.from('subscribers').select('id', { count: 'exact', head: true }).neq('subscription_tier', 'Free').eq('subscribed', true),
        // Tier breakdown
        supabase.from('subscribers').select('subscription_tier').neq('subscription_tier', 'Free').eq('subscribed', true),
        // Signups by date (last 30 days)
        supabase.from('profiles').select('created_at').gte('created_at', monthAgo).order('created_at', { ascending: true })
      ]);

      // Process signups by date for chart
      const signupsByDate: SignupData[] = [];
      if (signupsByDateResult.data) {
        const groupedByDate: Record<string, number> = {};
        signupsByDateResult.data.forEach(profile => {
          const date = new Date(profile.created_at!).toISOString().split('T')[0];
          groupedByDate[date] = (groupedByDate[date] || 0) + 1;
        });

        // Fill in missing dates with 0
        const startDate = new Date(monthAgo);
        for (let d = startDate; d <= now; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          signupsByDate.push({
            date: dateStr,
            count: groupedByDate[dateStr] || 0
          });
        }
      }

      // Process tier breakdown
      const tierBreakdown: TierBreakdown[] = [];
      if (tierBreakdownResult.data) {
        const tierCounts: Record<string, number> = {};
        tierBreakdownResult.data.forEach(sub => {
          const tier = sub.subscription_tier || 'Unknown';
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        Object.entries(tierCounts).forEach(([tier, count]) => {
          tierBreakdown.push({ tier, count });
        });
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
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Founders': return 'hsl(var(--chart-1))';
      case 'Pro': return 'hsl(var(--chart-2))';
      case 'Plus': return 'hsl(var(--chart-3))';
      case 'Starter': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--chart-5))';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Acquisition & Conversion</h2>
          <p className="text-sm text-muted-foreground">Track signups, credit usage, and conversions</p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <TabsList className="grid grid-cols-3 w-[240px]">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Signup Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.signupsToday}</div>
            <p className="text-xs text-muted-foreground">new signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.signupsThisWeek}</div>
            <p className="text-xs text-muted-foreground">new signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.signupsThisMonth}</div>
            <p className="text-xs text-muted-foreground">new signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Signups Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups Over Time (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.signupsByDate}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Free User Funnel & Conversion */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free User Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Free User Credit Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Free Users</p>
                <p className="text-2xl font-bold">{data.totalFreeUsers}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Exhausted Credits</p>
                <p className="text-2xl font-bold text-destructive">{data.exhaustedFreeUsers}</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exhaustion Rate</span>
                <span className="font-medium">{data.exhaustionRate.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-destructive transition-all duration-500"
                  style={{ width: `${data.exhaustionRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.exhaustedFreeUsers} of {data.totalFreeUsers} free users have used all their credits
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Paid Users</p>
                <p className="text-2xl font-bold text-primary">{data.totalPaidUsers}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {data.conversionRate.toFixed(1)}%
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </p>
              </div>
            </div>

            {/* Tier Breakdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Tier Breakdown</p>
              <div className="space-y-2">
                {data.tierBreakdown.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTierColor(tier.tier) }}
                      />
                      <span className="text-sm">{tier.tier}</span>
                    </div>
                    <span className="text-sm font-medium">{tier.count} users</span>
                  </div>
                ))}
                {data.tierBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground">No paid users yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
