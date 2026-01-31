import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Percent, AlertTriangle } from 'lucide-react';

interface RevenueStats {
  mrr: number;
  totalPaying: number;
  arpu: number;
  ltv: number;
  churnRisk: number;
  tierBreakdown: { tier: string; count: number; revenue: number }[];
}

const TIER_PRICES: Record<string, number> = {
  'Free': 0,
  'Starter': 29,
  'Plus': 49,
  'Pro': 99,
  'Founders': 19.99,
};

export const RevenueMetrics = () => {
  const [stats, setStats] = useState<RevenueStats>({
    mrr: 0,
    totalPaying: 0,
    arpu: 0,
    ltv: 0,
    churnRisk: 0,
    tierBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, payment_failed_at, created_at');

      if (!subscribers) return;

      // Calculate tier breakdown
      const tierCounts: Record<string, { count: number; revenue: number }> = {};
      let totalMrr = 0;
      let totalPaying = 0;
      let churnRiskCount = 0;

      subscribers.forEach(sub => {
        const tier = sub.subscription_tier;
        const price = TIER_PRICES[tier] || 0;
        
        if (!tierCounts[tier]) {
          tierCounts[tier] = { count: 0, revenue: 0 };
        }
        tierCounts[tier].count += 1;

        if (sub.subscribed && tier !== 'Free') {
          tierCounts[tier].revenue += price;
          totalMrr += price;
          totalPaying += 1;
        }

        // Count users with payment failures as churn risk
        if (sub.payment_failed_at) {
          churnRiskCount += 1;
        }
      });

      const tierBreakdown = Object.entries(tierCounts)
        .map(([tier, data]) => ({
          tier,
          count: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => {
          const order = ['Pro', 'Plus', 'Starter', 'Founders', 'Free'];
          return order.indexOf(a.tier) - order.indexOf(b.tier);
        });

      // Calculate ARPU (Average Revenue Per User)
      const arpu = totalPaying > 0 ? totalMrr / totalPaying : 0;

      // Estimate LTV (assuming 6 month average retention)
      const avgRetentionMonths = 6;
      const ltv = arpu * avgRetentionMonths;

      setStats({
        mrr: totalMrr,
        totalPaying,
        arpu,
        ltv,
        churnRisk: churnRiskCount,
        tierBreakdown
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">€{stats.mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Real MRR from active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPaying}</div>
            <p className="text-xs text-muted-foreground">Active paid accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{stats.arpu.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average Revenue Per User</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. LTV</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{stats.ltv.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime Value (6mo avg)</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Alert */}
      {stats.churnRisk > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {stats.churnRisk} user(s) with payment failures
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  These users may churn if payment issues are not resolved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tier Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.tierBreakdown.map((item) => {
              const price = TIER_PRICES[item.tier] || 0;
              const isPaid = item.tier !== 'Free';
              
              return (
                <div 
                  key={item.tier} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      item.tier === 'Pro' ? 'bg-purple-500' :
                      item.tier === 'Plus' ? 'bg-blue-500' :
                      item.tier === 'Starter' ? 'bg-green-500' :
                      item.tier === 'Founders' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`} />
                    <div>
                      <div className="font-semibold">{item.tier}</div>
                      <div className="text-sm text-muted-foreground">
                        €{price}/month per user
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.count} users</div>
                    {isPaid && (
                      <div className="text-lg font-bold text-green-600">
                        €{item.revenue.toFixed(2)}/mo
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Note about historical data */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center">
            💡 Historical revenue trends require storing Stripe payment events. 
            Consider implementing a payment_events table for future analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
