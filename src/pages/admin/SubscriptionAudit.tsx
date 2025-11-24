import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubscriberIssue {
  user_id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string;
  credits_balance: number;
  stripe_customer_id: string | null;
  subscription_end: string | null;
  last_reset_at: string | null;
  created_at: string;
  issue_type: 'has_stripe_not_subscribed' | 'subscribed_no_stripe' | 'credit_mismatch' | 'expired';
  issue_description: string;
}

interface FixData {
  subscribed: boolean;
  subscription_tier: string;
  credits_to_add: number;
}

const SubscriptionAudit = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [issues, setIssues] = useState<SubscriberIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingUser, setFixingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SubscriberIssue | null>(null);
  const [fixData, setFixData] = useState<FixData>({
    subscribed: true,
    subscription_tier: 'Starter',
    credits_to_add: 80
  });

  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadIssues();
    }
  }, [isAdmin]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const issuesFound: SubscriberIssue[] = [];
      const tierCredits: Record<string, number> = {
        Free: 10,
        Starter: 80,
        Founders: 80,
        Plus: 200,
        Pro: 400
      };

      data?.forEach((sub) => {
        // Issue 1: Has Stripe customer but not subscribed
        if (sub.stripe_customer_id && !sub.subscribed && sub.subscription_tier === 'Free') {
          issuesFound.push({
            ...sub,
            issue_type: 'has_stripe_not_subscribed',
            issue_description: 'Has Stripe customer ID but not marked as subscribed'
          });
        }
        
        // Issue 2: Subscribed but no Stripe customer
        else if (sub.subscribed && !sub.stripe_customer_id) {
          issuesFound.push({
            ...sub,
            issue_type: 'subscribed_no_stripe',
            issue_description: 'Marked as subscribed but no Stripe customer ID'
          });
        }
        
        // Issue 3: Credit balance doesn't match tier
        else if (sub.subscription_tier in tierCredits) {
          const expectedCredits = tierCredits[sub.subscription_tier];
          const actualCredits = parseFloat(sub.credits_balance.toString());
          
          // Allow some variance for used credits, but flag if way off
          if (actualCredits < expectedCredits * 0.5 && sub.last_reset_at) {
            const lastReset = new Date(sub.last_reset_at);
            const daysSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
            
            // Only flag if reset was recent (within 7 days) but credits are very low
            if (daysSinceReset < 7) {
              issuesFound.push({
                ...sub,
                issue_type: 'credit_mismatch',
                issue_description: `Credits (${actualCredits}) unusually low for ${sub.subscription_tier} tier (expected ~${expectedCredits})`
              });
            }
          }
        }

        // Issue 4: Subscription ended but still marked as active
        if (sub.subscribed && sub.subscription_end) {
          const endDate = new Date(sub.subscription_end);
          if (endDate < new Date()) {
            issuesFound.push({
              ...sub,
              issue_type: 'expired',
              issue_description: 'Subscription expired but still marked as active'
            });
          }
        }
      });

      setIssues(issuesFound);
    } catch (error) {
      console.error('Error loading subscription issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription issues',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openFixDialog = (issue: SubscriberIssue) => {
    setSelectedUser(issue);
    
    // Pre-fill with suggested fixes based on issue type
    if (issue.issue_type === 'has_stripe_not_subscribed') {
      setFixData({
        subscribed: true,
        subscription_tier: 'Starter',
        credits_to_add: 80
      });
    } else if (issue.issue_type === 'subscribed_no_stripe') {
      setFixData({
        subscribed: false,
        subscription_tier: 'Free',
        credits_to_add: 10 - parseFloat(issue.credits_balance.toString())
      });
    } else if (issue.issue_type === 'expired') {
      setFixData({
        subscribed: false,
        subscription_tier: 'Free',
        credits_to_add: 0
      });
    }
  };

  const applyFix = async () => {
    if (!selectedUser) return;

    setFixingUser(selectedUser.user_id);
    try {
      // Update subscriber
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          subscribed: fixData.subscribed,
          subscription_tier: fixData.subscription_tier,
          credits_balance: parseFloat(selectedUser.credits_balance.toString()) + fixData.credits_to_add,
          last_reset_at: fixData.subscribed ? new Date().toISOString() : selectedUser.last_reset_at,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedUser.user_id);

      if (updateError) throw updateError;

      // Record transaction if credits changed
      if (fixData.credits_to_add !== 0) {
        const { error: txError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: selectedUser.user_id,
            amount: fixData.credits_to_add,
            reason: `Manual fix - ${selectedUser.issue_description}`,
            metadata: {
              fixed_by: user?.id,
              previous_balance: selectedUser.credits_balance,
              issue_type: selectedUser.issue_type
            }
          });

        if (txError) throw txError;
      }

      toast({
        title: 'Success',
        description: `Fixed subscription for ${selectedUser.email}`
      });

      setSelectedUser(null);
      loadIssues(); // Reload issues
    } catch (error) {
      console.error('Error fixing subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix subscription',
        variant: 'destructive'
      });
    } finally {
      setFixingUser(null);
    }
  };

  const getIssueBadge = (type: SubscriberIssue['issue_type']) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      has_stripe_not_subscribed: { variant: 'destructive', icon: AlertCircle },
      subscribed_no_stripe: { variant: 'destructive', icon: AlertCircle },
      credit_mismatch: { variant: 'default', icon: AlertCircle },
      expired: { variant: 'secondary', icon: AlertCircle }
    };

    const { variant, icon: Icon } = variants[type];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </div>
            <h1 className="text-3xl font-bold">Subscription Audit</h1>
            <p className="text-muted-foreground">
              Find and fix discrepancies between Stripe and database
            </p>
          </div>
          <Button onClick={loadIssues} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{issues.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Critical (Not Activated)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {issues.filter(i => i.issue_type === 'has_stripe_not_subscribed').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Credit Mismatches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {issues.filter(i => i.issue_type === 'credit_mismatch').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Issues</CardTitle>
            <CardDescription>
              Users with potential subscription problems
            </CardDescription>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No subscription issues found!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.user_id}>
                      <TableCell className="font-medium">{issue.email}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getIssueBadge(issue.issue_type)}
                          <p className="text-xs text-muted-foreground">{issue.issue_description}</p>
                        </div>
                      </TableCell>
                      <TableCell>{issue.subscription_tier}</TableCell>
                      <TableCell>{issue.credits_balance}</TableCell>
                      <TableCell>
                        {issue.stripe_customer_id ? (
                          <a
                            href={`https://dashboard.stripe.com/customers/${issue.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline text-xs"
                          >
                            View in Stripe
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openFixDialog(issue)}
                          disabled={fixingUser === issue.user_id}
                        >
                          {fixingUser === issue.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Fix'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fix Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Subscription</DialogTitle>
            <DialogDescription>
              Adjust subscription settings for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <p className="text-sm text-muted-foreground">
                {selectedUser?.issue_description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_tier">Subscription Tier</Label>
              <Select
                value={fixData.subscription_tier}
                onValueChange={(value) => setFixData({ ...fixData, subscription_tier: value })}
              >
                <SelectTrigger id="subscription_tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Plus">Plus</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Founders">Founders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscribed">Subscribed Status</Label>
              <Select
                value={fixData.subscribed.toString()}
                onValueChange={(value) => setFixData({ ...fixData, subscribed: value === 'true' })}
              >
                <SelectTrigger id="subscribed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits_to_add">Credits to Add/Remove</Label>
              <Input
                id="credits_to_add"
                type="number"
                value={fixData.credits_to_add}
                onChange={(e) => setFixData({ ...fixData, credits_to_add: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Current: {selectedUser?.credits_balance} → New: {(parseFloat(selectedUser?.credits_balance.toString() || '0') + fixData.credits_to_add).toFixed(2)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={applyFix} disabled={!!fixingUser}>
              {fixingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                'Apply Fix'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionAudit;
