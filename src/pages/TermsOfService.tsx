import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { buildWebPageSchema } from "@/lib/schema";
import { PageTransition } from "@/components/PageTransition";

const TermsOfService = () => {
  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service"
        description="Read ProduktPix terms and conditions for using our AI product photography platform. Understand your rights and responsibilities."
        path="/terms"
        schema={buildWebPageSchema('Terms of Service', 'ProduktPix terms of service and usage conditions', '/terms')}
      />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground mb-12">Última atualização: 29 de dezembro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao aceder ou utilizar os serviços da ProduktPix, concorda em ficar vinculado a estes Termos 
              de Serviço. Se não concordar com qualquer parte destes termos, não deve utilizar os nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              A ProduktPix é uma plataforma de geração de imagens com inteligência artificial que permite 
              criar fotografias profissionais de produtos e conteúdo UGC. Os nossos serviços incluem:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Geração de imagens UGC com modelos virtuais</li>
              <li>Troca de roupa virtual (Outfit Swap)</li>
              <li>Geração de fundos para produtos</li>
              <li>Criação de vídeos publicitários</li>
              <li>Sessões fotográficas virtuais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Contas de Utilizador</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Registo</h3>
                <p>Para utilizar os nossos serviços, deve criar uma conta fornecendo informações precisas 
                e completas. Deve ter pelo menos 18 anos para criar uma conta.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Segurança da Conta</h3>
                <p>É responsável por manter a confidencialidade das suas credenciais de acesso e por 
                todas as atividades que ocorram na sua conta.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Subscrições e Pagamentos</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.1 Planos de Subscrição</h3>
                <p>Oferecemos diferentes planos de subscrição com diferentes quantidades de créditos 
                mensais. Os detalhes e preços estão disponíveis na nossa página de preços.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.2 Pagamentos</h3>
                <p>Todos os pagamentos são processados através do Stripe. Ao subscrever, autoriza 
                cobranças recorrentes no seu método de pagamento.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.3 Cancelamento</h3>
                <p>Pode cancelar a sua subscrição a qualquer momento através das definições da sua conta. 
                O cancelamento entra em vigor no final do período de faturação atual.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.4 Reembolsos</h3>
                <p>Os créditos não utilizados não são reembolsáveis. Em casos excecionais, podemos 
                considerar reembolsos a nosso critério.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Uso Aceitável</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.1 Utilizações Permitidas</h3>
                <p>Os nossos serviços destinam-se a fins comerciais legítimos, incluindo marketing de 
                produtos, criação de conteúdo para redes sociais e publicidade.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.2 Utilizações Proibidas</h3>
                <p>Não pode utilizar os nossos serviços para:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Criar conteúdo ilegal, difamatório ou ofensivo</li>
                  <li>Gerar conteúdo que viole direitos de propriedade intelectual de terceiros</li>
                  <li>Criar deepfakes ou conteúdo enganoso com pessoas reais identificáveis</li>
                  <li>Produzir conteúdo pornográfico ou sexualmente explícito</li>
                  <li>Qualquer atividade que viole leis aplicáveis</li>
                  <li>Tentar contornar limitações do serviço ou medidas de segurança</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Propriedade Intelectual</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">6.1 Conteúdo do Utilizador</h3>
                <p>Mantém todos os direitos sobre as imagens originais que carrega. Concede-nos uma 
                licença limitada para processar essas imagens exclusivamente para fornecer os nossos serviços.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">6.2 Conteúdo Gerado</h3>
                <p>As imagens geradas através dos nossos serviços são de sua propriedade e pode utilizá-las 
                para fins comerciais, sujeito a estes termos.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">6.3 Plataforma ProduktPix</h3>
                <p>A plataforma, incluindo software, design, logos e marcas comerciais, são propriedade 
                exclusiva da ProduktPix e estão protegidos por leis de propriedade intelectual.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os nossos serviços são fornecidos "tal como estão" e "conforme disponíveis". Na máxima 
              extensão permitida por lei, a ProduktPix não será responsável por quaisquer danos indiretos, 
              incidentais, especiais, consequentes ou punitivos, incluindo perda de lucros, dados ou 
              oportunidades de negócio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Indemnização</h2>
            <p className="text-muted-foreground leading-relaxed">
              Concorda em indemnizar e isentar a ProduktPix de quaisquer reclamações, danos, perdas ou 
              despesas resultantes da sua utilização dos nossos serviços ou violação destes termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Terminação</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos suspender ou terminar a sua conta se violar estes termos ou por outros motivos 
              legítimos. Pode também encerrar a sua conta a qualquer momento através das definições 
              da conta ou contactando o suporte.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis de Portugal. Quaisquer litígios serão submetidos 
              à jurisdição exclusiva dos tribunais portugueses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Alterações aos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações 
              significativas serão comunicadas por email ou através de um aviso na plataforma. 
              A utilização continuada após tais alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões sobre estes Termos de Serviço, contacte-nos:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> info@produktpix.com
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default TermsOfService;
