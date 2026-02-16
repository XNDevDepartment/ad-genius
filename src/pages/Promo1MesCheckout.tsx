import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackInitiateCheckout } from "@/lib/metaPixel";
import { toast } from "sonner";

const Promo1MesCheckout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      sessionStorage.setItem('promo_redirect', '/promo/1mes/checkout');
      navigate('/signin');
      return;
    }

    const startCheckout = async () => {
      trackInitiateCheckout('starter_1mes_direct', 9.99, 'EUR');

      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            planId: 'starter',
            interval: 'month',
            promoCode: '1MES'
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error('[Promo1MesCheckout] Error:', err);
        toast.error('Erro ao iniciar checkout. Tenta novamente.');
        setError('Erro ao iniciar checkout. Tenta novamente.');
      }
    };

    startCheckout();
  }, [user, loading, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error}</p>
        <button onClick={() => navigate('/promo/1mes')} className="text-primary underline">
          Voltar à oferta
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
};

export default Promo1MesCheckout;
