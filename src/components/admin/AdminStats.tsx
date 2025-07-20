import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Image, TrendingUp } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  assistantMessages: number;
  userMessages: number;
  totalImages: number;
}

interface AdminStatsProps {
  detailed?: boolean;
}

export const AdminStats = ({ detailed = false }: AdminStatsProps) => {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    assistantMessages: 0,
    userMessages: 0,
    totalImages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get total conversations
        const { count: totalConversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true });

        // Get total messages
        const { count: totalMessages } = await supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true });

        // Get assistant vs user messages
        const { count: assistantMessages } = await supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'assistant');

        const { count: userMessages } = await supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user');

        // Get total generated images
        const { count: totalImages } = await supabase
          .from('generated_images')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: totalUsers || 0,
          totalConversations: totalConversations || 0,
          totalMessages: totalMessages || 0,
          assistantMessages: assistantMessages || 0,
          userMessages: userMessages || 0,
          totalImages: totalImages || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalConversations}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMessages}</div>
          {detailed && (
            <div className="text-xs text-muted-foreground mt-1">
              Assistant: {stats.assistantMessages} | User: {stats.userMessages}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalImages}</div>
        </CardContent>
      </Card>

      {detailed && (
        <>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Message Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Assistant Messages:</span>
                  <span className="font-semibold">{stats.assistantMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Messages:</span>
                  <span className="font-semibold">{stats.userMessages}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Total Messages:</span>
                  <span className="font-bold">{stats.totalMessages}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Avg Messages per Conversation:</span>
                  <span className="font-semibold">
                    {stats.totalConversations > 0 ? 
                      (stats.totalMessages / stats.totalConversations).toFixed(1) : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Images per User:</span>
                  <span className="font-semibold">
                    {stats.totalUsers > 0 ? 
                      (stats.totalImages / stats.totalUsers).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};