import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  totalCreditsUsed: number;
  creditsBalance: number;
  subscriptionBreakdown: { tier: string; count: number; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export const FinancialDashboard = () => {
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    totalCreditsUsed: 0,
    creditsBalance: 0,
    subscriptionBreakdown: [],
    revenueByMonth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Get subscription data
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*');

      if (!subscribers) return;

      // Calculate subscription breakdown
      const tierPrices = {
        Free: 0,
        Starter: 29,
        Plus: 49,
        Pro: 99,
        Founders: 19.99,
      };

      const breakdown = subscribers.reduce((acc, sub) => {
        const existing = acc.find((item) => item.tier === sub.subscription_tier);
        const revenue = tierPrices[sub.subscription_tier as keyof typeof tierPrices] || 0;
        
        if (existing) {
          existing.count += 1;
          existing.revenue += sub.subscribed ? revenue : 0;
        } else {
          acc.push({
            tier: sub.subscription_tier,
            count: 1,
            revenue: sub.subscribed ? revenue : 0,
          });
        }
        return acc;
      }, [] as { tier: string; count: number; revenue: number }[]);

      const totalRevenue = breakdown.reduce((sum, item) => sum + item.revenue, 0);
      const activeSubscriptions = subscribers.filter(s => s.subscribed).length;

      // Get credit transactions
      const { data: transactions } = await supabase
        .from('credits_transactions')
        .select('amount, created_at, reason');

      const totalCreditsUsed = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      const totalCreditsBalance = subscribers.reduce((sum, s) => sum + Number(s.credits_balance), 0);

      // Generate mock monthly revenue data (you can enhance this with real data)
      const revenueByMonth = [
        { month: 'Jan', revenue: totalRevenue * 0.6 },
        { month: 'Feb', revenue: totalRevenue * 0.7 },
        { month: 'Mar', revenue: totalRevenue * 0.75 },
        { month: 'Apr', revenue: totalRevenue * 0.8 },
        { month: 'May', revenue: totalRevenue * 0.9 },
        { month: 'Jun', revenue: totalRevenue },
      ];

      setStats({
        totalRevenue,
        monthlyRevenue: totalRevenue,
        activeSubscriptions,
        totalCreditsUsed,
        creditsBalance: totalCreditsBalance,
        subscriptionBreakdown: breakdown,
        revenueByMonth,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading financial data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreditsUsed.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Total credits consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.creditsBalance.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Available across all users</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: 'Revenue',
                color: 'hsl(var(--primary))',
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Breakdown by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.subscriptionBreakdown.map((item) => (
              <div key={item.tier} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold">{item.tier}</div>
                  <div className="text-sm text-muted-foreground">{item.count} subscribers</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">€{item.revenue.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Monthly</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
