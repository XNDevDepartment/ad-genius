import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminStats } from './AdminStats';
import { UsersList } from './UsersList';
import { ConversationsList } from './ConversationsList';
import { ConversationViewer } from './ConversationViewer';
import { AdminManagement } from './AdminManagement';
import { AdminImagesList } from './AdminImagesList';
import { MigrationButton } from './MigrationButton';

export const AdminOverview = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
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

        <TabsContent value="images" className="space-y-6">
          <AdminImagesList />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <AdminStats detailed />
        </TabsContent>
        
        <TabsContent value="admins" className="space-y-6">
          <AdminManagement />
          
          <div className="mt-8 p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Storage Migration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Migrate all images from Supabase Storage to Hetzner Object Storage. This process may take several minutes.
            </p>
            <MigrationButton />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};