import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Calendar } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';
import { AdminDataTable } from './AdminDataTable';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  profession: string | null;
  account_id: string;
  description: string | null;
  profile_picture: string | null;
  created_at: string;
  updated_at: string | null;
  subscription_tier?: string;
  credits_balance?: number;
  subscribed?: boolean;
}

export const UsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [profilesRes, subscribersRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('subscribers').select('user_id, subscription_tier, credits_balance, subscribed'),
        ]);

        if (profilesRes.error) { console.error(profilesRes.error); return; }

        const subMap = new Map<string, { subscription_tier: string; credits_balance: number; subscribed: boolean }>();
        subscribersRes.data?.forEach(s => subMap.set(s.user_id, s));

        const merged = (profilesRes.data || []).map(p => ({
          ...p,
          subscription_tier: subMap.get(p.id)?.subscription_tier || 'Free',
          credits_balance: subMap.get(p.id)?.credits_balance || 0,
          subscribed: subMap.get(p.id)?.subscribed || false,
        }));

        setUsers(merged);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const tierColors: Record<string, string> = {
    'Pro': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'Plus': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Starter': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Founders': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Free': 'bg-muted text-muted-foreground border-border',
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{user.email}</div>
            {user.name && <div className="text-xs text-muted-foreground truncate">{user.name}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'subscription_tier',
      label: 'Plan',
      sortable: true,
      render: (user: UserProfile) => (
        <Badge variant="outline" className={`rounded-full text-xs font-medium ${tierColors[user.subscription_tier || 'Free'] || tierColors['Free']}`}>
          {user.subscription_tier || 'Free'}
        </Badge>
      ),
    },
    {
      key: 'credits_balance',
      label: 'Credits',
      sortable: true,
      render: (user: UserProfile) => (
        <span className="text-sm font-mono">{user.credits_balance?.toFixed(0) || 0}</span>
      ),
    },
    {
      key: 'profession',
      label: 'Profession',
      sortable: true,
      render: (user: UserProfile) => (
        <span className="text-sm text-muted-foreground">{user.profession || '—'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (user: UserProfile) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {format(new Date(user.created_at), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (user: UserProfile) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedUser(user)}
          className="gap-2 rounded-xl hover:bg-primary/5"
        >
          <Eye className="w-4 h-4" />
          View
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm shadow-apple p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">All Users</h3>
          <p className="text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
        <AdminDataTable
          data={users}
          columns={columns}
          searchPlaceholder="Search users by email, name, or account ID..."
          loading={loading}
        />
      </div>

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
};
