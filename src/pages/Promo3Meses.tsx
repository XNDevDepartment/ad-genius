import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, Image, Video, Shirt, Layers, Camera, Zap, Shield, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { toast } from "sonner";
import { MinimalHeader } from "@/components/landing-v2/MinimalHeader";
import { MinimalFooter } from "@/components/landing-v2/MinimalFooter";
import { BeforeAfterShowcase } from "@/components/landing-v2/BeforeAfterShowcase";
import { UseCasesGrid } from "@/components/landing-v2/UseCasesGrid";
import { TestimonialsSection } from "@/components/landing-v2/TestimonialsSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import fotoUgc from '@/assets/landing_gallery/27.webp';
import fotoVideo from '@/assets/module_icons/ugc.webp';
import fotoFashion from '@/assets/demo_outfit_final.jpg';
import fotoProduct from '@/assets/photoProduct.webp';
import { PageTransition } from '@/components/PageTransition';

const Promo3Meses = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const regularPrice = 29;
  const promoPrice = 19.99;
  const discountPercent = Math.round((1 - promoPrice / regularPrice) * 100);
  const totalSaving = ((regularPrice - promoPrice) * 3).toFixed(2);

  useEffect(() => {
    trackViewContent('3 Months Promo - 3MESES');
  }, []);

  const handleGetOffer = async () => {
    if (loading) return;

    if (!user) {
      sessionStorage.setItem('promo_redirect', '/promo/3meses');
      navigate('/signin');
      return;
    }

    trackInitiateCheckout('starter_3meses', promoPrice, 'EUR');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId: 'starter',
          interval: 'month',
          promoCode: '3MESES'
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('[Promo3Meses] Error creating checkout:', error);
      toast.error('Erro ao processar o checkout. Tenta novamente.');
      setIsProcessing(false);
    }
  };

  const CTAButton = ({ className = "" }: { className?: string }) => (
    <Button
      onClick={handleGetOffer}
      disabled={loading || isProcessing}
      size="lg"
      className={`h-14 text-lg font-semibold rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground ${className}`}
    >
      {loading ? (
        'A carregar...'
      ) : isProcessing ? (
        'A processar...'
      ) : (
        <>
          <Sparkles className="h-5 w-5 mr-2" />
          Ativar Oferta — €{promoPrice}/mês
        </>
      )}
    </Button>
  );

  const features = [
    {
      icon: Camera,
      title: "Fotos UGC de Produto",
      description: "Cria imagens profissionais com modelos IA em cenários reais. Perfeito para redes sociais e e-commerce.",
      imgSrc: fotoUgc
    },
    {
      icon: Video,
      title: "Geração de Vídeos",
      description: "Transforma qualquer imagem de produto num vídeo profissional de 5 segundos pronto para anúncios.",
      imgSrc: fotoVideo
    },
    {
      icon: Shirt,
      title: "Fashion Try-On",
      description: "Coloca as tuas peças de roupa em modelos IA. Escolhe o modelo, pose e cenário.",
      imgSrc: fotoFashion
    },
    {
      icon: Layers,
      title: "Troca de Fundo em Massa",
      description: "Remove e substitui fundos de dezenas de fotos de uma vez. Cenários profissionais em segundos.",
      imgSrc: fotoProduct
    },
  ];

  const creditExplainer = [
    { amount: "1 crédito", result: "1 imagem profissional", icon: Image },
    { amount: "5 créditos", result: "1 vídeo de 5 segundos", icon: Video },
    { amount: "1 crédito", result: "1 troca de fundo", icon: Layers },
    { amount: "1 crédito", result: "1 fashion try-on", icon: Shirt },
  ];

  const faqs = [
    {
      question: "O que acontece depois dos 3 meses?",
      answer: "Após os 3 meses promocionais, a tua subscrição continua ao preço normal de €29/mês. Podes cancelar a qualquer momento antes da renovação.",
    },
    {
      question: "Posso cancelar quando quiser?",
      answer: "Sim, podes cancelar a tua subscrição a qualquer momento. Não há contratos, compromissos ou taxas de cancelamento. Mantens o acesso até ao final do período pago.",
    },
    {
      question: "Quantas imagens posso criar com 80 créditos?",
      answer: "Com 80 créditos podes criar até 80 imagens profissionais, ou combinares imagens e vídeos. Por exemplo: 70 imagens + 2 vídeos de 5 segundos.",
    },
    {
      question: "O que é um crédito?",
      answer: "Um crédito é a unidade que usas para gerar conteúdo. 1 crédito = 1 imagem profissional. Vídeos custam 5 créditos por cada 5 segundos.",
    },
    {
      question: "Existe algum contrato ou fidelização?",
      answer: "Não. É uma subscrição mensal sem compromisso. Cancelas quando quiseres, sem perguntas.",
    },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      {!user && <MinimalHeader />}

      <main className={user ? "pt-4" : "pt-16"}>
        {/* Section 1: Hero */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="text-sm px-4 py-1.5 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Oferta Exclusiva — 3 Meses
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              3 Meses por{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                €{promoPrice}/mês
              </span>
            </h1>

            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl text-muted-foreground line-through">€{regularPrice}/mês</span>
              <Badge variant="destructive" className="text-sm font-bold">
                -{discountPercent}%
              </Badge>
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Acede ao plano Starter com <strong>80 créditos/mês</strong> durante 3 meses a preço reduzido. Poupas <strong>€{totalSaving}</strong> no total.
            </p>

            <div className="pt-2">
              <CTAButton className="px-10" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> Código aplicado automaticamente
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Cancela quando quiseres
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Ativo em segundos
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: What You Get — Feature Grid */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                O Que Inclui o Plano Starter
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tudo o que precisas para criar conteúdo profissional para o teu negócio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                    <div className="rounded-xl overflow-hidden bg-muted/50 border border-border">
                      <img
                        src={feature.imgSrc}
                        alt={feature.title}
                        className="w-full h-80 object-cover"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Before/After */}
        <BeforeAfterShowcase />

        {/* Section 4: Use Cases */}
        <UseCasesGrid />

        {/* Section 5: What 1 Credit Gets You */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                O Que Consegues com 1 Crédito
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Com 80 créditos por mês, podes criar até 80 imagens profissionais
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditExplainer.map((item, index) => (
                <Card key={index} className="rounded-2xl text-center">
                  <CardContent className="p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-bold text-lg">{item.amount}</p>
                    <p className="text-sm text-muted-foreground">{item.result}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">80 créditos</span> = até 80 fotos profissionais ou 16 vídeos de produto
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Testimonials */}
        <TestimonialsSection />

        {/* Section 7: FAQ */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Perguntas Frequentes
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Section 8: Final CTA */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Card className="rounded-2xl border-2 border-primary/30 shadow-xl shadow-primary/5">
              <CardContent className="p-8 md:p-10 space-y-6">
                <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                  Oferta Exclusiva — 3 Meses
                </Badge>

                <div>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-xl text-muted-foreground line-through">€{regularPrice}/mês</span>
                    <Badge variant="destructive">-{discountPercent}%</Badge>
                  </div>
                  <p className="text-5xl font-bold text-primary">
                    €{promoPrice}
                    <span className="text-lg font-normal text-muted-foreground">/mês × 3 meses</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Depois €{regularPrice}/mês · Cancela quando quiseres · Poupas €{totalSaving}
                  </p>
                </div>

                <div className="space-y-2 text-left max-w-sm mx-auto">
                  {[
                    "80 créditos por mês (completos)",
                    "Fotos UGC com modelos IA",
                    "Geração de vídeos incluída",
                    "Fashion try-on",
                    "Uso comercial completo",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <CTAButton className="w-full" />

                <p className="text-xs text-muted-foreground">
                  ✓ Código promocional aplicado automaticamente · ✓ Sem contrato · ✓ Cancela quando quiseres
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MinimalFooter />
    </div>
    </PageTransition>
  );
};

export default Promo3Meses;
