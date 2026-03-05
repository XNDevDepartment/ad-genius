import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

export const ComparisonTable = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const rows = [
    {
      label: t('landingV2.comparison.costPerImage', 'Cost per image'),
      produktpix: t('landingV2.comparison.costPP', 'From €0.20'),
      studio: t('landingV2.comparison.costStudio', '€15–50+'),
      ppWins: true,
    },
    {
      label: t('landingV2.comparison.turnaround', 'Turnaround time'),
      produktpix: t('landingV2.comparison.turnaroundPP', '30 seconds'),
      studio: t('landingV2.comparison.turnaroundStudio', '3–7 days'),
      ppWins: true,
    },
    {
      label: t('landingV2.comparison.minimumOrder', 'Minimum order'),
      produktpix: t('landingV2.comparison.minPP', '1 image'),
      studio: t('landingV2.comparison.minStudio', '50+ usually'),
      ppWins: true,
    },
    {
      label: t('landingV2.comparison.phonePhoto', 'Works with a phone photo'),
      produktpix: true,
      studio: false,
      ppWins: true,
    },
    {
      label: t('landingV2.comparison.scale', 'Scale to 100+ products'),
      produktpix: t('landingV2.comparison.scalePP', 'Instantly'),
      studio: t('landingV2.comparison.scaleStudio', 'Weeks'),
      ppWins: true,
    },
    {
      label: t('landingV2.comparison.consistency', 'Consistent results'),
      produktpix: t('landingV2.comparison.consistencyPP', 'Every time'),
      studio: t('landingV2.comparison.consistencyStudio', 'Varies by session'),
      ppWins: true,
    },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.comparison.title', 'ProduktPix vs Hiring a Photographer')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingV2.comparison.subtitle', 'See how much time and money you save on every product shoot.')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-border"
        >
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
                <th className="p-4 text-center">
                  <span className="text-sm font-bold text-primary">ProduktPix</span>
                </th>
                <th className="p-4 text-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('landingV2.comparison.studioHeader', 'Traditional Studio')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-4 text-sm font-medium text-foreground">{row.label}</td>
                  <td className="p-4 text-center">
                    {typeof row.produktpix === 'boolean' ? (
                      row.produktpix ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-destructive mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-semibold text-primary">{row.produktpix}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.studio === 'boolean' ? (
                      row.studio ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-destructive mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">{row.studio}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};
