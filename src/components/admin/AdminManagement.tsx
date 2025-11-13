import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, UserPlus, Trash2, Mail, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

interface SyncStatus {
  user_id: string;
  name: string | null;
  email: string;
  subscription_tier: string;
  mailerlite_subscriber_id: string | null;
  newsletter_subscribed: boolean;
  last_sync_at: string | null;
  last_sync_success: boolean | null;
  last_sync_error: string | null;
}

export const AdminManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'unsynced' | 'error'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
    fetchSyncStatuses();
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

  const fetchSyncStatuses = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, mailerlite_subscriber_id, newsletter_subscribed');

      if (profilesError) throw profilesError;

      const { data: subscribers, error: subscribersError } = await supabase
        .from('subscribers')
        .select('user_id, subscription_tier');

      if (subscribersError) throw subscribersError;

      const { data: syncLogs, error: syncLogsError } = await supabase
        .from('mailerlite_sync_log')
        .select('user_id, success, error_message, synced_at')
        .order('synced_at', { ascending: false });

      if (syncLogsError) throw syncLogsError;

      const latestSyncByUser = new Map();
      syncLogs?.forEach((log: any) => {
        if (!latestSyncByUser.has(log.user_id)) {
          latestSyncByUser.set(log.user_id, log);
        }
      });

      const statuses: SyncStatus[] = (profiles || []).map((profile: any) => {
        const subscriber = subscribers?.find((s: any) => s.user_id === profile.id);
        const syncLog = latestSyncByUser.get(profile.id);

        return {
          user_id: profile.id,
          name: profile.name,
          email: profile.email,
          subscription_tier: subscriber?.subscription_tier || 'Free',
          mailerlite_subscriber_id: profile.mailerlite_subscriber_id,
          newsletter_subscribed: profile.newsletter_subscribed,
          last_sync_at: syncLog?.synced_at || null,
          last_sync_success: syncLog?.success ?? null,
          last_sync_error: syncLog?.error_message || null,
        };
      });

      setSyncStatuses(statuses);
    } catch (error) {
      console.error('Error fetching sync statuses:', error);
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
      fetchSyncStatuses();
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

  const tierToGroupMap: Record<string, string> = {
    'Free': 'produktpix-free',
    'Starter': 'produktpix-starter',
    'Plus': 'produktpix-plus',
    'Pro': 'produktpix-pro',
    'Founders': 'produktpix-founders',
  };

  const filteredStatuses = syncStatuses.filter(status => {
    const matchesSearch = searchTerm === '' || 
      status.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'synced' && status.mailerlite_subscriber_id) ||
      (filterStatus === 'unsynced' && !status.mailerlite_subscriber_id) ||
      (filterStatus === 'error' && status.last_sync_success === false);
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: syncStatuses.length,
    synced: syncStatuses.filter(s => s.mailerlite_subscriber_id).length,
    unsynced: syncStatuses.filter(s => !s.mailerlite_subscriber_id).length,
    errors: syncStatuses.filter(s => s.last_sync_success === false).length,
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              MailerLite Sync Status
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSyncStatuses}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
                <div className="text-sm text-muted-foreground">Synced</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.unsynced}</div>
                <div className="text-sm text-muted-foreground">Unsynced</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'synced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('synced')}
                >
                  Synced
                </Button>
                <Button
                  variant={filterStatus === 'unsynced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('unsynced')}
                >
                  Unsynced
                </Button>
                <Button
                  variant={filterStatus === 'error' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('error')}
                >
                  Errors
                </Button>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Newsletter</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatuses.map((status) => (
                    <TableRow key={status.user_id}>
                      <TableCell>
                        {status.mailerlite_subscriber_id ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>{status.name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{status.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{status.subscription_tier}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tierToGroupMap[status.subscription_tier] || '-'}
                      </TableCell>
                      <TableCell>
                        {status.newsletter_subscribed ? (
                          <Badge variant="default">Subscribed</Badge>
                        ) : (
                          <Badge variant="secondary">Not subscribed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.last_sync_at ? (
                          <div className="flex items-center gap-2">
                            {status.last_sync_success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {new Date(status.last_sync_at).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.last_sync_error && (
                          <span className="text-xs text-red-600">{status.last_sync_error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};