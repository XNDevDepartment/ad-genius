import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Image, Video, CreditCard } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface EnhancedMetricsProps {
  dateFrom: string | null;
  dateTo?: string | null;
}

interface MetricsData {
  totalUsers: number;
  activeUsers: number;
  totalImages: number;
  totalVideos: number;
  avgImagesPerUser: number;
  totalCreditsUsed: number;
  creditsBalance: number;
  creditUtilizationRate: number;
  growthData: { date: string; users: number; images: number }[];
}

export const EnhancedMetrics = ({ dateFrom, dateTo }: EnhancedMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalUsers: 0, activeUsers: 0, totalImages: 0, totalVideos: 0,
    avgImagesPerUser: 0, totalCreditsUsed: 0, creditsBalance: 0,
    creditUtilizationRate: 0, growthData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [dateFrom, dateTo]);

  const applyDateRange = (query: any) => {
    const cutoff = dateFrom || '1970-01-01';
    let q = query.gte('created_at', cutoff);
    if (dateTo) q = q.lte('created_at', dateTo);
    return q;
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const cutoff = dateFrom || '1970-01-01';

      // All count-only queries in parallel — no 1000-row limit
      const [
        { count: totalUsers },
        genImagesRes,
        ugcImagesRes,
        { count: totalVideos },
        creditsUsedRes,
        creditsBalanceRes,
        activeUsersRes,
      ] = await Promise.all([
        applyDateRange(supabase.from('profiles').select('*', { count: 'exact', head: true })),
        applyDateRange(supabase.from('generated_images').select('*', { count: 'exact', head: true })),
        applyDateRange(supabase.from('ugc_images').select('*', { count: 'exact', head: true })),
        applyDateRange(supabase.from('kling_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')),
        supabase.rpc('admin_sum_credits_used'),
        supabase.rpc('admin_sum_credits_balance'),
        supabase.rpc('admin_count_active_users', { p_since: dateFrom }),
      ]);

      const totalImages = (genImagesRes.count || 0) + (ugcImagesRes.count || 0);
      const totalCreditsUsed = Number(creditsUsedRes.data) || 0;
      const creditsBalance = Number(creditsBalanceRes.data) || 0;
      const activeUsers = Number(activeUsersRes.data) || 0;
      const users = totalUsers || 0;

      // Growth chart — last 30 days of the selected window
      const chartEnd = dateTo ? new Date(dateTo) : new Date();
      const chartStart = new Date(dateFrom || chartEnd.getTime() - 30 * 86400000);
      const chartCutoff = new Date(Math.max(chartStart.getTime(), chartEnd.getTime() - 30 * 86400000));

      let profilesQuery = supabase.from('profiles').select('created_at').gte('created_at', chartCutoff.toISOString()).order('created_at', { ascending: true });
      let imagesQuery = supabase.from('generated_images').select('created_at').gte('created_at', chartCutoff.toISOString()).order('created_at', { ascending: true });
      if (dateTo) {
        profilesQuery = profilesQuery.lte('created_at', dateTo);
        imagesQuery = imagesQuery.lte('created_at', dateTo);
      }

      const [{ data: recentProfiles }, { data: recentImages }] = await Promise.all([profilesQuery, imagesQuery]);

      const grouped: Record<string, { users: number; images: number }> = {};
      for (let d = new Date(chartCutoff); d <= chartEnd; d.setDate(d.getDate() + 1)) {
        grouped[d.toISOString().split('T')[0]] = { users: 0, images: 0 };
      }
      recentProfiles?.forEach(p => {
        const key = new Date(p.created_at).toISOString().split('T')[0];
        if (grouped[key]) grouped[key].users += 1;
      });
      recentImages?.forEach(p => {
        const key = new Date(p.created_at).toISOString().split('T')[0];
        if (grouped[key]) grouped[key].images += 1;
      });

      setMetrics({
        totalUsers: users,
        activeUsers,
        totalImages,
        totalVideos: totalVideos || 0,
        avgImagesPerUser: users ? totalImages / users : 0,
        totalCreditsUsed,
        creditsBalance,
        creditUtilizationRate: (totalCreditsUsed + creditsBalance) > 0
          ? (totalCreditsUsed / (totalCreditsUsed + creditsBalance)) * 100 : 0,
        growthData: Object.entries(grouped).map(([date, vals]) => ({ date, ...vals })),
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
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
    {
      label: 'Total Users', value: metrics.totalUsers.toLocaleString(),
      sub: `${metrics.activeUsers} active (${metrics.totalUsers > 0 ? ((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1) : 0}%)`,
      icon: Users, accent: 'border-l-4 border-l-blue-500', iconColor: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: 'Images Generated', value: metrics.totalImages.toLocaleString(),
      sub: `Avg ${metrics.avgImagesPerUser.toFixed(1)} per user`,
      icon: Image, accent: 'border-l-4 border-l-purple-500', iconColor: 'text-purple-500 bg-purple-500/10',
    },
    {
      label: 'Videos Created', value: metrics.totalVideos.toLocaleString(),
      sub: 'Completed video jobs',
      icon: Video, accent: 'border-l-4 border-l-amber-500', iconColor: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Credit Usage', value: `${metrics.creditUtilizationRate.toFixed(1)}%`,
      sub: `${metrics.totalCreditsUsed.toFixed(0)} used / ${metrics.creditsBalance.toFixed(0)} available`,
      icon: CreditCard, accent: 'border-l-4 border-l-green-500', iconColor: 'text-green-500 bg-green-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-5 ${kpi.accent}`}>
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

      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <h3 className="text-lg font-semibold mb-1">Platform Activity</h3>
        <p className="text-sm text-muted-foreground mb-4">Daily signups & images (last 30 days of selected period)</p>
        <ChartContainer
          config={{
            users: { label: 'Signups', color: 'hsl(var(--primary))' },
            images: { label: 'Images', color: 'hsl(var(--accent))' },
          }}
          className="h-[260px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.growthData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="images" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};
