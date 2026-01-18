import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, User, Shirt, Trash2, Camera, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface AdminOutfitSwapJob {
  id: string;
  user_id: string;
  status: 'completed' | 'processing' | 'failed' | 'queued';
  progress: number;
  base_model_id: string | null;
  total_garments: number;
  completed_garments: number;
  created_at: string;
  batch_id: string | null;
  profiles: {
    name: string;
    email: string;
  } | null;
  result?: {
    id: string;
    public_url: string;
    storage_path: string;
  } | null;
}

interface AdminPhotoshoot {
  id: string;
  user_id: string;
  result_id: string;
  status: 'completed' | 'processing' | 'failed' | 'queued';
  progress: number | null;
  image_1_url: string | null;
  image_2_url: string | null;
  image_3_url: string | null;
  image_4_url: string | null;
  back_image_url: string | null;
  selected_angles: string[] | null;
  created_at: string;
  finished_at: string | null;
  profiles: {
    name: string;
    email: string;
  } | null;
  result?: {
    public_url: string;
  } | null;
}

export const AdminOutfitSwapsList = () => {
  const [jobs, setJobs] = useState<AdminOutfitSwapJob[]>([]);
  const [photoshoots, setPhotoshoots] = useState<AdminPhotoshoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoshootsLoading, setPhotoshootsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed' | 'queued'>('all');
  const [photoshootFilter, setPhotoshootFilter] = useState<'all' | 'completed' | 'processing' | 'failed' | 'queued'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePhotoshootId, setDeletePhotoshootId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('swaps');

  useEffect(() => {
    fetchOutfitSwaps();
    fetchPhotoshoots();
  }, []);

  const fetchOutfitSwaps = async () => {
    try {
      setLoading(true);
      const { data: jobsData, error: jobsError } = await supabase
        .from('outfit_swap_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Get results for all jobs
      const jobIds = jobsData?.map(j => j.id) || [];
      const { data: resultsData, error: resultsError } = await supabase
        .from('outfit_swap_results')
        .select('id, job_id, public_url, storage_path')
        .in('job_id', jobIds);

      if (resultsError) throw resultsError;

      // Get all unique user IDs
      const userIds = [...new Set(jobsData?.map(j => j.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine jobs with results and profiles
      const jobsWithData = (jobsData || []).map(job => ({
        ...job,
        status: job.status as 'completed' | 'processing' | 'failed' | 'queued',
        profiles: profilesData?.find(profile => profile.id === job.user_id) || null,
        result: resultsData?.find(result => result.job_id === job.id) || null
      })) as AdminOutfitSwapJob[];

      setJobs(jobsWithData);
    } catch (error) {
      console.error('Error fetching outfit swaps:', error);
      toast({
        title: "Error",
        description: "Failed to fetch outfit swaps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotoshoots = async () => {
    try {
      setPhotoshootsLoading(true);
      const { data: photoshootsData, error: photoshootsError } = await supabase
        .from('outfit_swap_photoshoots')
        .select('*')
        .order('created_at', { ascending: false });

      if (photoshootsError) throw photoshootsError;

      // Get all unique user IDs and result IDs
      const userIds = [...new Set(photoshootsData?.map(p => p.user_id) || [])];
      const resultIds = [...new Set(photoshootsData?.map(p => p.result_id) || [])];

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch results for previews
      const { data: resultsData, error: resultsError } = await supabase
        .from('outfit_swap_results')
        .select('id, public_url')
        .in('id', resultIds);

      if (resultsError) throw resultsError;

      // Combine photoshoots with profiles and results
      const photoshootsWithData = (photoshootsData || []).map(ps => ({
        ...ps,
        status: ps.status as 'completed' | 'processing' | 'failed' | 'queued',
        profiles: profilesData?.find(profile => profile.id === ps.user_id) || null,
        result: resultsData?.find(result => result.id === ps.result_id) || null
      })) as AdminPhotoshoot[];

      setPhotoshoots(photoshootsWithData);
    } catch (error) {
      console.error('Error fetching photoshoots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch photoshoots",
        variant: "destructive",
      });
    } finally {
      setPhotoshootsLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, id: string, prefix: string = 'outfit_swap') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}_${id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      // Delete results from storage if they exist
      if (job.result?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('outfit-swap-results')
          .remove([job.result.storage_path]);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Delete results from database
      const { error: resultsError } = await supabase
        .from('outfit_swap_results')
        .delete()
        .eq('job_id', jobId);

      if (resultsError) {
        console.error('Results deletion error:', resultsError);
      }

      // Delete job from database
      const { error: jobError } = await supabase
        .from('outfit_swap_jobs')
        .delete()
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast({
        title: "Deleted",
        description: "Outfit swap deleted successfully",
      });

      // Refresh the list
      fetchOutfitSwaps();
    } catch (error) {
      console.error('Error deleting outfit swap:', error);
      toast({
        title: "Error",
        description: "Failed to delete outfit swap",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleDeletePhotoshoot = async (photoshootId: string) => {
    try {
      const { error } = await supabase
        .from('outfit_swap_photoshoots')
        .delete()
        .eq('id', photoshootId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Photoshoot deleted successfully",
      });

      fetchPhotoshoots();
    } catch (error) {
      console.error('Error deleting photoshoot:', error);
      toast({
        title: "Error",
        description: "Failed to delete photoshoot",
        variant: "destructive",
      });
    } finally {
      setDeletePhotoshootId(null);
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

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const filteredPhotoshoots = photoshootFilter === 'all' ? photoshoots : photoshoots.filter(p => p.status === photoshootFilter);

  const swapColumns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (job: AdminOutfitSwapJob) => (
        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
          {job.result?.public_url ? (
            <img src={job.result.public_url} alt="Outfit swap result" className="w-full h-full object-cover" />
          ) : (
            <Shirt className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (job: AdminOutfitSwapJob) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">{job.profiles?.email || 'Unknown'}</div>
            {job.profiles?.name && (
              <div className="text-xs text-muted-foreground">{job.profiles.name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (job: AdminOutfitSwapJob) => (
        <Badge variant={getStatusColor(job.status)}>
          {job.status}
        </Badge>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (job: AdminOutfitSwapJob) => (
        <div className="text-sm">
          {job.status === 'processing' ? (
            <span>{job.progress}%</span>
          ) : job.status === 'completed' ? (
            <span>{job.completed_garments}/{job.total_garments} items</span>
          ) : (
            <span>-</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (job: AdminOutfitSwapJob) => (
        <Badge variant="outline">
          {job.batch_id ? 'Batch' : 'Single'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (job: AdminOutfitSwapJob) => (
        <span className="text-sm">{format(new Date(job.created_at), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (job: AdminOutfitSwapJob) => (
        <div className="flex gap-2">
          {job.result?.public_url && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(job.result!.public_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(job.result!.public_url, job.id)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteId(job.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const photoshootColumns = [
    {
      key: 'source',
      label: 'Source',
      render: (ps: AdminPhotoshoot) => (
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
          {ps.result?.public_url ? (
            <img src={ps.result.public_url} alt="Source" className="w-full h-full object-cover" />
          ) : (
            <Shirt className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'images',
      label: 'Generated Images',
      render: (ps: AdminPhotoshoot) => {
        const images = [ps.image_1_url, ps.image_2_url, ps.image_3_url, ps.image_4_url, ps.back_image_url].filter(Boolean);
        return (
          <div className="flex gap-1">
            {images.length > 0 ? (
              images.slice(0, 4).map((url, idx) => (
                <div key={idx} className="w-10 h-10 bg-muted rounded overflow-hidden">
                  <img src={url!} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No images yet</span>
            )}
            {images.length > 4 && (
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                +{images.length - 4}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'user',
      label: 'User',
      render: (ps: AdminPhotoshoot) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">{ps.profiles?.email || 'Unknown'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (ps: AdminPhotoshoot) => (
        <Badge variant={getStatusColor(ps.status)}>
          {ps.status}
        </Badge>
      ),
    },
    {
      key: 'angles',
      label: 'Angles',
      render: (ps: AdminPhotoshoot) => (
        <span className="text-sm">
          {ps.selected_angles?.join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (ps: AdminPhotoshoot) => (
        <span className="text-sm">{format(new Date(ps.created_at), 'MMM dd, yyyy HH:mm')}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ps: AdminPhotoshoot) => (
        <div className="flex gap-2">
          {ps.image_1_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(ps.image_1_url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeletePhotoshootId(ps.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading && photoshootsLoading) {
    return <div>Loading outfit swaps...</div>;
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="swaps" className="gap-2">
            <Shirt className="w-4 h-4" />
            Outfit Swaps ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="photoshoots" className="gap-2">
            <Camera className="w-4 h-4" />
            Photoshoots ({photoshoots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swaps">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="w-5 h-5" />
                  All Outfit Swaps ({jobs.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Swaps</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchOutfitSwaps} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {jobs.filter(j => j.status === 'completed').length} completed,{' '}
                {jobs.filter(j => j.status === 'processing').length} processing,{' '}
                {jobs.filter(j => j.status === 'failed').length} failed
              </p>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                data={filteredJobs}
                columns={swapColumns}
                searchPlaceholder="Search outfit swaps by user..."
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photoshoots">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  All Photoshoots ({photoshoots.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={photoshootFilter} onValueChange={(value: any) => setPhotoshootFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Photoshoots</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchPhotoshoots} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {photoshoots.filter(p => p.status === 'completed').length} completed,{' '}
                {photoshoots.filter(p => p.status === 'processing').length} processing,{' '}
                {photoshoots.filter(p => p.status === 'failed').length} failed
              </p>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                data={filteredPhotoshoots}
                columns={photoshootColumns}
                searchPlaceholder="Search photoshoots by user..."
                loading={photoshootsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Outfit Swap</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this outfit swap? This action cannot be undone and will remove all associated results.
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

      <AlertDialog open={deletePhotoshootId !== null} onOpenChange={() => setDeletePhotoshootId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photoshoot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photoshoot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePhotoshootId && handleDeletePhotoshoot(deletePhotoshootId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
