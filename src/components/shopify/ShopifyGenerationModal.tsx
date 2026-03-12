import { useState } from "react";
import { ImagePlus, Palette, Users, Camera, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ShopifyProduct } from "@/hooks/useShopifyDashboard";

export type GenerationType = "background" | "ugc" | "fashion";

interface Props {
  open: boolean;
  onClose: () => void;
  product: ShopifyProduct;
  generationType: GenerationType;
  onGenerate: (settings: GenerationSettings) => void;
  generating: boolean;
}

export interface GenerationSettings {
  type: GenerationType;
  prompt: string;
  aspectRatio: string;
  numberOfImages: number;
  productImageUrl: string;
  productTitle: string;
}

const typeConfig: Record<GenerationType, { icon: React.ReactNode; title: string; description: string; defaultPrompt: string }> = {
  background: {
    icon: <Palette className="h-5 w-5" />,
    title: "Change Background",
    description: "Place your product on a new background scene",
    defaultPrompt: "Professional product photo on a clean white marble surface with soft natural lighting",
  },
  ugc: {
    icon: <Users className="h-5 w-5" />,
    title: "Generate UGC Images",
    description: "Create lifestyle user-generated content style images",
    defaultPrompt: "A lifestyle photo showcasing the product in a modern home setting, natural light, Instagram aesthetic",
  },
  fashion: {
    icon: <Camera className="h-5 w-5" />,
    title: "Fashion Catalog",
    description: "Create professional fashion catalog photography",
    defaultPrompt: "High-end fashion catalog photo, editorial style, studio lighting, clean background",
  },
};

export function ShopifyGenerationModal({ open, onClose, product, generationType, onGenerate, generating }: Props) {
  const config = typeConfig[generationType];
  const [prompt, setPrompt] = useState(config.defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numberOfImages, setNumberOfImages] = useState(2);

  const handleGenerate = () => {
    onGenerate({
      type: generationType,
      prompt,
      aspectRatio,
      numberOfImages,
      productImageUrl: product.image_url || "",
      productTitle: product.title,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {config.icon}
            </div>
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product preview */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            {product.image_url && (
              <img src={product.image_url} alt={product.title} className="h-12 w-12 rounded-md object-cover" />
            )}
            <div>
              <p className="font-medium text-sm">{product.title}</p>
              <p className="text-xs text-muted-foreground">Hero image will be used as source</p>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Prompt / Style Description</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the scene or style…"
            />
          </div>

          {/* Aspect ratio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 Square</SelectItem>
                  <SelectItem value="3:4">3:4 Portrait</SelectItem>
                  <SelectItem value="4:3">4:3 Landscape</SelectItem>
                  <SelectItem value="9:16">9:16 Story</SelectItem>
                  <SelectItem value="16:9">16:9 Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Images</Label>
              <Select value={String(numberOfImages)} onValueChange={(v) => setNumberOfImages(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 image</SelectItem>
                  <SelectItem value="2">2 images</SelectItem>
                  <SelectItem value="3">3 images</SelectItem>
                  <SelectItem value="4">4 images</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate ({numberOfImages} credit{numberOfImages !== 1 ? "s" : ""})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
