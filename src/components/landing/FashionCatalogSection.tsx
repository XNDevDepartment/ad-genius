import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { Check, Shirt, ShoppingBag, Footprints, Watch, ArrowRight, ArrowDown, Sparkles } from "lucide-react";

// Source garment (flat lay)
import outfit_source from '@/assets/demo_outfit_initial.jpeg';

// Catalog results - diverse shots from landing gallery
import result1 from '@/assets/landing_gallery/1.webp';
import result2 from '@/assets/landing_gallery/2.webp';
import result3 from '@/assets/landing_gallery/3.webp';
import result4 from '@/assets/landing_gallery/4.webp';
import result5 from '@/assets/landing_gallery/5.webp';
import result6 from '@/assets/landing_gallery/6.webp';

const catalogResults = [result1, result2, result3, result4, result5, result6];

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

        {/* Main Content - Source to Catalog Showcase */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
          {/* Source → Results Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              {/* Source Garment */}
              <div className="relative flex-shrink-0">
                <div className="w-36 h-48 md:w-40 md:h-52 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg bg-card">
                  <img 
                    src={outfit_source} 
                    alt={t("landing.fashionCatalog.sourceLabel")} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full whitespace-nowrap shadow-md">
                  {t("landing.fashionCatalog.sourceLabel")}
                </span>
              </div>
              
              {/* Arrow/Connector */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col items-center gap-2 text-primary py-4 md:py-0"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{t("landing.fashionCatalog.transformLabel")}</span>
                </div>
                <ArrowRight className="w-8 h-8 hidden md:block" />
                <ArrowDown className="w-8 h-8 md:hidden" />
              </motion.div>
              
              {/* Results Grid */}
              <div className="relative">
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {catalogResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
                      transition={{ 
                        duration: 0.4, 
                        delay: 0.5 + index * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                      className="w-20 h-28 md:w-24 md:h-32 rounded-lg overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 ring-1 ring-border"
                    >
                      <img 
                        src={result} 
                        alt={`${t("landing.fashionCatalog.resultsLabel")} ${index + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                    </motion.div>
                  ))}
                </div>
                {/* Results Badge */}
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 1.1 }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full whitespace-nowrap shadow-md"
                >
                  {t("landing.fashionCatalog.resultsLabel")}
                </motion.span>
              </div>
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
