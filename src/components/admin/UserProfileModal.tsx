import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, User, Briefcase, Calendar, FileText, Hash } from 'lucide-react';

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
}

interface UserProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal = ({ user, isOpen, onClose }: UserProfileModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profile_picture || undefined} />
              <AvatarFallback>
                {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                 user.email.split('@')[0].slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.name || 'No name set'}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Account ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm">{user.account_id}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Profession
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{user.profession || 'Not specified'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{new Date(user.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Last Updated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}</p>
              </CardContent>
            </Card>
          </div>

          {user.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{user.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>User ID:</strong> <span className="font-mono">{user.id}</span></div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Name:</strong> {user.name || 'Not set'}</div>
                <div><strong>Profession:</strong> {user.profession || 'Not set'}</div>
                <div><strong>Account ID:</strong> <span className="font-mono">{user.account_id}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};