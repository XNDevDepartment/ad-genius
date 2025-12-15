import { useTranslation } from "react-i18next";
import { Images, Clock, Star, Users, Zap, TrendingUp } from "lucide-react";

export const StatsGrid = () => {
  const { t } = useTranslation();

  const stats = [
    {
      icon: Images,
      value: "500K+",
      label: t('landingV2.stats.imagesGenerated', 'Images Generated'),
    },
    {
      icon: Clock,
      value: "< 30s",
      label: t('landingV2.stats.avgTime', 'Average Generation Time'),
    },
    {
      icon: Star,
      value: "4.9/5",
      label: t('landingV2.stats.satisfaction', 'User Satisfaction'),
    },
    {
      icon: Users,
      value: "10K+",
      label: t('landingV2.stats.activeUsers', 'Active Sellers'),
    },
    {
      icon: Zap,
      value: "99.9%",
      label: t('landingV2.stats.uptime', 'Platform Uptime'),
    },
    {
      icon: TrendingUp,
      value: "3x",
      label: t('landingV2.stats.conversionBoost', 'Avg. Conversion Boost'),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center group"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
