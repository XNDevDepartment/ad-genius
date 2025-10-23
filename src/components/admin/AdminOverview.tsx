import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersList } from './UsersList';
import { ConversationsList } from './ConversationsList';
import { ConversationViewer } from './ConversationViewer';
import { AdminManagement } from './AdminManagement';
import { AdminImagesList } from './AdminImagesList';
import { EnhancedMetrics } from './EnhancedMetrics';
import { FinancialDashboard } from './FinancialDashboard';

export const AdminOverview = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
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
        
        <TabsContent value="conversations" className="space-y-6">
          {selectedConversationId ? (
            <ConversationViewer 
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
            />
          ) : (
            <ConversationsList onSelectConversation={setSelectedConversationId} />
          )}
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