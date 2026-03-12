import { useState } from "react";
import { Check, Download, Eye, Trash2, Upload, CheckSquare, Square, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { GeneratedAsset } from "@/hooks/useShopifyDashboard";
import { toast } from "sonner";

interface Props {
  assets: GeneratedAsset[];
  selectedAssets: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  productTitle: string;
}

export function ShopifyGeneratedAssets({
  assets, selectedAssets, onToggleSelect, onSelectAll, onClearSelection, productTitle,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushing, setPushing] = useState(false);

  const handlePushToShopify = async () => {
    setPushing(true);
    // Simulate push — in production this would call the Shopify API via edge function
    await new Promise(r => setTimeout(r, 2000));
    setPushing(false);
    setShowPushDialog(false);
    toast.success(`${selectedAssets.size} image${selectedAssets.size !== 1 ? "s" : ""} pushed to Shopify`);
    onClearSelection();
  };

  if (assets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h4 className="font-medium text-sm">No generated images yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Use the generation actions above to create new product images. Generated images will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Generated Images ({assets.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectedAssets.size > 0 ? onClearSelection : onSelectAll}>
                {selectedAssets.size > 0 ? (
                  <>
                    <Square className="h-3.5 w-3.5 mr-1" />
                    Clear ({selectedAssets.size})
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Select All
                  </>
                )}
              </Button>
              {selectedAssets.size > 0 && (
                <Button size="sm" onClick={() => setShowPushDialog(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Push to Shopify ({selectedAssets.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assets.map((asset) => {
              const selected = selectedAssets.has(asset.id);
              return (
                <div
                  key={asset.id}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    selected ? "border-primary shadow-md" : "border-transparent hover:border-primary/20"
                  }`}
                  onClick={() => onToggleSelect(asset.id)}
                >
                  <div className="aspect-square bg-muted">
                    <img src={asset.public_url} alt={asset.prompt} className="w-full h-full object-cover" />
                  </div>

                  {/* Selection indicator */}
                  <div className={`absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                    selected ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
                  }`}>
                    <Check className="h-3.5 w-3.5" />
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(asset.public_url); }}
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={asset.public_url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="p-2">
                    <p className="text-[10px] text-muted-foreground truncate">{asset.prompt}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>

      {/* Push to Shopify confirmation dialog */}
      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Images to Shopify</DialogTitle>
            <DialogDescription>
              You are about to add {selectedAssets.size} image{selectedAssets.size !== 1 ? "s" : ""} to
              <strong> {productTitle}</strong> on Shopify.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-4 gap-2">
              {assets.filter(a => selectedAssets.has(a.id)).slice(0, 8).map(a => (
                <div key={a.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={a.public_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {selectedAssets.size > 8 && (
              <p className="text-xs text-muted-foreground mt-2">+{selectedAssets.size - 8} more</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)} disabled={pushing}>
              Cancel
            </Button>
            <Button onClick={handlePushToShopify} disabled={pushing}>
              {pushing ? "Pushing…" : `Add ${selectedAssets.size} Image${selectedAssets.size !== 1 ? "s" : ""} to Shopify`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
