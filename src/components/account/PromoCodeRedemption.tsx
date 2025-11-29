import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Gift } from "lucide-react";

interface PromoCodeRedemptionProps {
  onSuccess?: () => void;
}

export const PromoCodeRedemption = ({ onSuccess }: PromoCodeRedemptionProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: t("promoCode.errors.invalidCode"),
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-promo-code', {
        body: { code: code.trim() }
      });

      if (error) throw error;

      if (data?.error) {
        // Handle specific error codes
        const errorKey = `promoCode.errors.${data.error.toLowerCase()}` as const;
        const errorMessage = t(errorKey, { defaultValue: t("promoCode.errors.genericError") });
        
        toast({
          title: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: t("promoCode.success"),
          description: t("promoCode.creditsAdded", { credits: data.credits }),
        });
        setCode("");
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      toast({
        title: t("promoCode.errors.genericError"),
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRedeeming) {
      handleRedeem();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <CardTitle>{t("promoCode.title")}</CardTitle>
        </div>
        <CardDescription>{t("promoCode.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder={t("promoCode.placeholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            disabled={isRedeeming}
            className="flex-1"
            maxLength={50}
          />
          <Button 
            onClick={handleRedeem} 
            disabled={isRedeeming || !code.trim()}
          >
            {isRedeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("promoCode.redeeming")}
              </>
            ) : (
              t("promoCode.redeem")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
