import { Video, Briefcase, ShoppingBag, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export const AffiliateTargetAudience = () => {
  const { t } = useTranslation();

  const audiences = [
    {
      icon: Video,
      title: t('affiliate.audience.creator'),
      description: t('affiliate.audience.creatorDesc')
    },
    {
      icon: Briefcase,
      title: t('affiliate.audience.freelancer'),
      description: t('affiliate.audience.freelancerDesc')
    },
    {
      icon: ShoppingBag,
      title: t('affiliate.audience.ecommerce'),
      description: t('affiliate.audience.ecommerceDesc')
    },
    {
      icon: Star,
      title: t('affiliate.audience.user'),
      description: t('affiliate.audience.userDesc')
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('affiliate.audience.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('affiliate.audience.subtitle')}
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
