import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserPlus, Trash2, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    email: string;
    name: string | null;
  } | null;
}

export const AdminManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      // Fetch profile data for each admin
      const adminsWithProfiles = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('id', role.user_id)
            .single();

          return {
            ...role,
            profiles: profileData
          };
        })
      );

      setAdmins(adminsWithProfiles);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      // First, find the user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newAdminEmail.trim())
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Error",
          description: "User not found with this email address",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already an admin
      const { data: existingAdmin } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profileData.id)
        .eq('role', 'admin')
        .single();

      if (existingAdmin) {
        toast({
          title: "Error",
          description: "User is already an admin",
          variant: "destructive",
        });
        return;
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profileData.id,
          role: 'admin'
        });

      if (insertError) {
        console.error('Error adding admin:', insertError);
        toast({
          title: "Error",
          description: "Failed to add admin",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Admin added successfully",
      });

      setNewAdminEmail('');
      fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: "Error",
        description: "Failed to add admin",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (adminId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove admin access for ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminId);

      if (error) {
        console.error('Error removing admin:', error);
        toast({
          title: "Error",
          description: "Failed to remove admin",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Admin removed successfully",
      });

      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: "Error",
        description: "Failed to remove admin",
        variant: "destructive",
      });
    }
  };

  const handleBulkSyncMailerLite = async () => {
    try {
      setSyncing(true);
      toast({
        title: "Syncing...",
        description: "This may take a few minutes for large user bases",
      });

      const { data, error } = await supabase.functions.invoke('bulk-sync-mailerlite');
      
      if (error) throw error;
      
      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} users successfully. ${data.failed} failed.`,
      });
    } catch (error: any) {
      console.error('Bulk sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync users to MailerLite",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div>Loading admin management...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="admin-email">User Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter user email address"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAdmin()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addAdmin} disabled={adding} className="gap-2">
                <UserPlus className="w-4 h-4" />
                {adding ? 'Adding...' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            MailerLite Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Sync all existing users who haven't been synced to MailerLite yet.
            This is useful after enabling the integration or for users who signed up before sync was working.
          </p>
          <Button 
            onClick={handleBulkSyncMailerLite} 
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Users...' : 'Bulk Sync to MailerLite'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Current Admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{admin.profiles?.email}</span>
                    </div>
                    {admin.profiles?.name && (
                      <div className="text-sm text-muted-foreground">
                        Name: {admin.profiles.name}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Added: {new Date(admin.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeAdmin(admin.id, admin.profiles?.email || 'Unknown')}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};