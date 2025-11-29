import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AdminDataTable } from './AdminDataTable';

interface Redemption {
  id: string;
  credits_received: number;
  redeemed_at: string;
  user_email: string;
  user_name: string | null;
}

interface PromoCodeRedemptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCodeId: string;
  promoCode: string;
}

export const PromoCodeRedemptionsDialog = ({ 
  open, 
  onOpenChange, 
  promoCodeId, 
  promoCode 
}: PromoCodeRedemptionsDialogProps) => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && promoCodeId) {
      fetchRedemptions();
    }
  }, [open, promoCodeId]);

  const fetchRedemptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_code_redemptions')
        .select(`
          id,
          credits_received,
          redeemed_at,
          user_id
        `)
        .eq('promo_code_id', promoCodeId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each redemption
      const userIds = data?.map(r => r.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge redemptions with user data
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const enrichedRedemptions = data?.map(r => {
        const profile = profileMap.get(r.user_id);
        return {
          id: r.id,
          credits_received: r.credits_received,
          redeemed_at: r.redeemed_at,
          user_email: profile?.email || 'Unknown',
          user_name: profile?.name || null
        };
      }) || [];

      setRedemptions(enrichedRedemptions);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch redemptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = redemptions.reduce((sum, r) => sum + r.credits_received, 0);

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (redemption: Redemption) => (
        <div className="space-y-1">
          <div className="font-medium">{redemption.user_name || redemption.user_email}</div>
          {redemption.user_name && (
            <div className="text-xs text-muted-foreground">{redemption.user_email}</div>
          )}
        </div>
      )
    },
    {
      key: 'credits_received',
      label: 'Credits',
      render: (redemption: Redemption) => (
        <div className="font-semibold">{redemption.credits_received}</div>
      )
    },
    {
      key: 'redeemed_at',
      label: 'Redeemed At',
      render: (redemption: Redemption) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(redemption.redeemed_at), 'MMM d, yyyy HH:mm')}
        </div>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redemptions for "{promoCode}"</DialogTitle>
          <DialogDescription>
            View all users who have redeemed this promo code
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{redemptions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Redemptions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-500">{totalCredits}</div>
                  <div className="text-sm text-muted-foreground">Credits Distributed</div>
                </CardContent>
              </Card>
            </div>

            {redemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No redemptions yet for this promo code
              </div>
            ) : (
              <AdminDataTable
                data={redemptions}
                columns={columns}
                searchable={false}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
