import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/hooks/useUserStats";
import { BarChart3, Image, Heart, Coins } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";

const statVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const UserStatsPanel = () => {
  const { stats, loading, error } = useUserStats();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('userStats.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('userStats.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-4">
            <p className="text-muted-foreground">{t('userStats.errorLoading')}</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              {t('userStats.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  const creditUsagePercentage = stats.totalCredits > 0 
    ? ((stats.totalCredits - stats.creditsBalance) / stats.totalCredits) * 100 
    : 0;

  return (
    <Card className="hidden lg:block bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t('userStats.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('userStats.credits')}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.creditsBalance} / {stats.totalCredits}
            </span>
          </div>
          <Progress value={100 - creditUsagePercentage} className="h-2" />
        </div>

        {/* Stats Grid - Hidden on mobile */}
        <div className="hidden lg:grid grid-cols-2 gap-4">
          <motion.div custom={0} initial="hidden" animate="visible" variants={statVariants} className="space-y-1">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('userStats.totalImages')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalImages}</p>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={statVariants} className="space-y-1">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('userStats.thisMonth')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.imagesThisMonth}</p>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={statVariants} className="space-y-1">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('userStats.favorites')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.favoritesCount}</p>
          </motion.div>

          <motion.div custom={3} initial="hidden" animate="visible" variants={statVariants} className="space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('userStats.used')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.creditsUsed}</p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};