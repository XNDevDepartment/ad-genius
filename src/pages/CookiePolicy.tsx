import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { buildWebPageSchema } from "@/lib/schema";
import { PageTransition } from "@/components/PageTransition";

const CookiePolicy = () => {
  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <SEO
        title="Cookie Policy"
        description="Understand how ProduktPix uses cookies and tracking technologies. Learn about essential, functional, analytics, and marketing cookies."
        path="/cookies"
        schema={buildWebPageSchema('Cookie Policy', 'ProduktPix cookie policy and tracking information', '/cookies')}
      />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Política de Cookies</h1>
        <p className="text-muted-foreground mb-12">Última atualização: 29 de dezembro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. O Que São Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo (computador, 
              tablet ou telemóvel) quando visita websites. São amplamente utilizados para fazer os sites 
              funcionarem de forma mais eficiente e para fornecer informações aos proprietários do site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Como Utilizamos Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              A ProduktPix utiliza cookies para diversos fins, incluindo melhorar a sua experiência 
              de navegação, lembrar as suas preferências e analisar como o nosso site é utilizado.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Tipos de Cookies que Utilizamos</h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Cookies Essenciais</h3>
                <p>
                  Estes cookies são necessários para o funcionamento básico do site. Incluem cookies 
                  que permitem iniciar sessão na sua conta, manter a sua sessão ativa e garantir a 
                  segurança da plataforma.
                </p>
                <div className="mt-3 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm"><strong>Exemplos:</strong></p>
                  <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                    <li>Cookies de autenticação (sessão de utilizador)</li>
                    <li>Cookies de segurança (proteção CSRF)</li>
                    <li>Cookies de preferências de idioma</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Cookies Funcionais</h3>
                <p>
                  Estes cookies permitem lembrar as suas preferências e personalizar a sua experiência. 
                  Por exemplo, lembrar o tema escolhido (claro ou escuro) ou as suas configurações de geração.
                </p>
                <div className="mt-3 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm"><strong>Exemplos:</strong></p>
                  <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                    <li>Preferências de tema (claro/escuro)</li>
                    <li>Configurações guardadas</li>
                    <li>Preferências de idioma</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.3 Cookies de Análise</h3>
                <p>
                  Utilizamos cookies de análise para compreender como os visitantes interagem com o 
                  nosso site. Isso ajuda-nos a melhorar a experiência do utilizador e a identificar 
                  áreas que precisam de melhorias.
                </p>
                <div className="mt-3 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm"><strong>Exemplos:</strong></p>
                  <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                    <li>Páginas visitadas e tempo de permanência</li>
                    <li>Funcionalidades mais utilizadas</li>
                    <li>Erros encontrados durante a navegação</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.4 Cookies de Marketing</h3>
                <p>
                  Estes cookies podem ser utilizados para mostrar anúncios relevantes e medir a 
                  eficácia das nossas campanhas publicitárias.
                </p>
                <div className="mt-3 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm"><strong>Exemplos:</strong></p>
                  <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                    <li>Pixel do Meta (Facebook/Instagram)</li>
                    <li>Cookies de remarketing</li>
                    <li>Rastreamento de conversões</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Cookies de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Alguns cookies são colocados por serviços de terceiros que aparecem nas nossas páginas. 
              Estes incluem:
            </p>
            <div className="space-y-4 text-muted-foreground">
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium text-foreground">Stripe</p>
                <p className="text-sm mt-1">Processamento de pagamentos e prevenção de fraudes</p>
              </div>
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium text-foreground">Supabase</p>
                <p className="text-sm mt-1">Autenticação e gestão de sessões</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Gerir os Seus Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Pode controlar e/ou eliminar cookies conforme desejar. A maioria dos navegadores web 
              permite controlar cookies através das suas definições. Pode:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Ver quais cookies estão armazenados e eliminá-los individualmente</li>
              <li>Bloquear cookies de terceiros</li>
              <li>Bloquear todos os cookies de sites específicos</li>
              <li>Bloquear a instalação de todos os cookies</li>
              <li>Eliminar todos os cookies quando fechar o navegador</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Nota:</strong> Se optar por bloquear cookies essenciais, algumas funcionalidades 
              do nosso site podem não funcionar corretamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Links para Definições de Cookies dos Navegadores</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/pt-PT/kb/ativar-desativar-cookies" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/pt-pt/microsoft-edge/eliminar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Consentimento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao continuar a utilizar o nosso site, consente a utilização de cookies de acordo com 
              esta política. Se não concordar com a nossa utilização de cookies, deve ajustar as 
              definições do seu navegador ou deixar de utilizar o nosso site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Alterações a Esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Cookies periodicamente para refletir alterações nas 
              nossas práticas ou por outros motivos operacionais, legais ou regulamentares.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se tiver questões sobre a nossa utilização de cookies, contacte-nos:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> info@produktpix.com
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Termos de Serviço</Link>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default CookiePolicy;
