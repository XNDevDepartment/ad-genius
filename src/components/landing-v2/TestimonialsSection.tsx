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
      role: t('landingV2.testimonials.t1.role', 'CEO'),
      company: t('landingV2.testimonials.t1.company', 'OGatoDasFraldas'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t2.quote', 'We are already achieving very, very interesting results! The results were shocking! They were so good!!'),
      name: t('landingV2.testimonials.t2.name', 'Sofia Santos'),
      role: t('landingV2.testimonials.t2.role', 'Creative Director'),
      company: t('landingV2.testimonials.t2.company', 'Bug Hug'),
      stars: 5,
    },
    {
      quote: t('landingV2.testimonials.t3.quote', 'Good ease of use is a fact but the end result...what a show'),
      name: t('landingV2.testimonials.t3.name', 'Luís Alves'),
      role: t('landingV2.testimonials.t3.role', 'Founder'),
      company: t('landingV2.testimonials.t3.company', 'Yonos'),
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.testimonials.subtitle', 'See what real businesses say about ProduktPix')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
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
