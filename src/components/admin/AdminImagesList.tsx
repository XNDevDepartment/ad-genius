import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface GeneratedImage {
  id: string;
  prompt: string;
  public_url: string;
  created_at: string;
  user_id: string;
  settings: any;
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
      // First get images
      const { data: imagesData, error: imagesError } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (imagesError) throw imagesError;

      // Then get profiles for each user
      const userIds = [...new Set(imagesData?.map(img => img.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const imagesWithProfiles = imagesData?.map(image => ({
        ...image,
        profiles: profilesData?.find(profile => profile.id === image.user_id) || null
      })) || [];

      setImages(imagesWithProfiles);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error",
        description: "Failed to fetch generated images",
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
          <h2 className="text-2xl font-bold">Generated Images</h2>
          <p className="text-muted-foreground">
            Total images: {images.length}
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
                </div>
                
                <p className="text-sm font-medium mb-2 line-clamp-3">
                  {image.prompt}
                </p>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {format(new Date(image.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  <span className="px-2 py-1 bg-muted rounded">
                    ID: {image.id.slice(0, 8)}
                  </span>
                </div>
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