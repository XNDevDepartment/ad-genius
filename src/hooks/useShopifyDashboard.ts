import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ShopifyConnection {
  id: string;
  shop_domain: string;
  access_token: string;
  connected_at: string;
  updated_at: string;
  scopes: string | null;
}

export interface ShopifyProductImage {
  id?: number;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  position?: number;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ShopifyProduct {
  id: string;
  shopify_product_id: number;
  title: string;
  description: string | null;
  sku: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  image_url: string | null;
  images: ShopifyProductImage[];
  variants: ShopifyVariant[];
  synced_at: string;
  shopify_connection_id: string;
}

export interface GeneratedAsset {
  id: string;
  public_url: string;
  prompt: string;
  created_at: string;
  settings: Record<string, unknown> | null;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type ViewMode = "catalog" | "detail";
export type SortOption = "title" | "synced_at" | "updated_at";

export function useShopifyDashboard() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<ShopifyConnection | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState<{ synced: number; total: number } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("catalog");
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("title");

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    setConnection((data as unknown as ShopifyConnection[])?.[0] || null);
    return (data as unknown as ShopifyConnection[])?.[0] || null;
  }, [user]);

  const fetchProducts = useCallback(async (connId?: string) => {
    if (!user) return;
    const connectionId = connId || connection?.id;
    if (!connectionId) return;

    const { data } = await supabase
      .from("shopify_products")
      .select("*")
      .eq("shopify_connection_id", connectionId)
      .order("title", { ascending: true });

    const mapped = (data || []).map((p: any) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
    }));
    setProducts(mapped);
  }, [user, connection?.id]);

  const initialize = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const conn = await fetchConnection();
    if (conn) {
      await fetchProducts(conn.id);
    }
    setLoading(false);
  }, [user, fetchConnection, fetchProducts]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSync = async () => {
    if (!connection) return;
    setSyncStatus("syncing");
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "sync", connectionId: connection.id },
      });
      if (error) throw error;
      setSyncResult({ synced: data?.synced || 0, total: data?.total || 0 });
      setSyncStatus("success");
      toast.success(`Synced ${data?.synced || 0} products`);
      await fetchProducts();
    } catch (err: any) {
      setSyncStatus("error");
      toast.error(err.message || "Sync failed");
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      const { error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "disconnect", connectionId: connection.id },
      });
      if (error) throw error;
      toast.success("Store disconnected");
      setConnection(null);
      setProducts([]);
      setSelectedProduct(null);
      setViewMode("catalog");
    } catch (err: any) {
      toast.error(err.message || "Disconnect failed");
    }
  };

  const openProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setViewMode("detail");
    loadGeneratedAssets(product);
  };

  const backToCatalog = () => {
    setSelectedProduct(null);
    setViewMode("catalog");
    setGeneratedAssets([]);
    setSelectedAssets(new Set());
  };

  const loadGeneratedAssets = async (product: ShopifyProduct) => {
    if (!user) return;
    // Load generated images that reference this product's source image
    const { data } = await supabase
      .from("generated_images")
      .select("id, public_url, prompt, created_at, settings")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setGeneratedAssets((data as unknown as GeneratedAsset[]) || []);
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const selectAllAssets = () => {
    setSelectedAssets(new Set(generatedAssets.map(a => a.id)));
  };

  const clearAssetSelection = () => {
    setSelectedAssets(new Set());
  };

  // Derived data
  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))] as string[];
  const productTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))] as string[];
  const statuses = [...new Set(products.map(p => p.status))];

  const filteredProducts = products
    .filter(p => {
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (vendorFilter !== "all" && p.vendor !== vendorFilter) return false;
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "synced_at") return new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime();
      return 0;
    });

  return {
    connection, products, loading, syncStatus, syncResult,
    selectedProduct, viewMode, generatedAssets, selectedAssets,
    searchQuery, setSearchQuery, vendorFilter, setVendorFilter,
    typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    sortBy, setSortBy, vendors, productTypes, statuses,
    filteredProducts, handleSync, handleDisconnect,
    openProduct, backToCatalog, toggleAssetSelection,
    selectAllAssets, clearAssetSelection, initialize,
  };
}
