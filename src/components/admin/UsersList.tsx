import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Mail, User } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';

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
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                  </div>
                  {user.name && (
                    <div className="text-sm text-muted-foreground mb-1">
                      Name: {user.name}
                    </div>
                  )}
                  {user.profession && (
                    <div className="text-sm text-muted-foreground mb-1">
                      Profession: {user.profession}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(user)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Profile
                </Button>
              </div>
            ))}
          </div>
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