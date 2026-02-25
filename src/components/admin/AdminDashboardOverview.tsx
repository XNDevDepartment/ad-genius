import { EnhancedMetrics } from './EnhancedMetrics';
import { ConversionFunnel } from './ConversionFunnel';
import { UserGrowthMetrics } from './UserGrowthMetrics';

export const AdminDashboardOverview = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>
      <EnhancedMetrics />
      <ConversionFunnel />
      <UserGrowthMetrics />
    </div>
  );
};
