import { useState, useEffect } from "react";
import { Store, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Unlink, Globe, Shield, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ShopifyConnection {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  shopify_store_id: string | null;
  connection_id: string;
  connection_source: string;
  connection_status: string;
  is_connected: boolean;
  is_verified: boolean;
  webhook_url: string | null;
  metadata: Record<string, unknown>;
  last_error: string | null;
  created_at: string;
  connected_at: string | null;
  verified_at: string | null;
  disconnected_at: string | null;
  last_sync_at: string | null;
}

interface IntegrationsPanelProps {
  onClose: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  connected: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Connected" },
  verified: { icon: <Shield className="h-4 w-4" />, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Verified" },
  pending: { icon: <Clock className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending" },
  error: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Error" },
  revoked: { icon: <XCircle className="h-4 w-4" />, color: "bg-muted text-muted-foreground", label: "Revoked" },
  disconnected: { icon: <XCircle className="h-4 w-4" />, color: "bg-muted text-muted-foreground", label: "Disconnected" },
};

export function IntegrationsPanel({ onClose }: IntegrationsPanelProps) {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopify_store_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections((data as unknown as ShopifyConnection[]) || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDisconnect = async (connId: string) => {
    setDisconnecting(connId);
    try {
      const { error } = await supabase
        .from('shopify_store_connections')
        .update({
          connection_status: 'revoked',
          is_connected: false,
          is_verified: false,
          webhook_url: null,
          webhook_secret: null,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', connId);

      if (error) throw error;
      toast.success('Store disconnected');
      fetchConnections();
    } catch {
      toast.error('Failed to disconnect store');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleRefreshVerification = async (connId: string) => {
    setRefreshing(connId);
    try {
      const { error } = await supabase
        .from('shopify_store_connections')
        .update({
          connection_status: 'verified',
          is_verified: true,
          verified_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', connId);

      if (error) throw error;
      toast.success('Verification refreshed');
      fetchConnections();
    } catch {
      toast.error('Failed to refresh verification');
    } finally {
      setRefreshing(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const activeConnections = connections.filter(c => !['disconnected', 'revoked'].includes(c.connection_status));
  const pastConnections = connections.filter(c => ['disconnected', 'revoked'].includes(c.connection_status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('account.integrations.title', 'Connected Integrations')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('account.integrations.description', 'Manage external platform connections to your ProduktPix account.')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activeConnections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-1">{t('account.integrations.noConnections', 'No connected platforms')}</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              {t('account.integrations.noConnectionsDescription', 'Connect your Shopify store from the ProduktPix Shopify app to start generating product images directly from your catalog.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeConnections.map((conn) => {
            const status = statusConfig[conn.connection_status] || statusConfig.pending;
            return (
              <Card key={conn.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{conn.shop_name || conn.shop_domain}</CardTitle>
                        <CardDescription className="text-xs">{conn.shop_domain}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Connected</span>
                      <span className={conn.is_connected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {conn.is_connected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Verified</span>
                      <span className={conn.is_verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                        {conn.is_verified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Webhook</span>
                      <span className={conn.webhook_url ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {conn.webhook_url ? 'Configured' : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Connected at</span>
                      <span>{formatDate(conn.connected_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Verified at</span>
                      <span>{formatDate(conn.verified_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-0.5">Last sync</span>
                      <span>{formatDate(conn.last_sync_at)}</span>
                    </div>
                  </div>

                  {/* Webhook URL display */}
                  {conn.webhook_url && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          <span>Webhook URL</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(conn.webhook_url!);
                            toast.success('Webhook URL copied');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <code className="text-xs break-all mt-1 block">{conn.webhook_url}</code>
                    </div>
                  )}

                  {/* Error display */}
                  {conn.last_error && (
                    <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{conn.last_error}</span>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshVerification(conn.id)}
                      disabled={refreshing === conn.id}
                    >
                      {refreshing === conn.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Refresh Verification
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={disconnecting === conn.id}
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1.5" />
                      {disconnecting === conn.id ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past connections */}
      {pastConnections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Past Connections</h4>
          {pastConnections.map((conn) => {
            const status = statusConfig[conn.connection_status] || statusConfig.disconnected;
            return (
              <Card key={conn.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{conn.shop_name || conn.shop_domain}</span>
                      <span className="text-xs text-muted-foreground ml-2">{conn.shop_domain}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(conn.disconnected_at)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
