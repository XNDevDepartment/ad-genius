import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="aspect-square bg-muted animate-pulse rounded-md mb-4" />
                <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">All Generated Images</h2>
          <p className="text-muted-foreground">
            Total images: {images.length} ({images.filter(img => img.source === 'generated_images').length} generated, {images.filter(img => img.source === 'ugc_images').length} UGC)
          </p>
        </div>
        <Button onClick={fetchImages} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-square relative">
                <img
                  src={image.public_url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(image.public_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(image.public_url, image.prompt)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {image.profiles?.name || 'Unknown User'} ({image.profiles?.email})
                  </span>
                  <Badge variant={image.source === 'generated_images' ? 'default' : 'secondary'}>
                    {image.source === 'generated_images' ? 'Generated' : 'UGC'}
                  </Badge>
                  {image.public_showcase && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium mb-2 line-clamp-3">
                  {image.prompt || 'No prompt available'}
                </p>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {format(new Date(image.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  <span className="px-2 py-1 bg-muted rounded">
                    ID: {image.id.slice(0, 8)}
                  </span>
                </div>
                {image.job_id && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Job ID: {image.job_id.slice(0, 8)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {images.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No images generated yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};