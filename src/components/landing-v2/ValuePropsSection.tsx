import { useTranslation } from "react-i18next";
import { DollarSign, Clock, TrendingUp } from "lucide-react";

export const ValuePropsSection = () => {
  const { t } = useTranslation();

  const props = [
    {
      icon: DollarSign,
      title: t('landingV2.valueProps.cost.title', 'Save Up to 90% on Photography'),
      description: t('landingV2.valueProps.cost.description', 'No studio, no photographer, no editing team. Get professional results from a phone photo.'),
    },
    {
      icon: Clock,
      title: t('landingV2.valueProps.speed.title', 'From Photo to Listing in 30 Seconds'),
      description: t('landingV2.valueProps.speed.description', 'Stop waiting days for a photoshoot. Upload, generate, publish.'),
    },
    {
      icon: TrendingUp,
      title: t('landingV2.valueProps.results.title', 'Increase Sales with Better Images'),
      description: t('landingV2.valueProps.results.description', 'Professional product photos boost conversion rates by up to 3x.'),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.valueProps.title', 'Why Businesses Choose ProduktPix')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.valueProps.subtitle', 'Everything you need to create professional product images — without the traditional costs')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {props.map((prop, index) => (
            <div
              key={index}
              className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <prop.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {prop.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
