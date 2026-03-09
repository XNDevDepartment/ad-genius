import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Image, CreditCard, ShoppingCart, ArrowDown, AlertTriangle } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  stepRate: number | null; // conversion from previous step
  icon: React.ReactNode;
  gradient: string;
}

interface ConversionFunnelProps {
  dateFrom: string | null;
}

export const ConversionFunnel = ({ dateFrom }: ConversionFunnelProps) => {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [biggestLeak, setBiggestLeak] = useState<{ from: string; to: string; dropOff: number } | null>(null);

  useEffect(() => {
    fetchFunnelData();
  }, [dateFrom]);

  const fetchFunnelData = async () => {
    setLoading(true);
    try {
      const cutoff = dateFrom || '1970-01-01';

      const [
        { count: accountsCount },
        { count: onboardingCount },
        testedData,
        { count: exhaustedCount },
        { count: purchasedCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', cutoff),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true).gte('created_at', cutoff),
        supabase.rpc('admin_count_active_users', { p_since: dateFrom }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'Free').lte('credits_balance', 0).gte('created_at', cutoff),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', cutoff),
      ]);

      const total = accountsCount || 0;
      const onboarding = onboardingCount || 0;
      const tested = Number(testedData.data) || 0;
      const exhausted = exhaustedCount || 0;
      const purchased = purchasedCount || 0;

      const counts = [total, onboarding, tested, exhausted, purchased];
      const names = ['Accounts Created', 'Onboarding Complete', 'Tested Product', 'Exhausted Credits', 'Converted'];
      const icons = [
        <Users className="h-4 w-4" />,
        <UserCheck className="h-4 w-4" />,
        <Image className="h-4 w-4" />,
        <CreditCard className="h-4 w-4" />,
        <ShoppingCart className="h-4 w-4" />,
      ];
      const gradients = [
        'from-blue-500 to-blue-600',
        'from-indigo-500 to-indigo-600',
        'from-purple-500 to-purple-600',
        'from-amber-500 to-amber-600',
        'from-green-500 to-green-600',
      ];

      const newStages: FunnelStage[] = counts.map((count, i) => ({
        name: names[i],
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        stepRate: i === 0 ? null : (counts[i - 1] > 0 ? (count / counts[i - 1]) * 100 : 0),
        icon: icons[i],
        gradient: gradients[i],
      }));

      // Find biggest leak
      let maxDrop = 0;
      let leak: typeof biggestLeak = null;
      for (let i = 1; i < counts.length; i++) {
        if (counts[i - 1] > 0) {
          const dropOff = ((counts[i - 1] - counts[i]) / counts[i - 1]) * 100;
          if (dropOff > maxDrop) {
            maxDrop = dropOff;
            leak = { from: names[i - 1], to: names[i], dropOff };
          }
        }
      }

      setStages(newStages);
      setBiggestLeak(leak);
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="h-6 w-48 bg-muted rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Conversion Funnel</h3>
        <p className="text-sm text-muted-foreground">User journey stages with step-to-step conversion</p>
      </div>

      {/* Biggest leak highlight */}
      {biggestLeak && biggestLeak.dropOff > 20 && (
        <div className="mb-5 rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Biggest funnel leak: {biggestLeak.from} → {biggestLeak.to}</p>
            <p className="text-xs text-muted-foreground">
              {biggestLeak.dropOff.toFixed(1)}% drop-off — focus improvements here for maximum impact
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {stages.map((stage, index) => {
          const barWidth = Math.max(stage.percentage, 8);
          return (
            <div key={stage.name}>
              {index > 0 && (
                <div className="flex items-center justify-center py-1 text-xs text-muted-foreground gap-2">
                  <ArrowDown className="h-3 w-3" />
                  <span className={
                    stage.stepRate !== null
                      ? stage.stepRate < 30 ? 'text-destructive font-medium' : stage.stepRate < 60 ? 'text-amber-500' : 'text-green-500'
                      : ''
                  }>
                    {stage.stepRate !== null ? `${stage.stepRate.toFixed(1)}% conversion` : ''}
                  </span>
                  <span className="text-muted-foreground/60">
                    ({((stages[index - 1].count - stage.count)).toLocaleString()} lost)
                  </span>
                </div>
              )}
              <div className="relative">
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r ${stage.gradient} transition-all`}
                  style={{ width: `${barWidth}%`, minWidth: '240px' }}
                >
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    {stage.icon}
                    <span>{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-bold">{stage.count.toLocaleString()}</span>
                    <span className="text-white/70 text-xs">({stage.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step-to-step summary */}
      <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-2 md:grid-cols-5 gap-3">
        {stages.map((stage, i) => (
          <div key={stage.name} className="text-center">
            <div className="text-xs text-muted-foreground mb-1 truncate">{i === 0 ? 'Total' : `→ ${stage.name.split(' ')[0]}`}</div>
            <div className={`text-lg font-bold ${i === stages.length - 1 ? 'text-green-500' : ''}`}>
              {i === 0 ? stage.count.toLocaleString() : `${(stage.stepRate || 0).toFixed(1)}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
