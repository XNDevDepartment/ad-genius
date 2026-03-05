import { useTranslation } from "react-i18next";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export const TestimonialsSection = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const testimonials = [
    {
      quote: t('landingV2.testimonials.t1.quote', 'A tool with great potential. A valuable addition for generating stand-out, unique images.'),
      name: t('landingV2.testimonials.t1.name', 'Andreia Vieira'),
      role: t('landingV2.testimonials.t1.role', 'Founder'),
      company: t('landingV2.testimonials.t1.company', 'OGatoDasFraldas'),
      metric: t('landingV2.testimonials.t1.metric', 'Saved 85% on photography'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t2.quote', 'We are already achieving very, very interesting results! The results were shocking! They were so good!!'),
      name: t('landingV2.testimonials.t2.name', 'Sofia Santos'),
      role: t('landingV2.testimonials.t2.role', 'Creative Director'),
      company: t('landingV2.testimonials.t2.company', 'Bug Hug'),
      metric: t('landingV2.testimonials.t2.metric', '4x more social content'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t3.quote', 'Good ease of use is a fact but the end result...what a show'),
      name: t('landingV2.testimonials.t3.name', 'Luís Alves'),
      role: t('landingV2.testimonials.t3.role', 'Founder'),
      company: t('landingV2.testimonials.t3.company', 'Yonos'),
      metric: t('landingV2.testimonials.t3.metric', '€1,200/mo saved'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t4.quote', 'I launched my entire Shopify store in a weekend. The product photos look like I hired a professional team.'),
      name: t('landingV2.testimonials.t4.name', 'Maria Costa'),
      role: t('landingV2.testimonials.t4.role', 'Shopify Store Owner'),
      company: t('landingV2.testimonials.t4.company', 'Lumi Accessories'),
      metric: t('landingV2.testimonials.t4.metric', 'Launched 3x faster'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t5.quote', 'We went from spending days on product shoots to having images ready in minutes. Game changer for our catalog.'),
      name: t('landingV2.testimonials.t5.name', 'Ricardo Mendes'),
      role: t('landingV2.testimonials.t5.role', 'Fashion Brand Founder'),
      company: t('landingV2.testimonials.t5.company', 'Aura Wear'),
      metric: t('landingV2.testimonials.t5.metric', '200+ images/month'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t6.quote', 'My Etsy conversion rate went up after switching to ProduktPix images. The lifestyle backgrounds make all the difference.'),
      name: t('landingV2.testimonials.t6.name', 'Carolina Ferreira'),
      role: t('landingV2.testimonials.t6.role', 'Etsy Seller'),
      company: t('landingV2.testimonials.t6.company', 'Casa & Cor'),
      metric: t('landingV2.testimonials.t6.metric', '28% more conversions'),
      stars: 5,
    },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.testimonials.title', 'Loved by Business Owners')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            {t('landingV2.testimonials.subtitle', 'See what real businesses say about ProduktPix')}
          </p>

          {/* Aggregate rating */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">4.9/5</span>
            <span className="text-sm text-muted-foreground">
              {t('landingV2.testimonials.ratingLabel', 'from 127+ e-commerce businesses')}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.08 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-8 space-y-4">
                  <Quote className="h-8 w-8 text-primary/20" />

                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>

                  <p className="text-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </p>

                  {/* Metric badge */}
                  <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {testimonial.metric}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role} · {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
