import { useState } from 'react';
import { AlertCircle, Mail, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingActivationBannerProps {
  onDismiss?: () => void;
}

const PendingActivationBanner = ({ onDismiss }: PendingActivationBannerProps) => {
  const [resendLoading, setResendLoading] = useState(false);
  const [lastResent, setLastResent] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const canResend = !lastResent || Date.now() - lastResent > 5 * 60 * 1000; // 5 minute cooldown
  const cooldownRemaining = lastResent 
    ? Math.max(0, Math.ceil((5 * 60 * 1000 - (Date.now() - lastResent)) / 1000 / 60))
    : 0;

  const handleResend = async () => {
    if (!canResend) {
      toast.error(`Please wait ${cooldownRemaining} minute(s) before resending.`);
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.functions.invoke('generate-activation-token');
      if (error) throw error;
      
      setLastResent(Date.now());
      toast.success('Activation email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Resend error:', err);
      toast.error('Failed to resend activation email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm">Account Pending Activation</h4>
          <p className="text-muted-foreground text-sm mt-1">
            Please check your email and click the activation link to unlock all features including video generation.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleResend} 
              disabled={resendLoading || !canResend}
              className="gap-2"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  {canResend ? 'Resend Email' : `Wait ${cooldownRemaining}m`}
                </>
              )}
            </Button>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 flex-shrink-0" 
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PendingActivationBanner;
