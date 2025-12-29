import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-12">Última atualização: 29 de dezembro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A ProduktPix ("nós", "nosso" ou "a empresa") está comprometida em proteger a sua privacidade. 
              Esta Política de Privacidade explica como recolhemos, usamos, divulgamos e protegemos as suas 
              informações quando utiliza a nossa plataforma de geração de imagens com inteligência artificial.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Informações que Recolhemos</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.1 Informações da Conta</h3>
                <p>Quando cria uma conta, recolhemos: nome, endereço de email, e número de telefone (opcional).</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.2 Dados de Utilização</h3>
                <p>Recolhemos automaticamente informações sobre como utiliza os nossos serviços, incluindo 
                funcionalidades utilizadas, preferências de configuração e padrões de navegação.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.3 Informações de Pagamento</h3>
                <p>Os pagamentos são processados pelo Stripe. Não armazenamos dados de cartão de crédito 
                nos nossos servidores. O Stripe pode armazenar informações de pagamento de acordo com a 
                sua própria política de privacidade.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.4 Conteúdo Carregado</h3>
                <p>As imagens que carrega para processamento são armazenadas de forma segura e utilizadas 
                apenas para fornecer os nossos serviços de geração de imagens.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Como Utilizamos as Suas Informações</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fornecer, manter e melhorar os nossos serviços</li>
              <li>Processar transações e enviar notificações relacionadas</li>
              <li>Enviar comunicações importantes sobre a sua conta</li>
              <li>Responder a pedidos de suporte e comunicações</li>
              <li>Análise de utilização para melhorar a experiência do utilizador</li>
              <li>Detetar e prevenir fraudes e abusos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Partilha de Dados com Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Podemos partilhar as suas informações com os seguintes terceiros:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Stripe:</strong> Para processamento de pagamentos</li>
              <li><strong>Supabase:</strong> Para armazenamento seguro de dados</li>
              <li><strong>Fornecedores de IA:</strong> Para processamento de imagens (dados anonimizados quando possível)</li>
              <li><strong>Serviços de análise:</strong> Para compreender padrões de utilização</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos as suas informações pessoais enquanto a sua conta estiver ativa ou conforme 
              necessário para fornecer os nossos serviços. As imagens geradas são mantidas na sua 
              biblioteca até que as elimine ou encerre a sua conta. Após o encerramento da conta, 
              os dados são eliminados no prazo de 30 dias, exceto quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Os Seus Direitos (RGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              De acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD), tem os seguintes direitos:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Direito de Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
              <li><strong>Direito de Retificação:</strong> Corrigir dados imprecisos ou incompletos</li>
              <li><strong>Direito ao Apagamento:</strong> Solicitar a eliminação dos seus dados</li>
              <li><strong>Direito à Portabilidade:</strong> Receber os seus dados em formato estruturado</li>
              <li><strong>Direito de Oposição:</strong> Opor-se ao processamento dos seus dados</li>
              <li><strong>Direito de Limitação:</strong> Limitar o processamento dos seus dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias semelhantes para melhorar a sua experiência. 
              Para mais informações, consulte a nossa{" "}
              <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger 
              os seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. 
              Isso inclui encriptação SSL/TLS, armazenamento seguro em servidores e controlo de acesso rigoroso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Alterações a Esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
              alterações significativas por email ou através de um aviso no nosso site. A utilização 
              continuada dos nossos serviços após tais alterações constitui a sua aceitação da nova política.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se tiver questões sobre esta Política de Privacidade ou sobre como tratamos os seus dados, 
              pode contactar-nos através de:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> info@produktpix.com
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Termos de Serviço</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
