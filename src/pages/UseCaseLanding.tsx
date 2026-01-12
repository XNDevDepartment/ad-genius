import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, ChevronRight, Image, ShoppingCart, Store, Shirt, Gem, Sparkles, UtensilsCrossed, Sofa, Smartphone, Palette, Square, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEO } from '@/components/SEO';
import { MinimalHeader } from '@/components/landing-v2/MinimalHeader';
import { MinimalFooter } from '@/components/landing-v2/MinimalFooter';
import { getUseCaseBySlug, getRelatedUseCases } from '@/data/use-cases';
import { buildFAQPageSchema, buildBreadcrumbSchema, buildWebPageSchema } from '@/lib/schema';

// Icon mapping for dynamic icons
const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Store,
  Shirt,
  Gem,
  Sparkles,
  UtensilsCrossed,
  Sofa,
  Smartphone,
  Palette,
  Square,
  Image,
};

const UseCaseLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  
  const useCase = slug ? getUseCaseBySlug(slug) : undefined;
  
  if (!useCase) {
    return <Navigate to="/404" replace />;
  }
  
  const relatedUseCases = getRelatedUseCases(useCase.relatedUseCases);
  
  // Dynamic icon component
  const IconComponent = iconMap[useCase.icon] || Image;
  
  // Build schema
  const faqSchema = buildFAQPageSchema(useCase.faqs);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://produktpix.com' },
    { name: 'Use Cases', url: 'https://produktpix.com/use-cases' },
    { name: useCase.title, url: `https://produktpix.com/use-cases/${useCase.slug}` }
  ]);
  const pageSchema = buildWebPageSchema(useCase.title, useCase.description, `/use-cases/${useCase.slug}`);

  return (
    <>
      <SEO
        title={useCase.metaTitle}
        description={useCase.metaDescription}
        path={`/use-cases/${useCase.slug}`}
        schema={[faqSchema, breadcrumbSchema, pageSchema]}
      />
      
      <div className="min-h-screen bg-background">
        <MinimalHeader />
        
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-24 pb-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{useCase.title}</span>
          </nav>
        </div>
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <IconComponent className="h-4 w-4" />
                <span>AI-Powered Solution</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {useCase.title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8">
                {useCase.description}
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
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <IconComponent className="h-32 w-32 text-primary/40" />
              </div>
            </div>
          </div>
        </section>
        
        {/* Benefits Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose ProduktPix</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional AI-powered product photography that saves time and money
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCase.benefits.map((benefit, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-foreground">{benefit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Product Photos?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using ProduktPix to create stunning product imagery
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">Compare Plans</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="w-full">
              {useCase.faqs.map((faq, index) => (
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
        
        {/* Related Use Cases */}
        {relatedUseCases.length > 0 && (
          <section className="container mx-auto px-4 py-16 border-t border-border/50">
            <h2 className="text-2xl font-bold mb-8">Related Use Cases</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {relatedUseCases.map((related) => {
                const RelatedIcon = iconMap[related.icon] || Image;
                return (
                  <Link
                    key={related.slug}
                    to={`/use-cases/${related.slug}`}
                    className="group"
                  >
                    <Card className="h-full border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                          <RelatedIcon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                          {related.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {related.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        
        <MinimalFooter />
      </div>
    </>
  );
};

export default UseCaseLanding;
