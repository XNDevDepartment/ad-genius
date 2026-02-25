import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, Percent, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RevenueStats {
  mrr: number;
  totalPaying: number;
  arpu: number;
  ltv: number;
  churnRisk: number;
  totalCreditsUsed: number;
  creditsBalance: number;
  tierBreakdown: { tier: string; count: number; revenue: number }[];
  isEstimate: boolean;
  stripeMrr: number | null;
  stripeActiveSubscriptions: number | null;
  stripeSyncedAt: string | null;
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
    totalCreditsUsed: 0, creditsBalance: 0, tierBreakdown: [],
    isEstimate: true, stripeMrr: null, stripeActiveSubscriptions: null, stripeSyncedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      // Fetch subscribers with stripe_customer_id
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, payment_failed_at, credits_balance, stripe_customer_id');

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

      // Use DB function for credits used (avoids 1000-row limit)
      let totalCreditsUsed = 0;
      try {
        const { data } = await supabase.rpc('admin_sum_credits_used');
        totalCreditsUsed = Number(data) || 0;
      } catch {
        totalCreditsUsed = 0;
      }

      setStats(prev => ({
        ...prev,
        mrr: totalMrr, totalPaying, arpu, ltv, churnRisk: churnRiskCount,
        totalCreditsUsed, creditsBalance: totalCreditsBalance, tierBreakdown,
        isEstimate: prev.stripeMrr === null,
      }));
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromStripe = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }

      const { data, error } = await supabase.functions.invoke('admin-revenue-stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setStats(prev => ({
        ...prev,
        stripeMrr: data.stripe_mrr,
        stripeActiveSubscriptions: data.active_subscriptions,
        stripeSyncedAt: data.synced_at,
        totalCreditsUsed: data.credits_used_total || prev.totalCreditsUsed,
        creditsBalance: data.credits_balance_total || prev.creditsBalance,
        isEstimate: false,
      }));
      toast.success('Synced from Stripe successfully');
    } catch (error: any) {
      console.error('Stripe sync error:', error);
      toast.error(error.message || 'Failed to sync from Stripe');
    } finally {
      setSyncing(false);
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

  const displayMrr = stats.stripeMrr !== null ? stats.stripeMrr : stats.mrr;
  const displayPayingCount = stats.stripeActiveSubscriptions !== null ? stats.stripeActiveSubscriptions : stats.totalPaying;
  const displayArpu = displayPayingCount > 0 ? displayMrr / displayPayingCount : 0;

  const kpis = [
    {
      label: 'Monthly Recurring Revenue',
      value: `€${displayMrr.toFixed(2)}`,
      sub: stats.isEstimate ? '⚠️ Estimate (tier prices)' : `Stripe data · ${stats.stripeSyncedAt ? new Date(stats.stripeSyncedAt).toLocaleTimeString() : ''}`,
      icon: DollarSign,
      accent: 'border-l-green-500',
      iconColor: 'text-green-500 bg-green-500/10',
      valueColor: 'text-green-500',
    },
    { label: 'Paying Subscribers', value: displayPayingCount.toString(), sub: stats.isEstimate ? 'From DB (estimate)' : 'Active Stripe subscriptions', icon: Users, accent: 'border-l-blue-500', iconColor: 'text-blue-500 bg-blue-500/10' },
    { label: 'ARPU', value: `€${displayArpu.toFixed(2)}`, sub: 'Average Revenue Per User', icon: TrendingUp, accent: 'border-l-purple-500', iconColor: 'text-purple-500 bg-purple-500/10' },
    { label: 'Est. LTV', value: `€${(displayArpu * 6).toFixed(2)}`, sub: 'Lifetime Value (6mo avg)', icon: Percent, accent: 'border-l-amber-500', iconColor: 'text-amber-500 bg-amber-500/10' },
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
      {/* Stripe sync bar */}
      <div className="flex items-center justify-between">
        <div>
          {stats.isEstimate && (
            <p className="text-sm text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Revenue figures are estimates based on tier prices. Sync from Stripe for accurate data.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={syncFromStripe} disabled={syncing} className="rounded-xl gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Stripe'}
        </Button>
      </div>

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
