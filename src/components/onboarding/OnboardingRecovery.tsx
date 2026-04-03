import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISLIKE_OPTIONS = [
  'Qualidade das imagens',
  'Estilo visual',
  'Não era o que esperava',
  'Outra razão',
];

interface Props {
  onComplete: () => void;
}

export const OnboardingRecovery = ({ onComplete }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center gap-8">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Diz-nos o que podemos melhorar
          </h1>
          <p className="text-muted-foreground text-sm">
            O teu feedback ajuda-nos a evoluir.
          </p>
        </motion.div>

        {/* Dislike chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex flex-col gap-2"
        >
          {DISLIKE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`w-full py-4 px-5 rounded-2xl border-2 text-left text-sm font-medium transition-all active:scale-[0.98] ${
                selected === opt
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </motion.div>

        {/* Demo CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-2xl border border-border bg-muted/30 p-5"
        >
          <p className="text-base font-semibold mb-1">
            Queres falar com um especialista?
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Numa chamada gratuita mostramos-te o dia a dia, como funciona e deixamo-te com uma ideia clara.
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full gap-2 text-base"
          >
            <a href="https://cal.com/produktpix/demonstracao-privada" target="_blank" rel="noopener noreferrer">
              Marcar demonstração gratuita
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </motion.div>

        {/* Skip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Continuar mesmo assim →
          </button>
        </motion.div>
      </div>
    </div>
  );
};
