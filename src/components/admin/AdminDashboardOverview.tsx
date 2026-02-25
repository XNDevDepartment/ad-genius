import { EnhancedMetrics } from './EnhancedMetrics';
import { ConversionFunnel } from './ConversionFunnel';
import { UserGrowthMetrics } from './UserGrowthMetrics';
import { CohortAnalysis } from './CohortAnalysis';

export const AdminDashboardOverview = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>
      <EnhancedMetrics />
      <ConversionFunnel />
      <UserGrowthMetrics />
      <CohortAnalysis />
    </div>
  );
};
