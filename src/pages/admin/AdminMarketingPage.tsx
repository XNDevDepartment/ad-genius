import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAffiliates } from '@/components/admin/AdminAffiliates';
import { PromoCodesManagement } from '@/components/admin/PromoCodesManagement';

const AdminMarketingPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Marketing</h2>
        <p className="text-muted-foreground">Affiliates and promotional codes</p>
      </div>
      <Tabs defaultValue="affiliates" className="w-full">
        <TabsList>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
        </TabsList>
        <TabsContent value="affiliates">
          <AdminAffiliates />
        </TabsContent>
        <TabsContent value="promo-codes">
          <PromoCodesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketingPage;
