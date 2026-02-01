import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, Image, Video, Palette, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useState, useEffect } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";

const PromoFirstMonth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const regularPrice = 29;
  const promoPrice = 19.99;
  const discountPercent = Math.round((1 - promoPrice / regularPrice) * 100);

  useEffect(() => {
    trackViewContent('First Month Promo - ONB1ST');
  }, []);

  const handleGetOffer = async () => {
    if (loading) {
      console.log('[PromoFirstMonth] Authentication still loading...');
      return;
    }

    if (!user) {
      // Store return URL in sessionStorage so we can redirect back after auth
      sessionStorage.setItem('promo_redirect', '/promo/first-month');
      navigate('/account');
      return;
    }

    trackInitiateCheckout('starter_first_month', promoPrice, 'EUR');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: 'starter',
          interval: 'month',
          promoCode: 'ONB1ST' // Auto-applied promo code
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('[PromoFirstMonth] Error creating checkout:', error);
      setIsProcessing(false);
    }
  };

  const features = [
    { icon: Image, text: "80 créditos mensais" },
    { icon: Sparkles, text: "Imagens UGC ilimitadas" },
    { icon: Video, text: "Geração de vídeos incluída" },
    { icon: Palette, text: "Todos os cenários" },
    { icon: ShoppingBag, text: "Uso comercial" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <HeaderSection />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8 space-y-4">
          <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
            Oferta Exclusiva
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold">
            Primeiro Mês por{" "}
            <span className="text-primary">€{promoPrice}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground">
            Oferta exclusiva para novos subscritores do plano Starter
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-2 border-primary/30 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-2xl text-muted-foreground line-through">€{regularPrice}/mês</span>
              <Badge variant="destructive" className="text-sm">
                -{discountPercent}%
              </Badge>
            </div>
            <CardTitle className="text-5xl font-bold text-primary">
              €{promoPrice}
              <span className="text-lg font-normal text-muted-foreground">/primeiro mês</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Depois €{regularPrice}/mês • Cancela quando quiseres
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                  <Check className="h-4 w-4 text-primary ml-auto" />
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleGetOffer}
              disabled={loading || isProcessing}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {loading ? (
                'A carregar...'
              ) : isProcessing ? (
                'A processar...'
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Ativar Oferta
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              ✓ Código promocional aplicado automaticamente · ✓ Cancela quando quiseres
            </p>
          </CardContent>
        </Card>

        {/* Back to pricing link */}
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate('/pricing')}>
            Ver todos os planos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoFirstMonth;
