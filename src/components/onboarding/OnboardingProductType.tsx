import { motion } from 'framer-motion';
import { Globe, Store, Layers } from 'lucide-react';

type StoreType = 'online' | 'fisica' | 'ambas';

const OPTIONS: { value: StoreType; icon: React.FC<{ className?: string }>; label: string; description: string }[] = [
  {
    value: 'online',
    icon: Globe,
    label: 'Online',
    description: 'Loja própria, marketplace ou redes sociais',
  },
  {
    value: 'fisica',
    icon: Store,
    label: 'Física',
    description: 'Espaço presencial, pop-up ou showroom',
  },
  {
    value: 'ambas',
    icon: Layers,
    label: 'Ambas',
    description: 'Presença online e espaço físico',
  },
];

interface Props {
  onNext: (storeType: StoreType) => void;
}

export const OnboardingProductType = ({ onNext }: Props) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] px-6 py-8 max-w-lg mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Tens loja online, física ou ambas?
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Ajuda-nos a perceber onde vendes.
          </p>

          <div className="flex flex-col gap-3">
            {OPTIONS.map((option, i) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                onClick={() => onNext(option.value)}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <option.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">{option.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
