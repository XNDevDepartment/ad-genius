import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileImage, Upload, CheckSquare, Trash2, Loader2, Store } from "lucide-react";
import { BulkImageUploadModal } from "@/components/BulkImageUploadModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibraryImages } from "@/hooks/useLibraryImages";
import { useActiveJob } from "@/hooks/useActiveJob";
import { useSourceImages } from "@/hooks/useSourceImages";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";
import { ImageLibraryGrid } from "@/components/ImageLibraryGrid";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CategoryTab = 'all' | 'ugc' | 'outfit_swap' | 'bulk_background' | 'source';

interface LibraryImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  settings: {
    size: string;
    quality: string;
    numberOfImages: number;
    format: string;
  };
  source_image_id?: string;
  sourceSignedUrl?: string;
}

interface LibraryProps {
  onBack: () => void;
}

export const Library = ({ onBack }: LibraryProps) => {
  const navigate = useNavigate();
  const [showSourceThumbnails, setShowSourceThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Selection mode states
  const [aiSelectionMode, setAiSelectionMode] = useState(false);
  const [aiSelectedIds, setAiSelectedIds] = useState<Set<string>>(new Set());
  const [sourceSelectionMode, setSourceSelectionMode] = useState(false);
  const [sourceSelectedIds, setSourceSelectedIds] = useState<Set<string>>(new Set());
  const [showSourceBulkDeleteDialog, setShowSourceBulkDeleteDialog] = useState(false);
  const [sourceBulkDeleting, setSourceBulkDeleting] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isSourceTab = activeTab === 'source';
  const aiFilter = isSourceTab ? undefined : (activeTab as 'all' | 'ugc' | 'outfit_swap' | 'bulk_background');

  const { images, loading, hasMore, loadMore, deleteImage: deleteImageFromDB, deleteImages } = useLibraryImages({ 
    limit: 20, 
    filter: aiFilter
  });
  const { sourceImages, loading: sourceLoading, refetch: refetchSourceImages, deleteSourceImage, deleteSourceImages } = useSourceImages();
  const { activeJob, activeImages } = useActiveJob();

  const handleUploadComplete = () => {
    refetchSourceImages();
  };

  const handleDownload = async (image: LibraryImage) => {
    toast({ title: "Download Started", description: "Downloading image..." });
    try {
      const isSourceImage = !!(image as any).signedUrl;
      const downloadUrl = isSourceImage ? (image as any).signedUrl : image.url;
      if (!downloadUrl) throw new Error('No download URL available');

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      if (isSourceImage) {
        link.download = (image as any).fileName || `source-${image.id}`;
      } else {
        link.download = `ugc-${image.id}.${image.settings?.format || 'png'}`;
      }
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: "Download Failed", description: "Failed to download image. Please try again.", variant: "destructive" });
    }
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    try {
      if (!imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        return;
      }
      const [meta, base64] = imageUrl.split(",");
      const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error("Failed to open image in new tab:", err);
      toast({ title: "Failed to Open", description: "Could not open image in new tab.", variant: "destructive" });
    }
  };

  const handleSourceBulkDelete = async () => {
    if (sourceSelectedIds.size === 0) return;
    setSourceBulkDeleting(true);
    try {
      const result = await deleteSourceImages(Array.from(sourceSelectedIds));
      if (result.failed === 0) {
        toast({ title: "Success", description: `Deleted ${result.success} images` });
      } else {
        toast({ title: "Partial Success", description: `Deleted ${result.success}, failed ${result.failed}`, variant: "destructive" });
      }
      setSourceSelectedIds(new Set());
      setSourceSelectionMode(false);
    } catch (err) {
      toast({ title: "Delete Failed", description: "Failed to delete images", variant: "destructive" });
    } finally {
      setSourceBulkDeleting(false);
      setShowSourceBulkDeleteDialog(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as CategoryTab);
    // Reset selection mode when switching tabs
    setAiSelectionMode(false);
    setAiSelectedIds(new Set());
    setSourceSelectionMode(false);
    setSourceSelectedIds(new Set());
  };

  const displayImages = isSourceTab ? sourceImages : images;
  const isLoading = isSourceTab ? sourceLoading : loading;

  return (
    <div className="lg:p-8 space-y-6 animate-fade-in">

      {/* Currently Generating Section */}
      {activeJob && (
        <GeneratingImagePlaceholders
          numberOfImages={activeJob.total}
          isGenerating={activeJob.status === 'processing' || activeJob.status === 'queued'}
          images={activeImages.map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            selected: false
          }))}
          onImageSelect={() => {}}
          imageOrientation="square"
        />
      )}

      {/* Images Grid */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSourceTab ? t('library.sourceImages') : t('library.aiGenerated')} ({displayImages.length})
            </CardTitle>
          </CardHeader>
          <div className="flex items-center gap-2">
            {isSourceTab && !sourceSelectionMode && (
              <>
                <Button variant="outline" size="sm" onClick={() => setSourceSelectionMode(true)}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/import/shopify')}>
                  <Store className="w-4 h-4 mr-2" />
                  {t('library.importFromShopify', 'Import from Shopify')}
                </Button>
                <Button onClick={() => setShowUploadModal(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('library.bulkUpload.uploadButton', 'Upload Images')}
                </Button>
              </>
            )}
            {!isSourceTab && !aiSelectionMode && (
              <Button variant="outline" size="sm" onClick={() => setAiSelectionMode(true)}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Select
              </Button>
            )}
          </div>
        </div>
        <CardContent>
          <div className="flex items-start lg:items-center gap-4 mb-6 lg:justify-between flex-col lg:flex-row">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all" className="text-sm">
                  {t('library.categories.all', 'All')}
                </TabsTrigger>
                <TabsTrigger value="ugc" className="text-sm">
                  {t('library.categories.ugc', 'UGC')}
                </TabsTrigger>
                <TabsTrigger value="outfit_swap" className="text-sm">
                  {t('library.categories.outfitSwap', 'Outfit Swap')}
                </TabsTrigger>
                <TabsTrigger value="bulk_background" className="text-sm">
                  {t('library.categories.bulkBackground', 'Bulk Background')}
                </TabsTrigger>
                <TabsTrigger value="source" className="text-sm">
                  {t('library.categories.sourceImages', 'Source Images')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {!isSourceTab && (
              <div className="flex items-center text-center gap-2">
                <Switch
                  id="source-thumbnails"
                  checked={showSourceThumbnails}
                  onCheckedChange={setShowSourceThumbnails}
                />
                <label htmlFor="source-thumbnails" className="text-sm text-muted-foreground">
                  {t('library.showSource')}
                </label>
              </div>
            )}
          </div>

          {/* Source Selection Mode Header */}
          {isSourceTab && sourceSelectionMode && (
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{sourceSelectedIds.size} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setSourceSelectedIds(new Set(sourceImages.map(img => img.id)))}>
                  Select All
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={sourceSelectedIds.size === 0 || sourceBulkDeleting}
                  onClick={() => setShowSourceBulkDeleteDialog(true)}
                >
                  {sourceBulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSourceSelectedIds(new Set()); setSourceSelectionMode(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading && displayImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">{t('library.loading')}</p>
            </div>
          ) : !isSourceTab ? (
            <ImageLibraryGrid
              images={images as any}
              loading={loading}
              hasMore={hasMore}
              showSourceThumbnails={showSourceThumbnails}
              viewMode="ai"
              onLoadMore={loadMore}
              onDelete={deleteImageFromDB}
              onDownload={handleDownload}
              onOpenInNewTab={handleOpenInNewTab}
              selectionMode={aiSelectionMode}
              onSelectionModeChange={setAiSelectionMode}
              selectedIds={aiSelectedIds}
              onSelectionChange={setAiSelectedIds}
              onBulkDelete={deleteImages}
            />
          ) : (
            <ImageLibraryGrid
              images={sourceImages as any}
              loading={sourceLoading}
              hasMore={false}
              showSourceThumbnails={false}
              viewMode="source"
              onLoadMore={() => {}}
              onDelete={async (id) => { await deleteSourceImage(id); }}
              onDownload={handleDownload}
              onOpenInNewTab={handleOpenInNewTab}
              selectionMode={sourceSelectionMode}
              onSelectionModeChange={setSourceSelectionMode}
              selectedIds={sourceSelectedIds}
              onSelectionChange={setSourceSelectedIds}
              onBulkDelete={async (ids) => deleteSourceImages(ids)}
            />
          )}
        </CardContent>
      </Card>

      {/* Bulk Upload Modal */}
      <BulkImageUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={handleUploadComplete}
      />

      {/* Source Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showSourceBulkDeleteDialog} onOpenChange={setShowSourceBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {sourceSelectedIds.size} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected source images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sourceBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSourceBulkDelete}
              disabled={sourceBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {sourceBulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
