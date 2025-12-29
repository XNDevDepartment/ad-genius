import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, User, Image as ImageIcon, Archive } from 'lucide-react';
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

interface GeneratedImage {
  id: string;
  prompt: string;
  public_url: string;
  created_at: string;
  user_id: string;
  settings?: any;
  source: 'generated_images' | 'ugc_images';
  job_id?: string;
  public_showcase?: boolean;
  profiles: {
    name: string;
    email: string;
  } | null;
}

export const AdminImagesList = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'generated_images' | 'ugc_images'>('all');
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      // Fetch from both tables
      const [generatedResponse, ugcResponse] = await Promise.all([
        supabase
          .from('generated_images')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('ugc_images')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (generatedResponse.error) throw generatedResponse.error;
      if (ugcResponse.error) throw ugcResponse.error;

      // Add source identifier to each image
      const generatedImages = (generatedResponse.data || []).map(img => ({
        ...img,
        source: 'generated_images' as const
      }));

      const ugcImages = (ugcResponse.data || []).map(img => ({
        ...img,
        source: 'ugc_images' as const
      }));

      // Combine and sort by created_at
      const allImages = [...generatedImages, ...ugcImages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Get all unique user IDs
      const userIds = [...new Set(allImages.map(img => img.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine with profiles
      const imagesWithProfiles = allImages.map(image => ({
        ...image,
        profiles: profilesData?.find(profile => profile.id === image.user_id) || null
      }));

      setImages(imagesWithProfiles);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error",
        description: "Failed to fetch images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prompt.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
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

  const handleDownloadAllUgc = async () => {
    setDownloadingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      toast({
        title: "Starting Download",
        description: "Preparing UGC images for download. This may take a while...",
      });

      const response = await fetch(
        'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/download_all_ugc_images',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ugc_images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Complete",
        description: "UGC images have been downloaded",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download images",
        variant: "destructive",
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  const filteredImages = filter === 'all' ? images : images.filter(img => img.source === filter);

  const columns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (image: GeneratedImage) => (
        <img
          src={image.public_url}
          alt={image.prompt}
          className="w-16 h-16 object-cover rounded"
        />
      ),
    },
    {
      key: 'prompt',
      label: 'Prompt',
      sortable: true,
      render: (image: GeneratedImage) => (
        <div className="max-w-xs">
          <p className="text-sm line-clamp-2">{image.prompt || 'No prompt'}</p>
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (image: GeneratedImage) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">{image.profiles?.email || 'Unknown'}</div>
            {image.profiles?.name && (
              <div className="text-xs text-muted-foreground">{image.profiles.name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'source',
      label: 'Type',
      sortable: true,
      render: (image: GeneratedImage) => (
        <Badge variant={image.source === 'generated_images' ? 'default' : 'secondary'}>
          {image.source === 'generated_images' ? 'Generated' : 'UGC'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (image: GeneratedImage) => (
        <span className="text-sm">{format(new Date(image.created_at), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (image: GeneratedImage) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(image.public_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(image.public_url, image.prompt)}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div>Loading images...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            All Generated Images ({images.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Images</SelectItem>
                <SelectItem value="generated_images">Generated</SelectItem>
                <SelectItem value="ugc_images">UGC</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchImages} variant="outline" size="sm">
              Refresh
            </Button>
            <Button
              onClick={handleDownloadAllUgc}
              variant="outline"
              size="sm"
              disabled={downloadingAll}
            >
              <Archive className="w-4 h-4 mr-2" />
              {downloadingAll ? 'Downloading...' : 'Download All UGC'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {images.filter(img => img.source === 'generated_images').length} generated,{' '}
          {images.filter(img => img.source === 'ugc_images').length} UGC
        </p>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={filteredImages}
          columns={columns}
          searchPlaceholder="Search images by prompt or user..."
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};