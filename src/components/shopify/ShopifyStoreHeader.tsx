import { Store, RefreshCw, Unlink, CheckCircle, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ShopifyConnection, SyncStatus } from "@/hooks/useShopifyDashboard";

interface Props {
  connection: ShopifyConnection;
  productCount: number;
  syncStatus: SyncStatus;
  onSync: () => void;
  onDisconnect: () => void;
}

export function ShopifyStoreHeader({ connection, productCount, syncStatus, onSync, onDisconnect }: Props) {
  return (
    <Card className="border-0 bg-muted/30">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Store identity */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">
                  {connection.shop_name || connection.shop_domain}
                </h2>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                {connection.is_verified && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5 flex-wrap">
                {connection.shop_name && (
                  <>
                    <span>{connection.shop_domain}</span>
                    <span>·</span>
                  </>
                )}
                <span>{productCount} products</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Connected {new Date(connection.connected_at).toLocaleDateString()}
                </span>
                {connection.last_sync_at && (
                  <>
                    <span>·</span>
                    <span>Last sync {new Date(connection.last_sync_at).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSync} disabled={syncStatus === "syncing"}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              {syncStatus === "syncing" ? "Syncing…" : "Sync Products"}
            </Button>
            <Button variant="outline" size="sm" onClick={onDisconnect} className="text-destructive hover:text-destructive">
              <Unlink className="h-4 w-4 mr-1.5" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Sync status bar */}
        {syncStatus === "syncing" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Syncing products from Shopify…
          </div>
        )}
        {syncStatus === "error" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Sync failed. Please try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
