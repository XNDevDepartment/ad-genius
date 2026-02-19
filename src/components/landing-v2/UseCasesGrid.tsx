import { useTranslation } from "react-i18next";
import { Shirt, Gem, Palette, Sofa, ShoppingBag, UtensilsCrossed } from "lucide-react";

export const UseCasesGrid = () => {
  const { t } = useTranslation();

  const useCases = [
    {
      icon: Shirt,
      title: t('landingV2.useCases.clothing.title', 'Online Clothing Stores'),
      description: t('landingV2.useCases.clothing.description', 'Show garments on AI models in lifestyle settings'),
    },
    {
      icon: Gem,
      title: t('landingV2.useCases.jewelry.title', 'Jewelry & Accessories'),
      description: t('landingV2.useCases.jewelry.description', 'Studio-quality close-ups and lifestyle shots'),
    },
    {
      icon: Palette,
      title: t('landingV2.useCases.beauty.title', 'Beauty & Cosmetics'),
      description: t('landingV2.useCases.beauty.description', 'Elegant product presentations for skincare and makeup'),
    },
    {
      icon: Sofa,
      title: t('landingV2.useCases.home.title', 'Furniture & Home Decor'),
      description: t('landingV2.useCases.home.description', 'Place products in beautifully styled room settings'),
    },
    {
      icon: ShoppingBag,
      title: t('landingV2.useCases.handmade.title', 'Handmade & Craft Sellers'),
      description: t('landingV2.useCases.handmade.description', 'Professional photos for Etsy, markets, and beyond'),
    },
    {
      icon: UtensilsCrossed,
      title: t('landingV2.useCases.food.title', 'Food & Beverage'),
      description: t('landingV2.useCases.food.description', 'Appetizing product shots for packaging and menus'),
    },
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.useCases.title', 'Built for Your Kind of Business')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.useCases.subtitle', 'See how businesses like yours use ProduktPix every day')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <a
              key={index}
              href="#how-it-works"
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <useCase.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {useCase.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {useCase.description}
              </p>
              <span className="text-sm font-medium text-primary group-hover:underline">
                {t('landingV2.useCases.seeHow', 'See how it works →')}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
