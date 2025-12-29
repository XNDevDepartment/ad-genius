import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Eye,
  UserCheck,
  UserX,
  Euro,
  FileText
} from 'lucide-react';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  country: string;
  website_url: string;
  promotion_description: string;
  audience_size: string;
  status: string;
  referral_code: string;
  iban: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
}

interface Commission {
  id: string;
  affiliate_id: string;
  amount: number;
  month: string;
  status: string;
}

export const AdminAffiliates = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliatesError) throw affiliatesError;
      setAffiliates(affiliatesData || []);

      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('*');

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast.error('Erro ao carregar afiliados');
    } finally {
      setLoading(false);
    }
  };

  const updateAffiliateStatus = async (affiliateId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'active') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updateData)
        .eq('id', affiliateId);

      if (error) throw error;

      setAffiliates(prev => 
        prev.map(a => a.id === affiliateId 
          ? { ...a, status: newStatus, ...(newStatus === 'active' ? { approved_at: new Date().toISOString() } : {}) }
          : a
        )
      );

      toast.success(`Afiliado ${newStatus === 'active' ? 'aprovado' : newStatus === 'suspended' ? 'suspenso' : 'terminado'}`);
    } catch (error) {
      console.error('Error updating affiliate:', error);
      toast.error('Erro ao atualizar afiliado');
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedAffiliate) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ notes: adminNotes })
        .eq('id', selectedAffiliate.id);

      if (error) throw error;

      setAffiliates(prev =>
        prev.map(a => a.id === selectedAffiliate.id ? { ...a, notes: adminNotes } : a)
      );
      
      toast.success('Notas guardadas');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao guardar notas');
    } finally {
      setSavingNotes(false);
    }
  };

  const exportPayoutReport = () => {
    const payableCommissions = commissions.filter(c => c.status === 'payable');
    const affiliatePayouts = affiliates
      .filter(a => a.status === 'active' && a.iban)
      .map(a => {
        const affiliateCommissions = payableCommissions.filter(c => c.affiliate_id === a.id);
        const total = affiliateCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
        return {
          name: a.name,
          email: a.email,
          iban: a.iban,
          total: total.toFixed(2)
        };
      })
      .filter(p => Number(p.total) >= 100);

    if (affiliatePayouts.length === 0) {
      toast.info('Não há pagamentos pendentes acima de €100');
      return;
    }

    const csv = [
      'Nome,Email,IBAN,Total',
      ...affiliatePayouts.map(p => `"${p.name}","${p.email}","${p.iban}","€${p.total}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Relatório exportado');
  };

  const filteredAffiliates = affiliates.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = affiliates.filter(a => a.status === 'pending').length;
  const activeCount = affiliates.filter(a => a.status === 'active').length;
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingPayout = commissions.filter(c => c.status === 'payable').reduce((sum, c) => sum + Number(c.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativo</Badge>;
      case 'suspended':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Suspenso</Badge>;
      case 'terminated':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Terminado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{affiliates.length}</div>
                <div className="text-xs text-muted-foreground">Total de afiliados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeCount}</div>
                <div className="text-xs text-muted-foreground">Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Euro className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">€{totalPaid.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Total pago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                  <SelectItem value="terminated">Terminados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" onClick={exportPayoutReport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Payouts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Afiliados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAffiliates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum afiliado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">{affiliate.name}</TableCell>
                    <TableCell>{affiliate.email}</TableCell>
                    <TableCell>{affiliate.country}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {affiliate.referral_code}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                    <TableCell>{new Date(affiliate.created_at).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAffiliate(affiliate);
                            setAdminNotes(affiliate.notes || '');
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {affiliate.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateAffiliateStatus(affiliate.id, 'active')}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {affiliate.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => updateAffiliateStatus(affiliate.id, 'suspended')}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                        )}
                        {(affiliate.status === 'active' || affiliate.status === 'suspended') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateAffiliateStatus(affiliate.id, 'terminated')}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <p className="font-medium">{selectedAffiliate.name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{selectedAffiliate.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">País</label>
                  <p className="font-medium">{selectedAffiliate.country}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Audiência</label>
                  <p className="font-medium">{selectedAffiliate.audience_size}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Website</label>
                  <p className="font-medium">
                    <a href={selectedAffiliate.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedAffiliate.website_url}
                    </a>
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Como pretende promover</label>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedAffiliate.promotion_description}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">IBAN</label>
                  <p className="font-mono text-sm">{selectedAffiliate.iban || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Código</label>
                  <p className="font-mono font-bold">{selectedAffiliate.referral_code}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Notas Admin</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicionar notas sobre este afiliado..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
            <Button onClick={saveAdminNotes} disabled={savingNotes}>
              <FileText className="w-4 h-4 mr-2" />
              Guardar Notas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
