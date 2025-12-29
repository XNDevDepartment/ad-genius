import { Check, AlertCircle } from 'lucide-react';

const rules = [
  'Programa sujeito a aprovação',
  'Sem auto-referências',
  'Sem spam ou promessas enganosas',
  'Tracking via link e/ou código promocional',
  'Janela de atribuição: 30 dias (last-touch)'
];

export const AffiliateRules = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Regras e Transparência
            </h2>
            <p className="text-lg text-muted-foreground">
              Valorizamos a honestidade e a qualidade das indicações
            </p>
          </div>
          
          <div className="bg-card rounded-2xl p-8 shadow-apple">
            <div className="flex items-start gap-4 mb-8 p-4 bg-primary/5 rounded-xl">
              <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Compromisso com a qualidade</h4>
                <p className="text-sm text-muted-foreground">
                  Reservamo-nos o direito de recusar candidaturas ou suspender afiliados que não cumpram as regras do programa.
                </p>
              </div>
            </div>
            
            <ul className="space-y-4">
              {rules.map((rule, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Ao candidatares-te, aceitas os{' '}
                <a href="#" className="text-primary hover:underline">
                  Termos e Condições do Programa de Afiliados
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
