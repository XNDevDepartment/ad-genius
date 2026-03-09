import { useState, useEffect } from 'react';
import { EnhancedMetrics } from './EnhancedMetrics';
import { ConversionFunnel } from './ConversionFunnel';
import { UserGrowthMetrics } from './UserGrowthMetrics';
import { CohortAnalysis } from './CohortAnalysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Target, CreditCard, DollarSign, Users, TrendingUp, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Period = '7d' | '30d' | '90d' | 'all';

const PERIOD_DAYS: Record<Period, number | null> = { '7d': 7, '30d': 30, '90d': 90, 'all': null };

const TIER_PRICES: Record<string, number> = {
  Free: 0, Starter: 29, Plus: 49, Pro: 99, Founders: 19.99,
};

interface QuickAction {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  filter?: string;
}

interface RevenueSummary {
  mrr: number;
  payingCount: number;
  arpu: number;
  churnRisk: number;
  isEstimate: boolean;
  stripeMrr: number | null;
  stripeSyncedAt: string | null;
}

export const AdminDashboardOverview = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary>({
    mrr: 0, payingCount: 0, arpu: 0, churnRisk: 0,
    isEstimate: true, stripeMrr: null, stripeSyncedAt: null,
  });
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const days = PERIOD_DAYS[period];
  const dateFrom = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

  useEffect(() => {
    fetchQuickActions();
    fetchRevenueSummary();
  }, []);

  const fetchQuickActions = async () => {
    const [failedPayments, exhaustedFree] = await Promise.all([
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).not('payment_failed_at', 'is', null),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'Free').lte('credits_balance', 0),
    ]);

    setQuickActions([
      {
        label: 'Failed Payments',
        count: failedPayments.count || 0,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-destructive bg-destructive/10',
        filter: 'failed_payments',
      },
      {
        label: 'Free with 0 Credits',
        count: exhaustedFree.count || 0,
        icon: <Target className="h-4 w-4" />,
        color: 'text-amber-500 bg-amber-500/10',
        filter: 'exhausted_free',
      },
    ]);
  };

  const fetchRevenueSummary = async () => {
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed, payment_failed_at');

    if (!subscribers) return;

    let mrr = 0, payingCount = 0, churnRisk = 0;
    subscribers.forEach(sub => {
      if (sub.subscribed && sub.subscription_tier !== 'Free') {
        mrr += TIER_PRICES[sub.subscription_tier] || 0;
        payingCount++;
      }
      if (sub.payment_failed_at) churnRisk++;
    });

    setRevenue(prev => ({
      ...prev,
      mrr, payingCount,
      arpu: payingCount > 0 ? mrr / payingCount : 0,
      churnRisk,
    }));
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
      setRevenue(prev => ({
        ...prev,
        stripeMrr: data.stripe_mrr,
        stripeSyncedAt: data.synced_at,
        isEstimate: false,
      }));
      toast.success('Synced from Stripe');
    } catch (e: any) {
      toast.error(e.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const displayMrr = revenue.stripeMrr !== null ? revenue.stripeMrr : revenue.mrr;
  const displayArpu = revenue.payingCount > 0 ? displayMrr / revenue.payingCount : 0;

  const revenueCards = [
    { label: 'MRR', value: `€${displayMrr.toFixed(0)}`, icon: DollarSign, color: 'text-green-500 bg-green-500/10', accent: 'border-l-green-500' },
    { label: 'Paying', value: revenue.payingCount.toString(), icon: Users, color: 'text-blue-500 bg-blue-500/10', accent: 'border-l-blue-500' },
    { label: 'ARPU', value: `€${displayArpu.toFixed(0)}`, icon: TrendingUp, color: 'text-purple-500 bg-purple-500/10', accent: 'border-l-purple-500' },
    { label: 'Churn Risk', value: revenue.churnRisk.toString(), icon: AlertTriangle, color: revenue.churnRisk > 0 ? 'text-destructive bg-destructive/10' : 'text-green-500 bg-green-500/10', accent: revenue.churnRisk > 0 ? 'border-l-destructive' : 'border-l-green-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Header with global filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Funnel Dashboard</h2>
          <p className="text-muted-foreground">Full funnel overview — from signup to revenue</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="rounded-xl bg-muted/50">
            <TabsTrigger value="7d" className="rounded-lg text-xs px-4">7D</TabsTrigger>
            <TabsTrigger value="30d" className="rounded-lg text-xs px-4">30D</TabsTrigger>
            <TabsTrigger value="90d" className="rounded-lg text-xs px-4">90D</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg text-xs px-4">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Quick Actions */}
      {quickActions.some(a => a.count > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.filter(a => a.count > 0).map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(`/admin/users${action.filter ? `?filter=${action.filter}` : ''}`)}
              className="flex items-center gap-3 rounded-xl bg-card/80 backdrop-blur-sm shadow-apple p-4 hover:bg-accent/50 transition-colors text-left"
            >
              <div className={`p-2 rounded-xl ${action.color}`}>{action.icon}</div>
              <div>
                <p className="font-semibold text-sm">{action.count} {action.label}</p>
                <p className="text-xs text-muted-foreground">Click to view in Users</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Inline Revenue Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Snapshot</h3>
          <Button variant="ghost" size="sm" onClick={syncFromStripe} disabled={syncing} className="rounded-lg gap-1.5 text-xs h-7">
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {revenue.isEstimate ? 'Sync Stripe' : 'Refresh'}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {revenueCards.map(card => (
            <div key={card.label} className={`rounded-xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-4 border-l-4 ${card.accent}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.color}`}>
                  <card.icon className="h-3 w-3" />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">{card.value}</div>
            </div>
          ))}
        </div>
        {revenue.isEstimate && (
          <p className="text-xs text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Estimates based on tier prices. Sync from Stripe for accurate data.
          </p>
        )}
      </div>

      {/* Platform Metrics */}
      <EnhancedMetrics dateFrom={dateFrom} />

      {/* Sales Funnel */}
      <ConversionFunnel dateFrom={dateFrom} />

      {/* User Growth */}
      <UserGrowthMetrics dateFrom={dateFrom} />

      {/* Cohort Analysis */}
      <CohortAnalysis />
    </div>
  );
};
