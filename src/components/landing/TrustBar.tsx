import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export default function TrustBar() {
  const { t } = useTranslation();

  const stats = [
    {
      value: "+29%",
      text: t('trustBar.conversionStat'),
      source: "Yotpo"
    },
    {
      value: "84%",
      text: t('trustBar.trustStat'),
      source: "Nielsen"
    },
    {
      value: "4x",
      text: t('trustBar.ctrStat'),
      source: "AdWeek"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full bg-muted/30 border border-border/50 rounded-2xl p-6 mt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
            className="space-y-2"
          >
            <div className="text-2xl md:text-3xl font-bold text-primary">
              {stat.value}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {stat.text}
            </p>
            <div className="text-xs text-muted-foreground/70 font-medium">
              {t('trustBar.source')}: {stat.source}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}