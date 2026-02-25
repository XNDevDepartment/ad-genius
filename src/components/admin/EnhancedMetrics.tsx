import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Image, Video, CreditCard } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface EnhancedMetricsData {
  totalUsers: number;
  activeUsers: number;
  totalImages: number;
  totalVideos: number;
  avgImagesPerUser: number;
  totalCreditsAllocated: number;
  totalCreditsUsed: number;
  creditUtilizationRate: number;
  growthData: { date: string; users: number; images: number }[];
}

export const EnhancedMetrics = () => {
  const [metrics, setMetrics] = useState<EnhancedMetricsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalImages: 0,
    totalVideos: 0,
    avgImagesPerUser: 0,
    totalCreditsAllocated: 0,
    totalCreditsUsed: 0,
    creditUtilizationRate: 0,
    growthData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    
    const channel = supabase
      .channel('admin-metrics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, fetchMetrics)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'generated_images' }, fetchMetrics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const [generatedImagesRes, ugcImagesRes] = await Promise.all([
        supabase.from('generated_images').select('*', { count: 'exact', head: true }),
        supabase.from('ugc_images').select('*', { count: 'exact', head: true }),
      ]);

      const totalImages = (generatedImagesRes.count || 0) + (ugcImagesRes.count || 0);

      const { count: totalVideos } = await supabase
        .from('kling_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('credits_balance');

      const totalCreditsAllocated = subscribers?.reduce(
        (sum, sub) => sum + Number(sub.credits_balance),
        0
      ) || 0;

      const { data: transactions } = await supabase
        .from('credits_transactions')
        .select('amount');

      const totalCreditsUsed = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      const creditUtilizationRate = totalCreditsAllocated > 0
        ? (totalCreditsUsed / (totalCreditsUsed + totalCreditsAllocated)) * 100
        : 0;

      const { data: activeUserImages } = await supabase
        .from('generated_images')
        .select('user_id');

      const { data: activeUserUgc } = await supabase
        .from('ugc_images')
        .select('user_id');

      const uniqueActiveUsers = new Set([
        ...(activeUserImages?.map(i => i.user_id) || []),
        ...(activeUserUgc?.map(i => i.user_id) || []),
      ]);

      const activeUsers = uniqueActiveUsers.size;

      // Real growth data from profiles
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', monthAgo.toISOString())
        .order('created_at', { ascending: true });

      const { data: recentImages } = await supabase
        .from('generated_images')
        .select('created_at')
        .gte('created_at', monthAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const grouped: Record<string, { users: number; images: number }> = {};
      const now = new Date();
      for (let d = new Date(monthAgo); d <= now; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        grouped[key] = { users: 0, images: 0 };
      }
      recentProfiles?.forEach(p => {
        const key = new Date(p.created_at).toISOString().split('T')[0];
        if (grouped[key]) grouped[key].users += 1;
      });
      recentImages?.forEach(p => {
        const key = new Date(p.created_at).toISOString().split('T')[0];
        if (grouped[key]) grouped[key].images += 1;
      });

      const growthData = Object.entries(grouped).map(([date, vals]) => ({
        date,
        users: vals.users,
        images: vals.images,
      }));

      setMetrics({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalImages,
        totalVideos: totalVideos || 0,
        avgImagesPerUser: totalUsers ? totalImages / totalUsers : 0,
        totalCreditsAllocated,
        totalCreditsUsed,
        creditUtilizationRate,
        growthData,
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
      label: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      sub: `${metrics.activeUsers} active (${((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%)`,
      icon: Users,
      accent: 'border-l-4 border-l-blue-500',
      iconColor: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: 'Images Generated',
      value: metrics.totalImages.toLocaleString(),
      sub: `Avg ${metrics.avgImagesPerUser.toFixed(1)} per user`,
      icon: Image,
      accent: 'border-l-4 border-l-purple-500',
      iconColor: 'text-purple-500 bg-purple-500/10',
    },
    {
      label: 'Videos Created',
      value: metrics.totalVideos.toLocaleString(),
      sub: 'Completed video jobs',
      icon: Video,
      accent: 'border-l-4 border-l-amber-500',
      iconColor: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Credit Usage',
      value: `${metrics.creditUtilizationRate.toFixed(1)}%`,
      sub: `${metrics.totalCreditsUsed.toFixed(0)} used / ${metrics.totalCreditsAllocated.toFixed(0)} available`,
      icon: CreditCard,
      accent: 'border-l-4 border-l-green-500',
      iconColor: 'text-green-500 bg-green-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-5 ${kpi.accent}`}
          >
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

      {/* Growth Chart */}
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <h3 className="text-lg font-semibold mb-1">Platform Activity</h3>
        <p className="text-sm text-muted-foreground mb-4">Daily signups & images (last 30 days)</p>
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
              <XAxis
                dataKey="date"
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
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
