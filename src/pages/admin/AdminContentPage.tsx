import { useSearchParams, useNavigate } from 'react-router-dom';
import { AdminContentList } from '@/components/admin/AdminContentList';

const AdminContentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const userEmail = searchParams.get('userEmail');

  const handleClearUser = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content</h2>
        <p className="text-muted-foreground">Generated images, UGC, videos, outfit swaps, and more</p>
      </div>
      <AdminContentList
        userId={userId}
        userEmail={userEmail}
        onClearUser={handleClearUser}
      />
    </div>
  );
};

export default AdminContentPage;
