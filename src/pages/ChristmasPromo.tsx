import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Gift, Star, Video, Sparkles, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useState, useEffect } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";

const ChristmasPromo = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const monthlyPrice = 19.99;
  const yearlyPrice = 199.88;
  const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2);

  // Calculate days until end of promo (December 31, 2025)
  const promoEndDate = new Date('2025-12-31T23:59:59');
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((promoEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  useEffect(() => {
    trackViewContent('Christmas Promo 2025');
  }, []);

  const handleSubscribe = async () => {
    if (loading) {
      console.log('[ChristmasPromo] Authentication still loading, please wait...');
      return;
    }

    if (!user) {
      navigate('/account');
      return;
    }

    const checkoutValue = isYearly ? yearlyPrice : monthlyPrice;
    trackInitiateCheckout('christmas', checkoutValue, 'EUR');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: 'christmas',
          interval: isYearly ? 'year' : 'month'
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Festive background decorations */}
      <div className="absolute inset-0 pointer-events-none" suppressHydrationWarning>
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-pulse" suppressHydrationWarning>🎄</div>
        <div className="absolute top-40 right-20 text-4xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }} suppressHydrationWarning>❄️</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} suppressHydrationWarning>🎁</div>
        <div className="absolute bottom-20 right-10 text-4xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }} suppressHydrationWarning>⭐</div>
        <div className="absolute top-60 left-1/3 text-3xl opacity-10 animate-pulse" style={{ animationDelay: '0.3s' }} suppressHydrationWarning>❄️</div>
        <div className="absolute bottom-60 right-1/3 text-3xl opacity-10 animate-pulse" style={{ animationDelay: '0.8s' }} suppressHydrationWarning>❄️</div>
      </div>

      <HeaderSection />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <Badge className="mb-4 text-lg px-4 py-2 bg-gradient-to-r from-red-500 to-green-600 text-white border-0">
            <Gift className="h-4 w-4 mr-2 inline" />
            Promoção de Natal 2025 🎄
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-red-500">
            Oferta Especial de Natal
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            O melhor presente para o teu negócio! Acesso a todas as funcionalidades por um preço especial.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-full flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4" />
              <span>⏰ Oferta válida por mais {daysRemaining} dias!</span>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 bg-secondary rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-gradient-to-r from-red-500 to-green-600 rounded-full transition-transform ${
                isYearly ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
              🎁 Poupa 2 meses!
            </Badge>
          )}
        </div>

        {/* Main Card */}
        <Card className="max-w-2xl mx-auto border-2 border-red-500/50 shadow-2xl shadow-red-500/10">
          <CardHeader className="bg-gradient-to-r from-red-500 to-green-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">
                  Plano de Natal 🎅
                </CardTitle>
                <CardDescription className="text-white/90">
                  12 meses a preço especial
                </CardDescription>
              </div>
              <TreePine className="h-12 w-12" />
            </div>
          </CardHeader>

          <CardContent className="pt-8 pb-8">
            {/* Pricing Display */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl text-muted-foreground line-through">€29</span>
                <Badge className="bg-red-500 text-white border-0">-31%</Badge>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-green-600">
                  €{isYearly ? yearlyMonthlyEquivalent : monthlyPrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  /mês
                </span>
              </div>
              {isYearly && (
                <p className="text-sm text-muted-foreground mt-2">
                  Faturado anualmente (€{yearlyPrice.toFixed(2)}/ano)
                </p>
              )}
              {!isYearly && (
                <p className="text-sm text-muted-foreground mt-2">
                  Faturado mensalmente
                </p>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-red-500" />
                O que está incluído:
              </h3>
              
              {[
                { icon: Star, title: "80 Créditos por mês", description: "Para criar conteúdo incrível" },
                { icon: Check, title: "Até 80 imagens UGC", description: "Em qualquer nível de qualidade" },
                { icon: Video, title: "Geração de vídeos", description: "Transforma imagens em vídeos" },
                { icon: Check, title: "Todos os cenários UGC", description: "Acesso ilimitado a templates" },
                { icon: Check, title: "Todas as qualidades", description: "HD e Ultra HD incluídos" },
                { icon: Check, title: "Uso comercial", description: "Usa em qualquer projeto" },
                { icon: Check, title: "Suporte prioritário", description: "Resposta rápida garantida" },
                { icon: Gift, title: "Preço garantido", description: "€19.99/mês fixo durante os 12 meses" },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="rounded-full bg-gradient-to-r from-red-500/10 to-green-500/10 p-1.5 mt-0.5">
                    <feature.icon className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleSubscribe}
              disabled={loading || isProcessing}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-green-600 hover:from-red-600 hover:to-green-700 transition-all text-white"
            >
              {loading ? 'A carregar...' : isProcessing ? 'A processar...' : '🎁 Aproveitar Oferta de Natal'}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              ✓ Promoção de 12 meses · ✓ Preço fixo garantido · ✓ Satisfação garantida
            </p>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="max-w-2xl mx-auto mt-12 space-y-6">
          <Card className="bg-gradient-to-r from-red-500/5 to-green-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TreePine className="h-5 w-5 text-green-600" />
                Porquê aproveitar esta oferta?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>🎄 <strong>Preço especial de Natal:</strong> €19.99/mês em vez de €29/mês - poupa 31%!</p>
              <p>🎁 <strong>Promoção de 12 meses:</strong> Preço fixo garantido durante todo o período.</p>
              <p>⭐ <strong>Oferta limitada:</strong> Válida apenas até 31 de Dezembro de 2025.</p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              Ver outros planos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChristmasPromo;
