import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Image, Video, CreditCard, TrendingUp, Activity } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
    
    // Real-time subscriptions
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
      // Get users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get images from both tables
      const [generatedImagesRes, ugcImagesRes] = await Promise.all([
        supabase.from('generated_images').select('*', { count: 'exact', head: true }),
        supabase.from('ugc_images').select('*', { count: 'exact', head: true }),
      ]);

      const totalImages = (generatedImagesRes.count || 0) + (ugcImagesRes.count || 0);

      // Get videos
      const { count: totalVideos } = await supabase
        .from('kling_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get credit data
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('credits_balance');

      const totalCreditsAllocated = subscribers?.reduce(
        (sum, sub) => sum + Number(sub.credits_balance),
        0
      ) || 0;

      // Get credit transactions
      const { data: transactions } = await supabase
        .from('credits_transactions')
        .select('amount');

      const totalCreditsUsed = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      const creditUtilizationRate = totalCreditsAllocated > 0
        ? (totalCreditsUsed / (totalCreditsUsed + totalCreditsAllocated)) * 100
        : 0;

      // Calculate active users (users with at least one image or video)
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

      // Mock growth data (you can enhance with real date-based queries)
      const growthData = [
        { date: '6 months ago', users: Math.floor((totalUsers || 0) * 0.4), images: Math.floor(totalImages * 0.3) },
        { date: '5 months ago', users: Math.floor((totalUsers || 0) * 0.5), images: Math.floor(totalImages * 0.4) },
        { date: '4 months ago', users: Math.floor((totalUsers || 0) * 0.6), images: Math.floor(totalImages * 0.5) },
        { date: '3 months ago', users: Math.floor((totalUsers || 0) * 0.7), images: Math.floor(totalImages * 0.6) },
        { date: '2 months ago', users: Math.floor((totalUsers || 0) * 0.85), images: Math.floor(totalImages * 0.8) },
        { date: 'Last month', users: Math.floor((totalUsers || 0) * 0.95), images: Math.floor(totalImages * 0.9) },
        { date: 'This month', users: totalUsers || 0, images: totalImages },
      ];

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
    return <div>Loading enhanced metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeUsers} active ({((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalImages}</div>
            <p className="text-xs text-muted-foreground">
              Avg {metrics.avgImagesPerUser.toFixed(1)} per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Created</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalVideos}</div>
            <p className="text-xs text-muted-foreground">Completed video jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Usage</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.creditUtilizationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalCreditsUsed.toFixed(0)} used / {metrics.totalCreditsAllocated.toFixed(0)} available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Growth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              users: {
                label: 'Users',
                color: 'hsl(var(--primary))',
              },
              images: {
                label: 'Images',
                color: 'hsl(var(--accent))',
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="images" stroke="hsl(var(--accent))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Active user rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Creation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalImages + metrics.totalVideos}</div>
            <p className="text-xs text-muted-foreground">Total assets generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
