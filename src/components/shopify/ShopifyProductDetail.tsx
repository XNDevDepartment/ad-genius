import { ArrowLeft, Package, ImagePlus, Palette, Users, Camera, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ShopifyProduct } from "@/hooks/useShopifyDashboard";

interface Props {
  product: ShopifyProduct;
  onBack: () => void;
  onGenerate: (type: "background" | "ugc" | "fashion") => void;
}

export function ShopifyProductDetail({ product, onBack, onGenerate }: Props) {
  const stripHtml = (html: string | null) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="lg:col-span-1 space-y-4">
          {/* Hero image */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </Card>

          {/* All images */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted border hover:border-primary/40 transition-colors cursor-pointer">
                  <img src={img.src} alt={img.alt || product.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{product.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={product.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }>
                      {product.status}
                    </Badge>
                    {product.vendor && <Badge variant="outline">{product.vendor}</Badge>}
                    {product.product_type && <Badge variant="outline">{product.product_type}</Badge>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  ID: {product.shopify_product_id}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              {product.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {stripHtml(product.description)}
                  </p>
                </div>
              )}

              {/* Variants */}
              {product.variants.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Variants ({product.variants.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.variants.slice(0, 6).map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                        <span className="truncate">{v.title}</span>
                        <span className="text-muted-foreground ml-2">{v.price ? `$${v.price}` : "—"}</span>
                      </div>
                    ))}
                    {product.variants.length > 6 && (
                      <div className="text-xs text-muted-foreground px-3 py-2">
                        +{product.variants.length - 6} more variants
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Last synced {new Date(product.synced_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Generation Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary" />
                Generate Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onGenerate("background")}
                  disabled={!product.image_url}
                >
                  <Palette className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Change Background</span>
                  <span className="text-[10px] text-muted-foreground">Product on new scene</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onGenerate("ugc")}
                  disabled={!product.image_url}
                >
                  <Users className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Generate UGC</span>
                  <span className="text-[10px] text-muted-foreground">Lifestyle images</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => onGenerate("fashion")}
                  disabled={!product.image_url}
                >
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Fashion Catalog</span>
                  <span className="text-[10px] text-muted-foreground">Professional catalog shots</span>
                </Button>
              </div>
              {!product.image_url && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This product has no hero image. Upload an image to Shopify first.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
