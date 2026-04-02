import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEO } from '@/components/SEO';
import { MinimalHeader } from '@/components/landing-v2/MinimalHeader';
import { MinimalFooter } from '@/components/landing-v2/MinimalFooter';
import { getIntegrationBySlug, integrations } from '@/data/integrations';
import { buildFAQPageSchema, buildBreadcrumbSchema, buildWebPageSchema } from '@/lib/schema';
import { PageTransition } from '@/components/PageTransition';

const IntegrationLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  
  const integration = slug ? getIntegrationBySlug(slug) : undefined;
  
  if (!integration) {
    return <Navigate to="/404" replace />;
  }
  
  const otherIntegrations = integrations.filter(i => i.slug !== slug).slice(0, 3);
  
  // Build schema
  const faqSchema = buildFAQPageSchema(integration.faqs);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://produktpix.com' },
    { name: 'Integrations', url: 'https://produktpix.com/integrations' },
    { name: integration.name, url: `https://produktpix.com/integrations/${integration.slug}` }
  ]);
  const pageSchema = buildWebPageSchema(integration.title, integration.description, `/integrations/${integration.slug}`);

  return (
    <PageTransition>
      <SEO
        title={integration.metaTitle}
        description={integration.metaDescription}
        path={`/integrations/${integration.slug}`}
        schema={[faqSchema, breadcrumbSchema, pageSchema]}
      />
      
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-24 pb-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/integrations" className="hover:text-foreground transition-colors">Integrations</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{integration.name}</span>
          </nav>
        </div>
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-6"
                style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
              >
                <Zap className="h-4 w-4" />
                <span>{integration.name} Integration</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {integration.title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8">
                {integration.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div 
                className="aspect-square max-w-md mx-auto rounded-3xl flex items-center justify-center p-12"
                style={{ backgroundColor: `${integration.color}10` }}
              >
                <img 
                  src={`/logos/${integration.slug}.png`}
                  alt={`${integration.name} logo`}
                  className="w-full max-w-[200px] h-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create stunning product photos for {integration.name}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {integration.features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-background">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${integration.color}20` }}
                    >
                      <Check className="h-4 w-4" style={{ color: integration.color }} />
                    </div>
                    <p className="text-foreground font-medium">{feature}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {/* Benefits Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-8">Why Use ProduktPix with {integration.name}?</h2>
              
              <div className="space-y-4">
                {integration.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: `${integration.color}20` }}
                    >
                      <Check className="h-3 w-3" style={{ color: integration.color }} />
                    </div>
                    <p className="text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 md:p-12">
              <h3 className="text-2xl font-bold mb-4">Get Started Today</h3>
              <p className="text-muted-foreground mb-6">
                Create your first AI-generated product photo in minutes. No credit card required.
              </p>
              <Button asChild size="lg" className="w-full gap-2">
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              {integration.name} Integration FAQ
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              {integration.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
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
        
        {/* Other Integrations */}
        <section className="container mx-auto px-4 py-16 border-t border-border/50">
          <h2 className="text-2xl font-bold mb-8">Other Integrations</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {otherIntegrations.map((other) => (
              <Link
                key={other.slug}
                to={`/integrations/${other.slug}`}
                className="group"
              >
                <Card className="h-full border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${other.color}15` }}
                    >
                      <img 
                        src={`/logos/${other.slug}.png`}
                        alt={other.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {other.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {other.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
        
        <MinimalFooter />
      </div>
    </PageTransition>
  );
};

export default IntegrationLanding;
