import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BENEFITS = [
  'Gera imagens profissionais com IA em segundos',
  'Sem fotógrafos, sem modelos, sem estúdio',
  'Integração direta com a tua loja Shopify',
];

const WHY_NOT_OPTIONS = [
  'Não sabia que existia',
  'Achei caro',
  'Nunca tive tempo',
  'Queria ver resultados primeiro',
];

interface Props {
  name?: string;
  onComplete: () => void;
}

export const OnboardingOffer = ({ name, onComplete }: Props) => {
  const [whyNot, setWhyNot] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: 'onboarding_first_month', interval: 'month' },
      });
      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error('Sem URL de checkout');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error('Ocorreu um erro. Tenta novamente.');
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center gap-8">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            {name ? `${name}, uma sessão fotográfica` : 'Uma sessão fotográfica'} assim custa facilmente €300–500.
          </h1>
          <p className="text-muted-foreground text-sm">
            Com a ProduktPix fazes isto em minutos, sempre que precisas.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="flex flex-col gap-3"
        >
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm font-medium">{b}</span>
            </div>
          ))}
        </motion.div>

        {/* Why not chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <p className="text-sm font-medium mb-3">Porque é que ainda não resolveste isto?</p>
          <div className="flex flex-wrap gap-2">
            {WHY_NOT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setWhyNot(opt)}
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  whyNot === opt
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:border-primary/50 hover:bg-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Offer card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold">€19,99</span>
            <span className="text-muted-foreground text-sm line-through">€29</span>
            <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium ml-auto">
              Primeiro mês
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Sem compromisso. Cancela quando quiseres.
          </p>
          <Button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            size="lg"
            className="w-full gap-2 text-base"
          >
            {isCheckingOut
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Experimentar agora <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
        </motion.div>

        {/* Skip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Continuar sem subscrição →
          </button>
        </motion.div>
      </div>
    </div>
  );
};
