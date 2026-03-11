import { useState } from "react";
import { Store, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectCardProps {
  onConnected: () => void;
}

export function ShopifyConnectCard({ onConnected }: ShopifyConnectCardProps) {
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!shopDomain.trim() || !accessToken.trim()) {
      toast.error("Please fill in both fields");
      return;
    }

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "connect", shopDomain: shopDomain.trim(), accessToken: accessToken.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Connection failed");

      toast.success("Shopify store connected and products synced!");
      onConnected();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect store");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Connect Your Shopify Store</CardTitle>
        <CardDescription>
          Enter your Shopify store domain and an Admin API access token to sync your product catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shop-domain">Store Domain</Label>
          <Input
            id="shop-domain"
            placeholder="your-store.myshopify.com"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="access-token">Admin API Access Token</Label>
          <Input
            id="access-token"
            type="password"
            placeholder="shpat_..."
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Generate this in your Shopify Admin → Settings → Apps and sales channels → Develop apps.
          </p>
        </div>
        <Button onClick={handleConnect} disabled={connecting} className="w-full">
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Link className="h-4 w-4 mr-2" />
              Connect Store
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
