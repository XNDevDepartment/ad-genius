
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/ui/before-after";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PublicImage {
  id: string;
  prompt: string;
  public_url: string;
  settings: {
    size: string;
    quality: string;
    numberOfImages: number;
    format: string;
  };
  created_at: string;
}

export const PublicGallery = () => {
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicImages();
  }, []);

  const loadPublicImages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('public-gallery');
      
      if (error) throw error;
      
      if (data?.images) {
        setImages(data.images);
      }
    } catch (error) {
      console.error('Failed to load public images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, imageId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ugc-showcase-${imageId}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="py-24 bg-gradient-to-br from-background via-background to-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Galeria da Comunidade
            </motion.h2>
            <motion.p 
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Descubra criações incríveis feitas pela nossa comunidade
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm animate-pulse">
                <div className="aspect-square bg-muted"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Galeria da Comunidade
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Descubra criações incríveis feitas pela nossa comunidade
          </motion.p>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="relative aspect-square overflow-hidden">
                    <BeforeAfterSlider
                      beforeImage={image.public_url}
                      afterImage={image.public_url}
                      alt={`Generated: ${image.prompt.substring(0, 50)}...`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      grayscaleBefore={true}
                      initialX={50}
                    />
                    
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                        <Eye className="h-3 w-3 mr-1" />
                        UGC
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(image.public_url, '_blank')}
                        className="bg-background/80 hover:bg-background backdrop-blur-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(image.public_url, image.id)}
                          className="bg-background/80 hover:bg-background backdrop-blur-sm"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {image.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex gap-3">
                        <span>{image.settings.size}</span>
                        <span>{image.settings.quality}</span>
                      </div>
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <Eye className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma imagem pública ainda</h3>
            <p className="text-muted-foreground">
              Seja o primeiro a compartilhar uma criação incrível!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
