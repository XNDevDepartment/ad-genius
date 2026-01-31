import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CreditCard, Info } from 'lucide-react';

interface FinancialStats {
  totalCreditsUsed: number;
  creditsBalance: number;
}

export const FinancialDashboard = () => {
  const [stats, setStats] = useState<FinancialStats>({
    totalCreditsUsed: 0,
    creditsBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Get subscription data for credits
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('credits_balance');

      if (!subscribers) return;

      const totalCreditsBalance = subscribers.reduce((sum, s) => sum + Number(s.credits_balance), 0);

      // Get credit transactions
      const { data: transactions } = await supabase
        .from('credits_transactions')
        .select('amount, created_at, reason');

      const totalCreditsUsed = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      setStats({
        totalCreditsUsed,
        creditsBalance: totalCreditsBalance,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading financial data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Credits Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreditsUsed.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Total credits consumed (all time)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.creditsBalance.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Available across all users</p>
          </CardContent>
        </Card>
      </div>

      {/* Info about revenue */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Revenue metrics moved to dedicated section</p>
              <p>
                Real MRR, ARPU, and subscription breakdown are now shown in the 
                <strong> Revenue Metrics </strong> component above for accurate reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
