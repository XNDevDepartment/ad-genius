import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, User, Video, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AdminDataTable } from './AdminDataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminVideoJob {
  id: string;
  user_id: string;
  prompt: string;
  status: 'completed' | 'processing' | 'failed' | 'queued';
  duration: number;
  video_url: string | null;
  video_path: string | null;
  image_url: string | null;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

export const AdminVideosList = () => {
  const [videos, setVideos] = useState<AdminVideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed' | 'queued'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data: videosData, error: videosError } = await supabase
        .from('kling_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Get all unique user IDs
      const userIds = [...new Set(videosData?.map(v => v.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine with profiles
      const videosWithProfiles = (videosData || []).map(video => ({
        ...video,
        status: video.status as 'completed' | 'processing' | 'failed' | 'queued',
        profiles: profilesData?.find(profile => profile.id === video.user_id) || null
      })) as AdminVideoJob[];

      setVideos(videosWithProfiles);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prompt.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: "Video downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download video",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (videoId: string) => {
    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      // Delete from storage if video_path exists
      if (video.video_path) {
        const { error: storageError } = await supabase.storage
          .from('kling-videos')
          .remove([video.video_path]);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('kling_jobs')
        .delete()
        .eq('id', videoId);

      if (dbError) throw dbError;

      toast({
        title: "Deleted",
        description: "Video deleted successfully",
      });

      // Refresh the list
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      case 'queued': return 'outline';
      default: return 'outline';
    }
  };

  const filteredVideos = filter === 'all' ? videos : videos.filter(v => v.status === filter);

  const columns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (video: AdminVideoJob) => (
        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
          {video.image_url ? (
            <img src={video.image_url} alt="Video preview" className="w-full h-full object-cover" />
          ) : (
            <Video className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'prompt',
      label: 'Prompt',
      sortable: true,
      render: (video: AdminVideoJob) => (
        <div className="max-w-xs">
          <p className="text-sm line-clamp-2">{video.prompt || 'No prompt'}</p>
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (video: AdminVideoJob) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">{video.profiles?.email || 'Unknown'}</div>
            {video.profiles?.name && (
              <div className="text-xs text-muted-foreground">{video.profiles.name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (video: AdminVideoJob) => (
        <Badge variant={getStatusColor(video.status)}>
          {video.status}
        </Badge>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (video: AdminVideoJob) => (
        <span className="text-sm">{video.duration}s</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (video: AdminVideoJob) => (
        <span className="text-sm">{format(new Date(video.created_at), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (video: AdminVideoJob) => (
        <div className="flex gap-2">
          {video.video_url && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(video.video_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(video.video_url!, video.prompt)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteId(video.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div>Loading videos...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              All Videos ({videos.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Videos</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchVideos} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {videos.filter(v => v.status === 'completed').length} completed,{' '}
            {videos.filter(v => v.status === 'processing').length} processing,{' '}
            {videos.filter(v => v.status === 'failed').length} failed
          </p>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            data={filteredVideos}
            columns={columns}
            searchPlaceholder="Search videos by prompt or user..."
            loading={loading}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
