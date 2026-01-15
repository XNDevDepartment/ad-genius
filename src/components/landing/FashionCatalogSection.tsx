import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/ui/before-after";
import { Check, Shirt, ShoppingBag, Footprints, Watch, ArrowRight } from "lucide-react";

import outfit_antes from '@/assets/demo_outfit_initial.jpeg';
import outfit_depois from '@/assets/demo_outfit_final.jpg';

const useCaseIcons = {
  apparel: Shirt,
  fashion: ShoppingBag,
  footwear: Footprints,
  accessories: Watch,
};

export const FashionCatalogSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const benefits = [
    t("landing.fashionCatalog.benefits.uploadGarments"),
    t("landing.fashionCatalog.benefits.chooseModels"),
    t("landing.fashionCatalog.benefits.catalogShots"),
    t("landing.fashionCatalog.benefits.batchProcess"),
  ];

  const useCases = [
    { key: "apparel", label: t("landing.fashionCatalog.useCases.apparel") },
    { key: "fashion", label: t("landing.fashionCatalog.useCases.fashion") },
    { key: "footwear", label: t("landing.fashionCatalog.useCases.footwear") },
    { key: "accessories", label: t("landing.fashionCatalog.useCases.accessories") },
  ];

  return (
    <section
      ref={ref}
      className="relative py-16 md:py-24 px-4 overflow-hidden bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5"
    >
      <div className="container-responsive">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            👗 {t("landing.fashionCatalog.badge")}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t("landing.fashionCatalog.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("landing.fashionCatalog.subtitle")}
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
          {/* Before/After Slider */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-apple-lg">
              <BeforeAfterSlider
                beforeImage={outfit_antes}
                afterImage={outfit_depois}
                alt="Fashion Catalog Demo"
                className="w-full aspect-square"
                initialX={30}
              />
            </div>
          </motion.div>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground text-lg">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="pt-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/create/outfit-swap")}
                className="group"
              >
                {t("landing.fashionCatalog.cta")}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Use Cases Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-center text-muted-foreground mb-6 text-lg">
            {t("landing.fashionCatalog.perfectFor")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {useCases.map((useCase, index) => {
              const Icon = useCaseIcons[useCase.key as keyof typeof useCaseIcons];
              return (
                <motion.div
                  key={useCase.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-foreground font-medium text-center">
                    {useCase.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FashionCatalogSection;
