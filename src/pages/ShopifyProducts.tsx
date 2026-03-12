import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { ShopifyConnectCard } from "@/components/shopify/ShopifyConnectCard";
import { ShopifyStoreHeader } from "@/components/shopify/ShopifyStoreHeader";
import { ShopifyProductCatalog } from "@/components/shopify/ShopifyProductCatalog";
import { ShopifyProductDetail } from "@/components/shopify/ShopifyProductDetail";
import { ShopifyGenerationModal, type GenerationType, type GenerationSettings } from "@/components/shopify/ShopifyGenerationModal";
import { ShopifyGeneratedAssets } from "@/components/shopify/ShopifyGeneratedAssets";
import { useShopifyDashboard } from "@/hooks/useShopifyDashboard";
import { toast } from "sonner";

export default function ShopifyProducts() {
  const navigate = useNavigate();
  const dashboard = useShopifyDashboard();
  const [generationModal, setGenerationModal] = useState<{ open: boolean; type: GenerationType }>({
    open: false,
    type: "background",
  });
  const [generating, setGenerating] = useState(false);

  const handleOpenGeneration = (type: GenerationType) => {
    setGenerationModal({ open: true, type });
  };

  const handleGenerate = async (settings: GenerationSettings) => {
    setGenerating(true);
    try {
      // Navigate to the appropriate generation page with pre-filled data
      const params = new URLSearchParams({
        shopifyImage: settings.productImageUrl,
        shopifyProduct: settings.productTitle,
      });

      if (settings.type === "background") {
        navigate(`/create/product-studio?${params.toString()}`);
      } else if (settings.type === "ugc") {
        navigate(`/create/ugc-v3?${params.toString()}`);
      } else if (settings.type === "fashion") {
        navigate(`/create/outfit-swap?${params.toString()}`);
      }
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setGenerating(false);
      setGenerationModal({ open: false, type: "background" });
    }
  };

  if (dashboard.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboard.connection) {
    return (
      <>
        <SEO title="Connect Shopify Store" description="Connect your Shopify store to sync products" path="/shopify/products" />
        <ShopifyConnectCard onConnected={dashboard.initialize} />
      </>
    );
  }

  const lastSyncAt = dashboard.products.length > 0 ? dashboard.products[0].synced_at : null;

  return (
    <>
      <SEO title="Shopify Dashboard" description="Manage your Shopify products and generate AI images" path="/shopify/products" />
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Store Header */}
        <ShopifyStoreHeader
          connection={dashboard.connection}
          productCount={dashboard.products.length}
          lastSyncAt={lastSyncAt}
          syncStatus={dashboard.syncStatus}
          onSync={dashboard.handleSync}
          onDisconnect={dashboard.handleDisconnect}
        />

        {/* Main content based on view mode */}
        {dashboard.viewMode === "catalog" ? (
          <ShopifyProductCatalog
            products={dashboard.filteredProducts}
            searchQuery={dashboard.searchQuery}
            onSearchChange={dashboard.setSearchQuery}
            vendorFilter={dashboard.vendorFilter}
            onVendorChange={dashboard.setVendorFilter}
            typeFilter={dashboard.typeFilter}
            onTypeChange={dashboard.setTypeFilter}
            statusFilter={dashboard.statusFilter}
            onStatusChange={dashboard.setStatusFilter}
            sortBy={dashboard.sortBy}
            onSortChange={dashboard.setSortBy}
            vendors={dashboard.vendors}
            productTypes={dashboard.productTypes}
            statuses={dashboard.statuses}
            onOpenProduct={dashboard.openProduct}
            totalCount={dashboard.products.length}
          />
        ) : dashboard.selectedProduct ? (
          <div className="space-y-6">
            <ShopifyProductDetail
              product={dashboard.selectedProduct}
              onBack={dashboard.backToCatalog}
              onGenerate={handleOpenGeneration}
            />

            {/* Generated assets panel */}
            <ShopifyGeneratedAssets
              assets={dashboard.generatedAssets}
              selectedAssets={dashboard.selectedAssets}
              onToggleSelect={dashboard.toggleAssetSelection}
              onSelectAll={dashboard.selectAllAssets}
              onClearSelection={dashboard.clearAssetSelection}
              productTitle={dashboard.selectedProduct.title}
            />
          </div>
        ) : null}

        {/* Generation modal */}
        {dashboard.selectedProduct && (
          <ShopifyGenerationModal
            open={generationModal.open}
            onClose={() => setGenerationModal({ open: false, type: "background" })}
            product={dashboard.selectedProduct}
            generationType={generationModal.type}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </div>
    </>
  );
}
