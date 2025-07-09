import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, UserProfile } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Loader, User } from 'lucide-react';

interface ProfileProps {
  onBack: () => void;
}

export const Profile = ({ onBack }: ProfileProps) => {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    description: '',
    profile_picture: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } else if (data) {
        setProfile(data);
        setFormData({
          name: data.name || '',
          profession: data.profession || '',
          description: data.description || '',
          profile_picture: data.profile_picture || '',
        });
      } else {
        // Create initial profile
        await createInitialProfile();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInitialProfile = async () => {
    if (!user) return;

    const now = new Date().toISOString();
    const initialProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || '',
      profession: user.user_metadata?.profession || '',
      account_id: user.user_metadata?.account_id || `ACC${Date.now()}`,
      description: '',
      profile_picture: '',
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase
      .from('profiles')
      .insert([initialProfile]);

    if (!error) {
      setProfile(initialProfile);
      setFormData({
        name: initialProfile.name,
        profession: initialProfile.profession,
        description: initialProfile.description,
        profile_picture: initialProfile.profile_picture,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          profession: formData.profession,
          description: formData.description,
          profile_picture: formData.profile_picture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update profile');
      } else {
        // Update auth metadata
        await updateProfile({
          name: formData.name,
          profession: formData.profession,
        });
        
        toast.success('Profile updated successfully!');
        await fetchProfile();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.profile_picture} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-6 w-6"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <CardTitle>{profile?.name || 'No name set'}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
                <p className="text-sm text-muted-foreground">ID: {profile?.account_id}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  placeholder="e.g., Designer, Developer, Marketer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile_picture">Profile Picture URL</Label>
                <Input
                  id="profile_picture"
                  value={formData.profile_picture}
                  onChange={(e) => setFormData({ ...formData, profile_picture: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
