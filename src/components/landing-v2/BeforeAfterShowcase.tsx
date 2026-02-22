import { useTranslation } from "react-i18next";
import { BeforeAfterSlider } from "@/components/ui/before-after";
import { Sparkles } from "lucide-react";

import beforeImage from "@/assets/demo_lp2.webp";
import afterImage from "@/assets/demo_lp2.png";

export const BeforeAfterShowcase = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            {t('landingV2.beforeAfter.badge', 'AI Magic')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.beforeAfter.title', 'From Simple Photo to Pro Shot')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.beforeAfter.description', 'Upload any product photo and watch AI transform it into a professional e-commerce image in seconds.')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <BeforeAfterSlider
            beforeImage={beforeImage}
            afterImage={afterImage}
            alt={t('landingV2.beforeAfter.alt', 'Product transformation')}
            className="rounded-2xl shadow-2xl"
            initialX={30}
          />
        </div>
      </div>
    </section>
  );
};
