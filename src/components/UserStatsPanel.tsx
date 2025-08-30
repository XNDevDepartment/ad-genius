import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/hooks/useUserStats";
import { BarChart3, Image, Heart, Coins } from "lucide-react";

export const UserStatsPanel = () => {
  const { stats, loading, error } = useUserStats();

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Your Activity
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
            Your Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-4">
            <p className="text-muted-foreground">Failed to load statistics</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Retry
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
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Your Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Credits</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.creditsBalance} / {stats.totalCredits}
            </span>
          </div>
          <Progress value={100 - creditUsagePercentage} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Images</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalImages}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <p className="text-2xl font-bold">{stats.imagesThisMonth}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Favorites</span>
            </div>
            <p className="text-2xl font-bold">{stats.favoritesCount}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Used</span>
            </div>
            <p className="text-2xl font-bold">{stats.creditsUsed}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};