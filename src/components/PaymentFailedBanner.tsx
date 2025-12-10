import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFailedBannerProps {
  paymentFailedAt: string | null;
}

const GRACE_PERIOD_DAYS = 21;

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

  // Calculate days remaining in grace period
  const daysRemaining = useMemo(() => {
    if (!paymentFailedAt) return GRACE_PERIOD_DAYS;
    const daysSinceFailure = Math.floor(
      (Date.now() - new Date(paymentFailedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, GRACE_PERIOD_DAYS - daysSinceFailure);
  }, [paymentFailedAt]);

  // Determine urgency level
  const urgencyLevel = useMemo(() => {
    if (daysRemaining <= 3) return 'critical';
    if (daysRemaining <= 7) return 'high';
    if (daysRemaining <= 14) return 'medium';
    return 'low';
  }, [daysRemaining]);

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

  // Style based on urgency
  const getBannerStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'bg-destructive/20 border-destructive/40';
      case 'high':
        return 'bg-destructive/15 border-destructive/30';
      case 'medium':
        return 'bg-orange-500/15 border-orange-500/30';
      default:
        return 'bg-yellow-500/15 border-yellow-500/30';
    }
  };

  const getTextColor = () => {
    switch (urgencyLevel) {
      case 'critical':
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-yellow-700 dark:text-yellow-400';
    }
  };

  return (
    <div className={`border-b px-4 py-3 ${getBannerStyles()}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <AlertTriangle className={`h-5 w-5 ${getTextColor()}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-medium ${getTextColor()}`}>
                {t('paymentFailed.title', 'Payment Failed')}
              </p>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                urgencyLevel === 'critical' ? 'bg-destructive/20 text-destructive' :
                urgencyLevel === 'high' ? 'bg-destructive/15 text-destructive' :
                urgencyLevel === 'medium' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
              }`}>
                <Clock className="h-3 w-3" />
                {t('paymentFailed.daysRemaining', '{{days}} days left', { days: daysRemaining })}
              </div>
            </div>
            <p className={`text-sm ${getTextColor()} opacity-80 hidden sm:block`}>
              {urgencyLevel === 'critical' 
                ? t('paymentFailed.urgentMessage', 'Update immediately to avoid losing access to premium features.')
                : t('paymentFailed.message', 'Update your payment method to continue using ProduktPix.')}
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
              : t('paymentFailed.updatePayment', 'Update Payment')
            }
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className={`h-8 w-8 ${getTextColor()} hover:bg-destructive/10`}
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