import { RevenueMetrics } from '@/components/admin/RevenueMetrics';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';

const AdminRevenuePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Revenue</h2>
        <p className="text-muted-foreground">Financial metrics and subscription data</p>
      </div>
      <RevenueMetrics />
      <FinancialDashboard />
    </div>
  );
};

export default AdminRevenuePage;
