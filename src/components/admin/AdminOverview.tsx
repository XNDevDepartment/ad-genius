import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UsersList } from './UsersList';
import { AdminManagement } from './AdminManagement';
import { AdminImagesList } from './AdminImagesList';
import { AdminVideosList } from './AdminVideosList';
import { AdminOutfitSwapsList } from './AdminOutfitSwapsList';
import { EnhancedMetrics } from './EnhancedMetrics';
import { FinancialDashboard } from './FinancialDashboard';
import { PromptManagement } from './PromptManagement';
import { PromoCodesManagement } from './PromoCodesManagement';
import { AdminErrorReports } from './AdminErrorReports';
import { Image, AlertTriangle } from 'lucide-react';

export const AdminOverview = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={() => navigate('/admin/subscription-audit')} variant="outline" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Subscription Audit
        </Button>
        <Button onClick={() => navigate('/admin/base-models')} className="gap-2">
          <Image className="w-4 h-4" />
          Manage Base Models
        </Button>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-10 lg:grid-cols-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="outfit-swaps">Outfit Swaps</TabsTrigger>
          <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
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

        <TabsContent value="videos" className="space-y-6">
          <AdminVideosList />
        </TabsContent>

        <TabsContent value="outfit-swaps" className="space-y-6">
          <AdminOutfitSwapsList />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <PromptManagement />
        </TabsContent>

        <TabsContent value="promo-codes" className="space-y-6">
          <PromoCodesManagement />
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <AdminErrorReports />
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};