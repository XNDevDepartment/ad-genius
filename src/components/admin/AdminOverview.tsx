import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UsersList } from './UsersList';
import { AdminManagement } from './AdminManagement';
import { AdminImagesList } from './AdminImagesList';
import { EnhancedMetrics } from './EnhancedMetrics';
import { FinancialDashboard } from './FinancialDashboard';
import { Image } from 'lucide-react';

export const AdminOverview = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate('/admin/base-models')} className="gap-2">
          <Image className="w-4 h-4" />
          Manage Base Models
        </Button>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EnhancedMetrics />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersList />
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <AdminImagesList />
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};