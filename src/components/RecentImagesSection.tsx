import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentImages } from "@/hooks/useRecentImages";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowRight } from "lucide-react";

export const RecentImagesSection = () => {
  const { images, loading, error } = useRecentImages(10);
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Recent Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Recent Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Failed to load recent images
          </p>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Recent Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No images created yet</p>
            <Button onClick={() => navigate("/create/ugc")} variant="default">
              Create Your First Image
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Recent Images
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/library")}
          className="text-primary hover:text-primary/80"
        >
          View all
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {images.slice(0, 5).map((image) => (
            <div
              key={image.id}
              className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => navigate("/library")}
            >
              <img
                src={image.url}
                alt={image.prompt || "Generated image"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {images.length > 5 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => navigate("/library")}
              className="w-full"
            >
              View all {images.length} images
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};