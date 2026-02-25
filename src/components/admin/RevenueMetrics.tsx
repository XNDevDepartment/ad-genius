import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, Percent, AlertTriangle, CreditCard } from 'lucide-react';

interface RevenueStats {
  mrr: number;
  totalPaying: number;
  arpu: number;
  ltv: number;
  churnRisk: number;
  totalCreditsUsed: number;
  creditsBalance: number;
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
    mrr: 0, totalPaying: 0, arpu: 0, ltv: 0, churnRisk: 0,
    totalCreditsUsed: 0, creditsBalance: 0, tierBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const [subscribersRes, transactionsRes] = await Promise.all([
        supabase.from('subscribers').select('subscription_tier, subscribed, payment_failed_at, credits_balance'),
        supabase.from('credits_transactions').select('amount'),
      ]);

      const subscribers = subscribersRes.data;
      const transactions = transactionsRes.data;
      if (!subscribers) return;

      const tierCounts: Record<string, { count: number; revenue: number }> = {};
      let totalMrr = 0;
      let totalPaying = 0;
      let churnRiskCount = 0;
      let totalCreditsBalance = 0;

      subscribers.forEach(sub => {
        const tier = sub.subscription_tier;
        const price = TIER_PRICES[tier] || 0;
        if (!tierCounts[tier]) tierCounts[tier] = { count: 0, revenue: 0 };
        tierCounts[tier].count += 1;
        totalCreditsBalance += Number(sub.credits_balance);

        if (sub.subscribed && tier !== 'Free') {
          tierCounts[tier].revenue += price;
          totalMrr += price;
          totalPaying += 1;
        }
        if (sub.payment_failed_at) churnRiskCount += 1;
      });

      const tierBreakdown = Object.entries(tierCounts)
        .map(([tier, data]) => ({ tier, count: data.count, revenue: data.revenue }))
        .sort((a, b) => {
          const order = ['Pro', 'Plus', 'Starter', 'Founders', 'Free'];
          return order.indexOf(a.tier) - order.indexOf(b.tier);
        });

      const arpu = totalPaying > 0 ? totalMrr / totalPaying : 0;
      const ltv = arpu * 6;

      const totalCreditsUsed = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      setStats({ mrr: totalMrr, totalPaying, arpu, ltv, churnRisk: churnRiskCount, totalCreditsUsed, creditsBalance: totalCreditsBalance, tierBreakdown });
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
          <div key={i} className="rounded-2xl bg-card/80 backdrop-blur-sm shadow-apple p-6 animate-pulse">
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    { label: 'Monthly Recurring Revenue', value: `€${stats.mrr.toFixed(2)}`, sub: 'From active subscriptions', icon: DollarSign, accent: 'border-l-green-500', iconColor: 'text-green-500 bg-green-500/10', valueColor: 'text-green-500' },
    { label: 'Paying Subscribers', value: stats.totalPaying.toString(), sub: 'Active paid accounts', icon: Users, accent: 'border-l-blue-500', iconColor: 'text-blue-500 bg-blue-500/10' },
    { label: 'ARPU', value: `€${stats.arpu.toFixed(2)}`, sub: 'Average Revenue Per User', icon: TrendingUp, accent: 'border-l-purple-500', iconColor: 'text-purple-500 bg-purple-500/10' },
    { label: 'Est. LTV', value: `€${stats.ltv.toFixed(2)}`, sub: 'Lifetime Value (6mo avg)', icon: Percent, accent: 'border-l-amber-500', iconColor: 'text-amber-500 bg-amber-500/10' },
  ];

  const creditKpis = [
    { label: 'Credits Used', value: stats.totalCreditsUsed.toFixed(0), sub: 'Total consumed (all time)', icon: TrendingUp, accent: 'border-l-indigo-500', iconColor: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Credits Balance', value: stats.creditsBalance.toFixed(0), sub: 'Available across all users', icon: CreditCard, accent: 'border-l-cyan-500', iconColor: 'text-cyan-500 bg-cyan-500/10' },
  ];

  const tierColors: Record<string, string> = {
    'Pro': 'bg-purple-500',
    'Plus': 'bg-blue-500',
    'Starter': 'bg-green-500',
    'Founders': 'bg-amber-500',
    'Free': 'bg-muted-foreground/40',
  };

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-5 border-l-4 ${kpi.accent}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.iconColor}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${kpi.valueColor || ''}`}>{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Credits KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        {creditKpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-5 border-l-4 ${kpi.accent}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.iconColor}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Churn Risk */}
      {stats.churnRisk > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium">{stats.churnRisk} user(s) with payment failures</p>
              <p className="text-sm text-muted-foreground">These users may churn if payment issues are not resolved</p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <h3 className="text-lg font-semibold mb-4">Subscription Tier Breakdown</h3>
        <div className="space-y-3">
          {stats.tierBreakdown.map((item) => {
            const price = TIER_PRICES[item.tier] || 0;
            const isPaid = item.tier !== 'Free';
            return (
              <div key={item.tier} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tierColors[item.tier] || 'bg-muted-foreground'}`} />
                  <div>
                    <div className="font-semibold text-sm">{item.tier}</div>
                    <div className="text-xs text-muted-foreground">€{price}/month per user</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">{item.count} users</div>
                  {isPaid && <div className="text-sm font-bold text-green-500">€{item.revenue.toFixed(2)}/mo</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
