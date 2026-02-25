import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptManagement } from '@/components/admin/PromptManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';

const AdminSettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">AI prompts and admin user management</p>
      </div>
      <Tabs defaultValue="prompts" className="w-full">
        <TabsList>
          <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
        </TabsList>
        <TabsContent value="prompts">
          <PromptManagement />
        </TabsContent>
        <TabsContent value="admins">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsPage;
