import { useTranslation } from "react-i18next";
import { Camera, Sun, Layers, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

export const ProductPhotographyExplainer = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const pillars = [
    { icon: Sun, label: t('landingV2.explainer.lighting', 'Consistent Lighting') },
    { icon: Camera, label: t('landingV2.explainer.angles', 'Multiple Angles') },
    { icon: Layers, label: t('landingV2.explainer.backgrounds', 'Lifestyle Backgrounds') },
    { icon: RotateCcw, label: t('landingV2.explainer.consistency', 'Brand Consistency') },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t('landingV2.explainer.title', 'What Makes Great Product Photography?')}
          </h2>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t('landingV2.explainer.content', 'Great product photography combines consistent lighting, clean backgrounds, lifestyle context, and multiple angles to build buyer trust and increase conversions. Professional studios charge €15–50 per image and take days to deliver. With ProduktPix, you upload a single phone photo and get studio-quality results in under 30 seconds — with the same consistency across your entire catalog. No equipment, no studio, no photographer needed.')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {pillars.map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-sm font-medium text-foreground"
              >
                <pillar.icon className="h-4 w-4 text-primary" />
                {pillar.label}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
