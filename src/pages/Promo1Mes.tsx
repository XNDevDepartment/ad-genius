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

const Promo1Mes = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const regularPrice = 29;
  const promoPrice = 9.99;
  const discountPercent = Math.round((1 - promoPrice / regularPrice) * 100);

  useEffect(() => {
    trackViewContent('First Month Promo - 1MES');
  }, []);

  const handleGetOffer = async () => {
    if (loading) return;

    if (!user) {
      sessionStorage.setItem('promo_redirect', '/promo/1mes');
      navigate('/signin');
      return;
    }

    trackInitiateCheckout('starter_1mes', promoPrice, 'EUR');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId: 'experiment',
          paymentMode: 'one_time'
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('[Promo1Mes] Error creating checkout:', error);
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
          Experimentar por €{promoPrice}
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
      question: "É mesmo pagamento único?",
      answer: "Sim! Pagas €9.99 uma única vez e recebes 35 créditos. Não há subscrição, não há renovação automática, não há surpresas.",
    },
    {
      question: "Quantas imagens posso criar com 35 créditos?",
      answer: "Com 35 créditos podes criar até 35 imagens profissionais, ou combinares imagens e vídeos. Por exemplo: 30 imagens + 1 vídeo de 5 segundos.",
    },
    {
      question: "O que é um crédito?",
      answer: "Um crédito é a unidade que usas para gerar conteúdo. 1 crédito = 1 imagem profissional. Vídeos custam 5 créditos por cada 5 segundos.",
    },
    {
      question: "E se quiser mais créditos depois?",
      answer: "Podes subscrever um dos nossos planos mensais a qualquer momento, ou comprar outro pack avulso quando precisares.",
    },
    {
      question: "Os créditos expiram?",
      answer: "Os créditos ficam disponíveis durante 30 dias após a compra. Usa-os para criar o conteúdo que precisares nesse período.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader />

      <main className="pt-16">
        {/* Section 1: Hero */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="text-sm px-4 py-1.5 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Pagamento Único — Sem Subscrição
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Experimenta por{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                €{promoPrice}
              </span>
            </h1>

            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl text-muted-foreground line-through">€{regularPrice}</span>
              <Badge variant="destructive" className="text-sm font-bold">
                -{discountPercent}%
              </Badge>
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              35 créditos para criar fotos profissionais, vídeos e muito mais — pagamento único, sem compromisso.
            </p>

            <div className="pt-2">
              <CTAButton className="px-10" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> Pagamento único
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Sem renovação automática
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Acesso imediato
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
                    {/* Replace with actual screenshot */}
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
                Com 35 créditos, podes criar até 35 imagens profissionais
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
                <span className="font-semibold text-foreground">35 créditos</span> = até 35 fotos profissionais ou 7 vídeos de produto
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
                  Pagamento Único
                </Badge>

                <div>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-xl text-muted-foreground line-through">€{regularPrice}</span>
                    <Badge variant="destructive">-{discountPercent}%</Badge>
                  </div>
                  <p className="text-5xl font-bold text-primary">
                    €{promoPrice}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Pagamento único · Sem subscrição · Sem renovação
                  </p>
                </div>

                <div className="space-y-2 text-left max-w-sm mx-auto">
                  {[
                    "35 créditos para usar em 30 dias",
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
                  ✓ Pagamento único · ✓ Sem renovação automática · ✓ Acesso imediato
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MinimalFooter />
    </div>
  );
};

export default Promo1Mes;
