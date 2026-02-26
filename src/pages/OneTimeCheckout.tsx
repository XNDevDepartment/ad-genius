import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackInitiateCheckout } from "@/lib/metaPixel";
import { toast } from "sonner";

const planConfig: Record<string, { price: number; label: string }> = {
  plus: { price: 49, label: "Plus" },
  pro: { price: 99, label: "Pro" },
  starter: { price: 24, label: "Starter" },
};

const OneTimeCheckout = () => {
  const navigate = useNavigate();
  const { plan } = useParams<{ plan: string }>();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const config = plan ? planConfig[plan] : null;

  useEffect(() => {
    if (loading) return;

    if (!config) {
      setError("Plano inválido.");
      return;
    }

    if (!user) {
      sessionStorage.setItem("promo_redirect", `/checkout/${plan}/once`);
      navigate("/signin");
      return;
    }

    const startCheckout = async () => {
      trackInitiateCheckout(`${plan}_one_time`, config.price, "EUR");

      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: {
            planId: plan,
            interval: "month",
            paymentMode: "one_time",
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error("[OneTimeCheckout] Error:", err);
        toast.error("Erro ao iniciar checkout. Tenta novamente.");
        setError("Erro ao iniciar checkout. Tenta novamente.");
      }
    };

    startCheckout();
  }, [user, loading, navigate, plan, config]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error}</p>
        <button onClick={() => navigate("/pricing")} className="text-primary underline">
          Voltar aos planos
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

export default OneTimeCheckout;
