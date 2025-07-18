import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminStats } from './AdminStats';
import { UsersList } from './UsersList';
import { ConversationsList } from './ConversationsList';
import { ConversationViewer } from './ConversationViewer';
import { AdminManagement } from './AdminManagement';

export const AdminOverview = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="admins">Admin Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <AdminStats />
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
        
        <TabsContent value="reports" className="space-y-6">
          <AdminStats detailed />
        </TabsContent>
        
        <TabsContent value="admins" className="space-y-6">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};