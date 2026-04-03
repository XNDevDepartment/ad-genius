import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QUICK_SELLS = [
  'Roupa', 'Calçado', 'Acessórios', 'Cosmética',
  'Decoração', 'Eletrónica', 'Alimentação', 'Outro',
];

interface Props {
  mode?: 'name' | 'whatSell';
  name?: string;
  initialValue?: string;
  onNext: (value: string) => void;
}

export const OnboardingWelcome = ({
  mode = 'name',
  name,
  initialValue = '',
  onNext,
}: Props) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [mode]);

  const canAdvance = value.trim().length > 0;

  const handleSubmit = () => {
    if (canAdvance) onNext(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canAdvance) handleSubmit();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {mode === 'name' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
                Olá! Como gostas de ser chamado?
              </h1>
              <p className="text-muted-foreground text-sm mb-8">
                Isto leva menos de 2 minutos.
              </p>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="O teu nome..."
                className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary outline-none text-xl font-medium pb-2 transition-colors placeholder:text-muted-foreground/50"
                autoComplete="given-name"
              />
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
                {name ? `${name}, o que vendes?` : 'O que vendes?'}
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Escolhe uma opção ou escreve livremente.
              </p>

              {/* Quick-select chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {QUICK_SELLS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setValue(option)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      value === option
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ou escreve aqui..."
                className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary outline-none text-lg font-medium pb-2 transition-colors placeholder:text-muted-foreground/50"
              />
            </>
          )}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: canAdvance ? 1 : 0.4, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-8"
      >
        <Button
          onClick={handleSubmit}
          disabled={!canAdvance}
          size="lg"
          className="w-full gap-2 text-base"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
};
