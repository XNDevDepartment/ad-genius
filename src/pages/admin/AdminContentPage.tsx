import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminImagesList } from '@/components/admin/AdminImagesList';
import { AdminVideosList } from '@/components/admin/AdminVideosList';
import { AdminOutfitSwapsList } from '@/components/admin/AdminOutfitSwapsList';

const AdminContentPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content</h2>
        <p className="text-muted-foreground">Images, videos, and outfit swaps</p>
      </div>
      <Tabs defaultValue="images" className="w-full">
        <TabsList>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="outfit-swaps">Outfit Swaps</TabsTrigger>
        </TabsList>
        <TabsContent value="images">
          <AdminImagesList />
        </TabsContent>
        <TabsContent value="videos">
          <AdminVideosList />
        </TabsContent>
        <TabsContent value="outfit-swaps">
          <AdminOutfitSwapsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContentPage;
