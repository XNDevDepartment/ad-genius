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
import { AdminAffiliates } from './AdminAffiliates';
import { UserGrowthMetrics } from './UserGrowthMetrics';
import { ConversionFunnel } from './ConversionFunnel';
import { CohortAnalysis } from './CohortAnalysis';
import { RevenueMetrics } from './RevenueMetrics';
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
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Dashboard - Overview with funnel summary */}
        <TabsContent value="dashboard" className="space-y-8">
          <EnhancedMetrics />
          <ConversionFunnel />
          <UserGrowthMetrics />
        </TabsContent>

        {/* Funnel - Detailed conversion analysis */}
        <TabsContent value="funnel" className="space-y-6">
          <ConversionFunnel />
          <CohortAnalysis />
        </TabsContent>

        {/* Revenue - Financial metrics and subscription data */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueMetrics />
          <FinancialDashboard />
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-6">
          <UsersList />
        </TabsContent>

        {/* Content - Images, Videos, Outfit Swaps */}
        <TabsContent value="content" className="space-y-6">
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
        </TabsContent>

        {/* Marketing - Affiliates + Promo Codes */}
        <TabsContent value="marketing" className="space-y-6">
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
        </TabsContent>

        {/* Settings - AI Prompts + Admins */}
        <TabsContent value="settings" className="space-y-6">
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
        </TabsContent>

        {/* Errors */}
        <TabsContent value="errors" className="space-y-6">
          <AdminErrorReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};