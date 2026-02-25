import { UsersList } from '@/components/admin/UsersList';

const AdminUsersPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="text-muted-foreground">Manage all registered users</p>
      </div>
      <UsersList />
    </div>
  );
};

export default AdminUsersPage;
