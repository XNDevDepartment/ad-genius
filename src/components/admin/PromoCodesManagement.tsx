import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Eye, Plus, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { PromoCodeDialog } from './PromoCodeDialog';
import { PromoCodeRedemptionsDialog } from './PromoCodeRedemptionsDialog';
import { format } from 'date-fns';

interface PromoCode {
  id: string;
  code: string;
  credits_amount: number;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PromoCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  totalCreditsDistributed: number;
}

export const PromoCodesManagement = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats>({
    totalCodes: 0,
    activeCodes: 0,
    totalRedemptions: 0,
    totalCreditsDistributed: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showRedemptions, setShowRedemptions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const { data: codes, error: codesError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;

      const { data: redemptions, error: redemptionsError } = await supabase
        .from('promo_code_redemptions')
        .select('credits_received');

      if (redemptionsError) throw redemptionsError;

      setPromoCodes(codes || []);

      // Calculate stats
      const totalRedemptions = redemptions?.length || 0;
      const totalCreditsDistributed = redemptions?.reduce((sum, r) => sum + r.credits_received, 0) || 0;
      const activeCodes = codes?.filter(c => {
        const isActive = c.is_active;
        const notExpired = !c.expires_at || new Date(c.expires_at) > new Date();
        const notExhausted = !c.max_uses || c.current_uses < c.max_uses;
        return isActive && notExpired && notExhausted;
      }).length || 0;

      setStats({
        totalCodes: codes?.length || 0,
        activeCodes,
        totalRedemptions,
        totalCreditsDistributed
      });
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch promo codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleCreate = () => {
    setSelectedCode(null);
    setIsCreating(true);
    setShowEditor(true);
  };

  const handleEdit = (code: PromoCode) => {
    setSelectedCode(code);
    setIsCreating(false);
    setShowEditor(true);
  };

  const handleViewRedemptions = (code: PromoCode) => {
    setSelectedCode(code);
    setShowRedemptions(true);
  };

  const handleToggleActive = async (code: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promo code ${code.is_active ? 'deactivated' : 'activated'} successfully`
      });
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
      toast({
        title: "Error",
        description: "Failed to update promo code status",
        variant: "destructive"
      });
    }
  };

  const getStatus = (code: PromoCode): 'active' | 'inactive' | 'expired' | 'exhausted' => {
    if (!code.is_active) return 'inactive';
    if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
    if (code.max_uses && code.current_uses >= code.max_uses) return 'exhausted';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      expired: { variant: 'destructive' as const, label: 'Expired' },
      exhausted: { variant: 'outline' as const, label: 'Exhausted' }
    };
    const config = variants[status as keyof typeof variants] || variants.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredCodes = promoCodes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(code);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'code',
      label: 'Code',
      render: (code: PromoCode) => (
        <div className="space-y-1">
          <div className="font-mono font-bold text-base">{code.code}</div>
          {code.description && (
            <div className="text-xs text-muted-foreground">{code.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'credits_amount',
      label: 'Credits',
      render: (code: PromoCode) => (
        <div className="text-lg font-semibold">{code.credits_amount}</div>
      )
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (code: PromoCode) => (
        <div className="text-sm">
          {code.current_uses}/{code.max_uses || '∞'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (code: PromoCode) => getStatusBadge(getStatus(code))
    },
    {
      key: 'expires_at',
      label: 'Expires',
      render: (code: PromoCode) => (
        <div className="text-sm text-muted-foreground">
          {code.expires_at ? format(new Date(code.expires_at), 'MMM d, yyyy') : 'Never'}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (code: PromoCode) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(code.created_at), 'MMM d, yyyy')}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (code: PromoCode) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(code)}
            title="Edit code"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewRedemptions(code)}
            title="View redemptions"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(code)}
            title={code.is_active ? 'Deactivate' : 'Activate'}
          >
            <div className={`w-2 h-2 rounded-full ${code.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promo Code Management</CardTitle>
              <CardDescription>
                Create and manage promotion codes with configurable credits and usage limits
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchPromoCodes} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Code
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalCodes}</div>
                <div className="text-sm text-muted-foreground">Total Codes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">
                  {stats.activeCodes}
                </div>
                <div className="text-sm text-muted-foreground">Active Codes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-500">
                  {stats.totalRedemptions}
                </div>
                <div className="text-sm text-muted-foreground">Total Redemptions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-500">
                  {stats.totalCreditsDistributed}
                </div>
                <div className="text-sm text-muted-foreground">Credits Distributed</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="exhausted">Exhausted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AdminDataTable
            data={filteredCodes}
            columns={columns}
            searchable={false}
          />
        </CardContent>
      </Card>

      <PromoCodeDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        promoCode={selectedCode}
        isCreating={isCreating}
        onSave={() => {
          fetchPromoCodes();
          setShowEditor(false);
        }}
      />

      {selectedCode && (
        <PromoCodeRedemptionsDialog
          open={showRedemptions}
          onOpenChange={setShowRedemptions}
          promoCodeId={selectedCode.id}
          promoCode={selectedCode.code}
        />
      )}
    </div>
  );
};
