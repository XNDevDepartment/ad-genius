import { useTranslation } from "react-i18next";
import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const { t } = useTranslation();

  const testimonials = [
    {
      quote: t('landingV2.testimonials.t1.quote', 'We used to spend €2,000 per photoshoot. Now we create better images in minutes for a fraction of the cost. Game changer for our small team.'),
      name: t('landingV2.testimonials.t1.name', 'Ana R.'),
      role: t('landingV2.testimonials.t1.role', 'Owner, Online Fashion Store'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t2.quote', 'I sell handmade jewelry on Etsy. ProduktPix gives me the professional look of a big brand without hiring a photographer.'),
      name: t('landingV2.testimonials.t2.name', 'Marco S.'),
      role: t('landingV2.testimonials.t2.role', 'Etsy Seller, Handmade Jewelry'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t3.quote', 'Our conversion rate increased 40% after switching to AI-generated lifestyle images. The ROI was immediate.'),
      name: t('landingV2.testimonials.t3.name', 'Sofia L.'),
      role: t('landingV2.testimonials.t3.role', 'E-commerce Manager, Home Decor Brand'),
      stars: 5,
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.testimonials.title', 'Loved by Business Owners')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.testimonials.subtitle', 'See what real businesses say about ProduktPix')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-8 rounded-2xl bg-card border border-border"
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
