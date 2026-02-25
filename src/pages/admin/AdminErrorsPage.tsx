import { AdminErrorReports } from '@/components/admin/AdminErrorReports';

const AdminErrorsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Error Reports</h2>
        <p className="text-muted-foreground">Track and resolve application errors</p>
      </div>
      <AdminErrorReports />
    </div>
  );
};

export default AdminErrorsPage;
