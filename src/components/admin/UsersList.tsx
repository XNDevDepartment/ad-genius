import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

export const UsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user: UserProfile) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{user.email}</div>
            {user.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'profession',
      label: 'Profession',
      sortable: true,
      render: (user: UserProfile) => (
        <Badge variant="secondary">{user.profession || 'Not specified'}</Badge>
      ),
    },
    {
      key: 'account_id',
      label: 'Account ID',
      sortable: true,
      render: (user: UserProfile) => (
        <span className="font-mono text-xs">{user.account_id}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (user: UserProfile) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {format(new Date(user.created_at), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: UserProfile) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedUser(user)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          View
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            data={users}
            columns={columns}
            searchPlaceholder="Search users by email, name, or account ID..."
            loading={loading}
          />
        </CardContent>
      </Card>

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