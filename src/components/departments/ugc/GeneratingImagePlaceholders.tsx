
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";
import './../../../costumn.css';
import ImageGallery from "@/components/ImageGallery";


interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}

interface GeneratingImagePlaceholdersProps {
  numberOfImages: number;
  isGenerating?: boolean;
  images: GeneratedImage[];
  onImageSelect: (imageId: string) => void;
}

export const GeneratingImagePlaceholders = ({
  numberOfImages,
  isGenerating = true,
  images = [],
  onImageSelect
}: GeneratingImagePlaceholdersProps) => {

  return (
    <div id="generating-images" className="scroll-mt-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Generating Images
          </CardTitle>
          <CardDescription>
            AI is creating your UGC content...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Always show the grid layout to maintain consistent sizing */}
          <ImageGallery
            images={images}
            totalSlots={numberOfImages}     // from job.settings.number
            isGenerating={isGenerating}
            onImageSelect={onImageSelect}
          />
        </CardContent>
      </Card>
    </div>
  );
};
