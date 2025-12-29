import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Copy, 
  MousePointer, 
  Users, 
  CreditCard, 
  Euro, 
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Save,
  Link as LinkIcon,
  Hash
} from 'lucide-react';
import { MinimalHeader } from '@/components/landing-v2/MinimalHeader';
import { MinimalFooter } from '@/components/landing-v2/MinimalFooter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  status: string;
  referral_code: string;
  referral_link: string;
  iban: string | null;
  created_at: string;
  approved_at: string | null;
}

interface Referral {
  id: string;
  signup_date: string;
  conversion_date: string | null;
  current_plan: string | null;
  status: string;
}

interface Commission {
  id: string;
  amount: number;
  month: string;
  status: string;
  plan_value: number;
}

const AffiliateDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [iban, setIban] = useState('');
  const [savingIban, setSavingIban] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchAffiliateData();
    }
  }, [token]);

  const fetchAffiliateData = async () => {
    try {
      // Fetch affiliate by access token
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('access_token', token)
        .single();

      if (affiliateError || !affiliateData) {
        setError('Dashboard não encontrado. Verifica se o link está correto.');
        setLoading(false);
        return;
      }

      setAffiliate(affiliateData);
      setIban(affiliateData.iban || '');

      // Fetch referrals
      const { data: referralsData } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);

      // Fetch commissions
      const { data: commissionsData } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('month', { ascending: false });

      setCommissions(commissionsData || []);
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
      setError('Erro ao carregar dados. Tenta novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const saveIban = async () => {
    if (!affiliate) return;
    
    setSavingIban(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ iban })
        .eq('id', affiliate.id);

      if (error) throw error;
      toast.success('IBAN guardado com sucesso!');
    } catch (err) {
      console.error('Error saving IBAN:', err);
      toast.error('Erro ao guardar IBAN.');
    } finally {
      setSavingIban(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'suspended':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"><AlertCircle className="w-3 h-3 mr-1" />Suspenso</Badge>;
      case 'terminated':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Terminado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculations
  const totalSignups = referrals.length;
  const activeCustomers = referrals.filter(r => r.status === 'converted').length;
  const totalCommissionEarned = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const paidCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingPayout = commissions.filter(c => c.status === 'payable').reduce((sum, c) => sum + Number(c.amount), 0);
  const monthlyRecurring = commissions.filter(c => c.status === 'pending' || c.status === 'payable')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
        <MinimalFooter />
      </div>
    );
  }

  if (error || !affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Dashboard não encontrado</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </main>
        <MinimalFooter />
      </div>
    );
  }

  // Pending status view
  if (affiliate.status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Candidatura em análise</h1>
            <p className="text-muted-foreground mb-6">
              A tua candidatura está a ser analisada pela nossa equipa. Receberás um email quando for aprovada.
            </p>
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div><strong>Nome:</strong> {affiliate.name}</div>
                  <div><strong>Email:</strong> {affiliate.email}</div>
                  <div><strong>Data de candidatura:</strong> {new Date(affiliate.created_at).toLocaleDateString('pt-PT')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <MinimalFooter />
      </div>
    );
  }

  // Suspended/Terminated view
  if (affiliate.status === 'suspended' || affiliate.status === 'terminated') {
    return (
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">
              Conta {affiliate.status === 'suspended' ? 'suspensa' : 'terminada'}
            </h1>
            <p className="text-muted-foreground">
              A tua conta de afiliado foi {affiliate.status === 'suspended' ? 'suspensa' : 'terminada'}. 
              Contacta-nos para mais informações.
            </p>
          </div>
        </main>
        <MinimalFooter />
      </div>
    );
  }

  // Active dashboard
  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard de Afiliado</h1>
              <p className="text-muted-foreground">Bem-vindo(a), {affiliate.name}</p>
            </div>
            {getStatusBadge(affiliate.status)}
          </div>

          {/* Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MousePointer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">Cliques</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalSignups}</div>
                    <div className="text-xs text-muted-foreground">Registos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{activeCustomers}</div>
                    <div className="text-xs text-muted-foreground">Clientes ativos</div>
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
                    <div className="text-2xl font-bold">€{monthlyRecurring.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Recorrente mensal</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">€{totalCommissionEarned.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Total ganho</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">€{paidCommission.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Pago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Affiliate Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Os teus links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Link de referência
                  </label>
                  <div className="flex gap-2">
                    <Input value={affiliate.referral_link} readOnly className="font-mono text-sm" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(affiliate.referral_link, 'Link')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Código promocional
                  </label>
                  <div className="flex gap-2">
                    <Input value={affiliate.referral_code} readOnly className="font-mono text-lg font-bold" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(affiliate.referral_code, 'Código')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Partilha o teu link ou código com a tua audiência. Qualquer registo feito através do teu link dentro de 30 dias será atribuído a ti.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">IBAN</label>
                  <div className="flex gap-2">
                    <Input 
                      value={iban} 
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="PT50 0000 0000 0000 0000 0000 0"
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      onClick={saveIban}
                      disabled={savingIban}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground">Pendente de pagamento</div>
                    <div className="text-xl font-bold">€{pendingPayout.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground">Mínimo de payout</div>
                    <div className="text-xl font-bold">€100,00</div>
                  </div>
                </div>

                {pendingPayout < 100 && pendingPayout > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2 text-yellow-600" />
                    Faltam <strong>€{(100 - pendingPayout).toFixed(2)}</strong> para atingir o mínimo de payout.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Referrals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Referências</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Ainda não tens referências.</p>
                  <p className="text-sm">Partilha o teu link para começar a ganhar!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data de registo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Data de conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          {new Date(referral.signup_date).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell>
                          {referral.status === 'converted' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Convertido
                            </Badge>
                          ) : referral.status === 'churned' ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Cancelado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Registo</Badge>
                          )}
                        </TableCell>
                        <TableCell>{referral.current_plan || '-'}</TableCell>
                        <TableCell>
                          {referral.conversion_date 
                            ? new Date(referral.conversion_date).toLocaleDateString('pt-PT')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <MinimalFooter />
    </div>
  );
};

export default AffiliateDashboard;
