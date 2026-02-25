import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, User, Briefcase, Calendar, FileText, Hash, Copy, ExternalLink, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  profession: string | null;
  account_id: string;
  description: string | null;
  profile_picture: string | null;
  created_at: string;
  updated_at: string | null;
  subscription_tier?: string;
  credits_balance?: number;
  subscribed?: boolean;
  stripe_customer_id?: string;
}

interface UserProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal = ({ user, isOpen, onClose }: UserProfileModalProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const tierColors: Record<string, string> = {
    'Pro': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'Plus': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Starter': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Founders': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Free': 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profile_picture || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                 user.email.split('@')[0].slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name || 'No name set'}</h3>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`rounded-full text-xs ${tierColors[user.subscription_tier || 'Free'] || tierColors['Free']}`}>
                  {user.subscription_tier || 'Free'}
                </Badge>
                {user.credits_balance !== undefined && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {user.credits_balance?.toFixed(0)} credits
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-muted/30 p-4">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => copyToClipboard(user.id, 'User ID')}>
                <Copy className="w-3 h-3" /> Copy User ID
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => copyToClipboard(user.email, 'Email')}>
                <Mail className="w-3 h-3" /> Copy Email
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => copyToClipboard(user.account_id, 'Account ID')}>
                <Hash className="w-3 h-3" /> Copy Account ID
              </Button>
              {(user as any).stripe_customer_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={() => window.open(`https://dashboard.stripe.com/customers/${(user as any).stripe_customer_id}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" /> Open in Stripe
                </Button>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Hash, label: 'Account ID', value: user.account_id, mono: true },
              { icon: Briefcase, label: 'Profession', value: user.profession || 'Not specified' },
              { icon: Calendar, label: 'Joined', value: new Date(user.created_at).toLocaleDateString() },
              { icon: Calendar, label: 'Last Updated', value: user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
                <p className={`text-sm font-medium ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {user.description && (
            <div className="rounded-xl bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="w-3.5 h-3.5" />
                Description
              </div>
              <p className="text-sm">{user.description}</p>
            </div>
          )}

          {/* Raw IDs */}
          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="w-3.5 h-3.5" />
              Identifiers
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div><span className="text-muted-foreground">user_id:</span> {user.id}</div>
              <div><span className="text-muted-foreground">account_id:</span> {user.account_id}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
