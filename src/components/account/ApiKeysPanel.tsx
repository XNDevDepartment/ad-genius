import { useState, useEffect } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertTriangle, Check, Globe, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  rate_limit_tier: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  webhook_url: string | null;
}

interface ApiKeysPanelProps {
  onClose?: () => void;
}

export const ApiKeysPanel = ({ onClose }: ApiKeysPanelProps) => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showWebhookDialog, setShowWebhookDialog] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState({
    ugc: true,
    video: true,
    fashion_catalog: true,
    product_background: true
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const permissions = Object.entries(newKeyPermissions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      const { data, error } = await supabase.functions.invoke('api-keys', {
        body: { 
          action: 'create',
          name: newKeyName.trim(),
          permissions
        }
      });

      if (error) throw error;

      setNewlyCreatedKey(data.api_key);
      setNewKeyName("");
      setNewKeyPermissions({ ugc: true, video: true, fashion_catalog: true });
      fetchApiKeys();
      
      toast({
        title: "API Key Created",
        description: "Your new API key has been created. Make sure to copy it now!"
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'delete', key_id: keyId }
      });

      if (error) throw error;

      fetchApiKeys();
      setShowDeleteDialog(null);
      
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted"
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive"
      });
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'revoke', key_id: keyId }
      });

      if (error) throw error;

      fetchApiKeys();
      
      toast({
        title: "API Key Revoked",
        description: "The API key has been deactivated"
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive"
      });
    }
  };

  const handleSetWebhook = async (keyId: string) => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive"
      });
      return;
    }

    setSavingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'setWebhook', key_id: keyId, webhook_url: webhookUrl.trim() }
      });

      if (error) throw error;

      setWebhookSecret(data.webhook_secret);
      fetchApiKeys();
      
      toast({
        title: "Webhook Configured",
        description: "Copy the webhook secret now - it won't be shown again!"
      });
    } catch (error: any) {
      console.error('Error setting webhook:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to set webhook",
        variant: "destructive"
      });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleRemoveWebhook = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'removeWebhook', key_id: keyId }
      });

      if (error) throw error;

      fetchApiKeys();
      setShowWebhookDialog(null);
      setWebhookUrl("");
      setWebhookSecret(null);
      
      toast({
        title: "Webhook Removed",
        description: "The webhook has been removed"
      });
    } catch (error) {
      console.error('Error removing webhook:', error);
      toast({
        title: "Error",
        description: "Failed to remove webhook",
        variant: "destructive"
      });
    }
  };

  const handleTestWebhook = async (keyId: string) => {
    setTestingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-keys', {
        body: { action: 'testWebhook', key_id: keyId }
      });

      if (error) throw error;

      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Error",
        description: "Failed to send test webhook",
        variant: "destructive"
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({
      title: "Copied!",
      description: "Copied to clipboard"
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getPermissionBadges = (permissions: string[]) => {
    const labels: Record<string, string> = {
      ugc: 'UGC Images',
      video: 'Video',
      fashion_catalog: 'Fashion'
    };
    
    return permissions.map(p => (
      <Badge key={p} variant="secondary" className="text-xs">
        {labels[p] || p}
      </Badge>
    ));
  };

  const openWebhookDialog = (key: ApiKey) => {
    setWebhookUrl(key.webhook_url || "");
    setWebhookSecret(null);
    setShowWebhookDialog(key.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to Genius UGC
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to access Genius UGC programmatically.
              </DialogDescription>
            </DialogHeader>
            
            {newlyCreatedKey ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This is your API key. Copy it now - you won't be able to see it again!
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2">
                  <Input 
                    value={newlyCreatedKey} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                  >
                    {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setNewlyCreatedKey(null);
                    setShowCreateDialog(false);
                  }}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="perm-ugc"
                          checked={newKeyPermissions.ugc}
                          onCheckedChange={(checked) => 
                            setNewKeyPermissions(p => ({ ...p, ugc: !!checked }))
                          }
                        />
                        <Label htmlFor="perm-ugc" className="text-sm">UGC Images</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="perm-video"
                          checked={newKeyPermissions.video}
                          onCheckedChange={(checked) => 
                            setNewKeyPermissions(p => ({ ...p, video: !!checked }))
                          }
                        />
                        <Label htmlFor="perm-video" className="text-sm">Image Animator (Video)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="perm-fashion"
                          checked={newKeyPermissions.fashion_catalog}
                          onCheckedChange={(checked) => 
                            setNewKeyPermissions(p => ({ ...p, fashion_catalog: !!checked }))
                          }
                        />
                        <Label htmlFor="perm-fashion" className="text-sm">Fashion Catalog</Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={creating}>
                    {creating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading API keys...
        </div>
      ) : apiKeys.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No API Keys</h4>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Create an API key to start using Genius UGC programmatically. 
              Check the API documentation for usage examples.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className={!key.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{key.name}</h4>
                      {!key.is_active && (
                        <Badge variant="destructive" className="text-xs">Revoked</Badge>
                      )}
                      {key.webhook_url && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Webhook
                        </Badge>
                      )}
                    </div>
                    <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {key.key_prefix}
                    </code>
                    <div className="flex flex-wrap gap-1">
                      {getPermissionBadges(key.permissions)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(key.created_at)} · 
                      Last used: {formatDate(key.last_used_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {key.is_active && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWebhookDialog(key)}
                          title="Configure Webhook"
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeKey(key.id)}
                          title="Revoke Key"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteDialog(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          API keys provide full access to your account. Keep them secure and never share them in public repositories or client-side code.
        </AlertDescription>
      </Alert>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any applications using this key will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showDeleteDialog && handleDeleteKey(showDeleteDialog)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Webhook Configuration Dialog */}
      <Dialog open={!!showWebhookDialog} onOpenChange={() => {
        setShowWebhookDialog(null);
        setWebhookUrl("");
        setWebhookSecret(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Webhook</DialogTitle>
            <DialogDescription>
              Receive notifications when your API jobs complete or fail.
            </DialogDescription>
          </DialogHeader>
          
          {webhookSecret ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This is your webhook secret for signature verification. Copy it now - it won't be shown again!
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input 
                  value={webhookSecret} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => copyToClipboard(webhookSecret)}
                >
                  {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setShowWebhookDialog(null);
                  setWebhookUrl("");
                  setWebhookSecret(null);
                }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL (HTTPS required)</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://your-server.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
                
                {apiKeys.find(k => k.id === showWebhookDialog)?.webhook_url && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => showWebhookDialog && handleTestWebhook(showWebhookDialog)}
                      disabled={testingWebhook}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testingWebhook ? "Sending..." : "Send Test"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => showWebhookDialog && handleRemoveWebhook(showWebhookDialog)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Webhook
                    </Button>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowWebhookDialog(null);
                  setWebhookUrl("");
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => showWebhookDialog && handleSetWebhook(showWebhookDialog)} 
                  disabled={savingWebhook}
                >
                  {savingWebhook ? "Saving..." : "Save Webhook"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
