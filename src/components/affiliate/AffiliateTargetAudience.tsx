import { Video, Briefcase, ShoppingBag, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const audiences = [
  {
    icon: Video,
    title: 'Criadores de conteúdo',
    description: 'YouTubers, instagrammers, bloggers e criadores de conteúdo digital'
  },
  {
    icon: Briefcase,
    title: 'Freelancers e agências',
    description: 'Profissionais de marketing, design e desenvolvimento web'
  },
  {
    icon: ShoppingBag,
    title: 'Profissionais de e-commerce',
    description: 'Gestores de lojas online, consultores e especialistas em vendas'
  },
  {
    icon: Star,
    title: 'Utilizadores ativos do ProduktPix',
    description: 'Clientes satisfeitos que queiram partilhar a sua experiência'
  }
];

export const AffiliateTargetAudience = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Para quem é este programa?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O programa de afiliados é ideal para profissionais que trabalham com e-commerce e marketing digital
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {audiences.map((audience, index) => (
            <Card 
              key={index} 
              className="border-0 shadow-apple bg-card hover:shadow-apple-lg transition-shadow"
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-hero flex items-center justify-center mb-5">
                  <audience.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{audience.title}</h3>
                <p className="text-sm text-muted-foreground">{audience.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
