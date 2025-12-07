import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFailedBannerProps {
  paymentFailedAt: string | null;
}

const PaymentFailedBanner = ({ paymentFailedAt }: PaymentFailedBannerProps) => {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('paymentFailedBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Don't show if no payment failure or if dismissed
  if (!paymentFailedAt || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('paymentFailedBannerDismissed', 'true');
    setIsDismissed(true);
  };

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              {t('paymentFailed.title', 'Payment Failed')}
            </p>
            <p className="text-sm text-destructive/80 hidden sm:block">
              {t('paymentFailed.message', 'Your last payment could not be processed. Please update your payment method to continue using ProduktPix.')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleUpdatePayment}
            disabled={isLoading}
            className="whitespace-nowrap"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isLoading 
              ? t('common.loading', 'Loading...') 
              : t('paymentFailed.updatePayment', 'Update Payment Method')
            }
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={t('paymentFailed.dismiss', 'Dismiss')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedBanner;
