import { RevenueMetrics } from '@/components/admin/RevenueMetrics';

const AdminRevenuePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Revenue</h2>
        <p className="text-muted-foreground">MRR, subscriptions, and credit usage</p>
      </div>
      <RevenueMetrics />
    </div>
  );
};

export default AdminRevenuePage;
