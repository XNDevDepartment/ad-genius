import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, ExternalLink, User, Image as ImageIcon, Archive, LayoutGrid, List } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        title: "Fetching file list",
        description: "Retrieving UGC images from storage...",
      });

      // Fetch signed URLs from the edge function
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
        throw new Error(errorData.error || 'Failed to fetch file list');
      }

      const data = await response.json();
      const files: Array<{ path: string; url: string; size: number }> = data.files || [];

      if (files.length === 0) {
        toast({
          title: "No files found",
          description: "There are no UGC images to download",
        });
        return;
      }

      toast({
        title: "Starting downloads",
        description: `Downloading ${files.length} files...`,
      });

      // Download files in batches of 3 to avoid overwhelming the browser
      let downloaded = 0;
      let failed = 0;
      const batchSize = 3;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (file) => {
            try {
              const fileResponse = await fetch(file.url);
              if (!fileResponse.ok) {
                failed++;
                return;
              }
              
              const blob = await fileResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              // Extract filename from path
              const filename = file.path.split('/').pop() || `ugc_${Date.now()}.jpg`;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              downloaded++;
            } catch (err) {
              console.error(`Failed to download ${file.path}:`, err);
              failed++;
            }
          })
        );

        // Small delay between batches to prevent browser issues
        if (i + batchSize < files.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast({
        title: "Download Complete",
        description: `Downloaded ${downloaded} files${failed > 0 ? `, ${failed} failed` : ''}`,
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

  // Additional filtering for grid view search
  const searchFilteredImages = searchQuery.trim()
    ? filteredImages.filter(img => 
        img.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredImages;

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
    <>
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
              
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
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
          {viewMode === 'table' ? (
            <AdminDataTable
              data={filteredImages}
              columns={columns}
              searchPlaceholder="Search images by prompt or user..."
              loading={loading}
            />
          ) : (
            <>
              {/* Search bar for grid view */}
              <div className="mb-4">
                <Input
                  placeholder="Search images by prompt or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              {/* Grid View */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchFilteredImages.map((image) => (
                  <div
                    key={image.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={image.public_url}
                        alt={image.prompt || 'Generated image'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium truncate">
                        {image.profiles?.name || image.profiles?.email?.split('@')[0] || 'Unknown'}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {image.source === 'generated_images' ? 'Generated' : 'UGC'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {searchFilteredImages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No images found matching your search.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Detail Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              {/* Large image preview */}
              <div className="max-h-[400px] overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                <img
                  src={selectedImage.public_url}
                  alt={selectedImage.prompt || 'Generated image'}
                  className="max-w-full max-h-[400px] object-contain"
                />
              </div>
              
              {/* Prompt section */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Prompt</h4>
                <p className="text-sm bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                  {selectedImage.prompt || 'No prompt available'}
                </p>
              </div>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">User:</span>{' '}
                  {selectedImage.profiles?.email || 'Unknown'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <Badge variant="secondary">
                    {selectedImage.source === 'generated_images' ? 'Generated' : 'UGC'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  {format(new Date(selectedImage.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedImage.public_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Original
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedImage.public_url, selectedImage.prompt)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
