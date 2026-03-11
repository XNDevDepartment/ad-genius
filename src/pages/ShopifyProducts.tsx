import { useState, useEffect, useCallback } from "react";
import { Store, RefreshCw, Unlink, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShopifyConnectCard } from "@/components/shopify/ShopifyConnectCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

interface ShopifyConnection {
  id: string;
  shop_domain: string;
  connected_at: string;
}

interface ShopifyProduct {
  id: string;
  shopify_product_id: number;
  title: string;
  description: string | null;
  sku: string | null;
  vendor: string | null;
  status: string;
  image_url: string | null;
  synced_at: string;
}

export default function ShopifyProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connection, setConnection] = useState<ShopifyConnection | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch connection
    const { data: conns } = await supabase
      .from("shopify_connections")
      .select("id, shop_domain, connected_at")
      .eq("user_id", user.id)
      .limit(1);

    const conn = conns?.[0] || null;
    setConnection(conn);

    if (conn) {
      const { data: prods } = await supabase
        .from("shopify_products")
        .select("id, shopify_product_id, title, description, sku, vendor, status, image_url, synced_at")
        .eq("shopify_connection_id", conn.id)
        .order("title", { ascending: true });

      setProducts(prods || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "sync", connectionId: connection.id },
      });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} products`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
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
    } catch (err: any) {
      toast.error(err.message || "Disconnect failed");
    }
  };

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "draft") return "secondary";
    return "outline";
  };

  const stripHtml = (html: string | null) => {
    if (!html) return "—";
    const text = html.replace(/<[^>]*>/g, "");
    return text.length > 80 ? text.slice(0, 80) + "…" : text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connection) {
    return (
      <>
        <SEO title="Connect Shopify Store" description="Connect your Shopify store to sync products" path="/shopify/products" />
        <ShopifyConnectCard onConnected={fetchData} />
      </>
    );
  }

  return (
    <>
      <SEO title="Shopify Products" description="Manage your synced Shopify products" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{connection.shop_domain}</h1>
              <p className="text-sm text-muted-foreground">
                {products.length} products · Last synced {products[0]?.synced_at ? new Date(products[0].synced_at).toLocaleString() : "never"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <Unlink className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Products Table */}
        {products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No products found. Try syncing your store.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-[250px] truncate">
                      {stripHtml(p.description)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (p.image_url) {
                            navigate(`/create?shopifyImage=${encodeURIComponent(p.image_url)}`);
                          } else {
                            toast.error("No product image available");
                          }
                        }}
                      >
                        Generate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
