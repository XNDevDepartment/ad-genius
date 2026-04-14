import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Download, FolderOpen, FileImage, Store, Upload, Wand2, Trash2, X, Images, FolderClosed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LazyImage } from '@/components/ui/lazy-image';
import { BulkImageUploadModal } from '@/components/BulkImageUploadModal';
import { ImageLibraryGrid } from '@/components/ImageLibraryGrid';
import { GeneratingImagePlaceholders } from '@/components/departments/ugc/GeneratingImagePlaceholders';
import { CollectionsList } from '@/components/library/CollectionsList';
import { CreateCollectionDialog } from '@/components/library/CreateCollectionDialog';
import { AddToCollectionDialog } from '@/components/library/AddToCollectionPopover';
import { LibrarySearchBar } from '@/components/library/LibrarySearchBar';
import type { DateFilter, TypeFilter, SortOrder } from '@/components/library/LibrarySearchBar';
import { useLibraryBySource, SourceCatalogEntry } from '@/hooks/useLibraryBySource';
import { useLibraryImages } from '@/hooks/useLibraryImages';
import { useActiveJob } from '@/hooks/useActiveJob';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionItems } from '@/hooks/useCollectionItems';
import { useToast } from '@/hooks/use-toast';
import type { LibraryImage } from '@/hooks/useLibraryImages';

interface LibraryCatalogProps {
  onBack: () => void;
}

type ViewLevel = 'generated' | 'sources' | 'sourceDetail' | 'collections' | 'collectionDetail';

export const LibraryCatalog = ({ onBack }: LibraryCatalogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ─── Search & filter state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Level 1: all generated images
  const {
    images: allImages,
    loading: allLoading,
    hasMore: allHasMore,
    loadMore: allLoadMore,
    deleteImage: deleteAllImage,
    deleteImages: deleteAllImages,
    refetch: refetchAll,
  } = useLibraryImages({ limit: 20, filter: typeFilter, searchQuery, dateFilter, sortOrder });

  // Level 2 & 3: source catalog + detail
  const {
    catalogEntries,
    uncategorizedCount,
    catalogLoading,
    refetchCatalog,
    selectedSourceId,
    selectedSource,
    detailImages,
    detailLoading,
    selectSource,
    clearSelection,
    refetchDetail,
    deleteSourceEntry,
    deleteDetailImage,
    deleteDetailImages,
  } = useLibraryBySource();

  const { activeJob, activeImages } = useActiveJob();

  // ─── Collections state ────────────────────────────────────────────────────
  const { collections, isLoading: collectionsLoading, createCollection, deleteCollection } = useCollections();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const { items: collectionItems, isLoading: collectionItemsLoading } = useCollectionItems(selectedCollectionId ?? undefined);

  // "Add to Collection" target image state
  const [addToCollectionImage, setAddToCollectionImage] = useState<{ id: string; type: string } | null>(null);

  const [viewLevel, setViewLevel] = useState<ViewLevel>('generated');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sourceSelectionMode, setSourceSelectionMode] = useState(false);
  const [sourceSelectedIds, setSourceSelectedIds] = useState<Set<string>>(new Set());
  const [detailSelectionMode, setDetailSelectionMode] = useState(false);
  const [detailSelectedIds, setDetailSelectedIds] = useState<Set<string>>(new Set());
  const [genSelectionMode, setGenSelectionMode] = useState(false);
  const [genSelectedIds, setGenSelectedIds] = useState<Set<string>>(new Set());

  // ─── Download handler ─────────────────────────────────────────────────────

  const handleDownload = async (image: LibraryImage) => {
    toast({ title: 'Download Started', description: 'Downloading image...' });
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ugc-${image.id}.${image.settings?.format || 'png'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download Failed', description: 'Failed to download image.', variant: 'destructive' });
    }
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    try {
      if (!imageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
        return;
      }
      const [meta, base64] = imageUrl.split(',');
      const mime = meta.split(':')[1]?.split(';')[0] || 'image/png';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast({ title: 'Failed to Open', description: 'Could not open image in new tab.', variant: 'destructive' });
    }
  };

  // ─── Source bulk-delete ───────────────────────────────────────────────────

  const handleBulkDeleteSources = async () => {
    const ids = Array.from(sourceSelectedIds);
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await deleteSourceEntry(id);
        success++;
      } catch {
        failed++;
      }
    }

    setSourceSelectionMode(false);
    setSourceSelectedIds(new Set());

    if (failed === 0) {
      toast({ title: `Deleted ${success} source image${success !== 1 ? 's' : ''}` });
    } else {
      toast({ title: `Deleted ${success}, failed ${failed}`, variant: 'destructive' });
    }
  };

  const toggleSourceSelect = (id: string) => {
    setSourceSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllSources = () => {
    setSourceSelectedIds(new Set(catalogEntries.map(e => e.id)));
  };

  // ─── Generate more ────────────────────────────────────────────────────────

  const handleGenerateMore = () => {
    if (selectedSourceId !== null && selectedSourceId !== undefined) {
      navigate('/create/ugc', {
        state: { preloadSourceImageIds: [selectedSourceId] },
      });
    } else {
      navigate('/create/ugc');
    }
  };

  // ─── Add to collection helpers ────────────────────────────────────────────

  const handleAddToCollection = (image: LibraryImage) => {
    setAddToCollectionImage({ id: image.id, type: image.source_type ?? 'ugc_image' });
  };

  // ─── Level 1: All Generated Images ────────────────────────────────────────

  const renderGeneratedView = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Currently Generating */}
      {activeJob && (
        <GeneratingImagePlaceholders
          numberOfImages={activeJob.total}
          isGenerating={activeJob.status === 'processing' || activeJob.status === 'queued'}
          images={activeImages.map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            selected: false,
          }))}
          onImageSelect={() => {}}
          imageOrientation="square"
        />
      )}

      {/* Collections folder card */}
      <Card
        className="bg-gradient-card border-border/50 cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => setViewLevel('collections')}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
            <FolderClosed className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Collections</p>
            <p className="text-xs text-muted-foreground">
              {collections.length} collection{collections.length !== 1 ? 's' : ''}
            </p>
          </div>
          <CreateCollectionDialog
            onCreate={async (input) => { await createCollection(input); }}
            trigger={
              <Button variant="outline" size="sm" onClick={e => e.stopPropagation()}>
                + New
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Source Images folder card */}
      <Card
        className="bg-gradient-card border-border/50 cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => setViewLevel('sources')}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
            <Images className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Source Images</p>
            <p className="text-xs text-muted-foreground">
              {catalogEntries.length} product{catalogEntries.length !== 1 ? 's' : ''}
              {uncategorizedCount > 0 && ` · ${uncategorizedCount} uncategorized`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setShowUploadModal(true); }}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </CardContent>
      </Card>

      {/* Search & filter bar */}
      <LibrarySearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Generated images grid */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Generated Images ({allImages.length}{allHasMore ? '+' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageLibraryGrid
            images={allImages}
            loading={allLoading}
            hasMore={allHasMore}
            showSourceThumbnails={true}
            viewMode="ai"
            onLoadMore={allLoadMore}
            onDelete={deleteAllImage}
            onDownload={handleDownload}
            onOpenInNewTab={handleOpenInNewTab}
            selectionMode={genSelectionMode}
            onSelectionModeChange={setGenSelectionMode}
            selectedIds={genSelectedIds}
            onSelectionChange={setGenSelectedIds}
            onBulkDelete={deleteAllImages}
            onRefresh={refetchAll}
            onAddToCollection={handleAddToCollection}
          />
        </CardContent>
      </Card>

    </div>
  );

  // ─── Level 2: Source Catalog ───────────────────────────────────────────────

  const renderSourceCatalog = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setViewLevel('generated'); setSourceSelectionMode(false); setSourceSelectedIds(new Set()); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg flex-1">Source Images</h2>
      </div>

      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Source Images ({catalogEntries.length})
            </CardTitle>
          </CardHeader>

          <div className="flex items-center gap-2">
            {!sourceSelectionMode ? (
              <>
                {catalogEntries.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setSourceSelectionMode(true)}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate('/import/shopify')}>
                  <Store className="w-4 h-4 mr-2" />
                  Shopify
                </Button>
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">{sourceSelectedIds.size} selected</span>
                <Button variant="outline" size="sm" onClick={selectAllSources}>
                  Select All
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={sourceSelectedIds.size === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {sourceSelectedIds.size} source image{sourceSelectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the selected source images. Generated images from these sources will remain in your library but will be uncategorized.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDeleteSources}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" size="sm" onClick={() => { setSourceSelectionMode(false); setSourceSelectedIds(new Set()); }}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <CardContent>
          {catalogLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-sm" />
              ))}
            </div>
          ) : catalogEntries.length === 0 && uncategorizedCount === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No source images yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Upload your first product image to get started.</p>
              <Button size="sm" className="mt-4" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Images
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {/* Uncategorized card */}
              {uncategorizedCount > 0 && (
                <div
                  className="group cursor-pointer"
                  onClick={() => { if (!sourceSelectionMode) { selectSource(null); setViewLevel('sourceDetail'); } }}
                >
                  <div className="aspect-[3/4] rounded-sm border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-2 bg-muted/20 group-hover:border-primary/40 group-hover:bg-muted/30 transition-all">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground text-center px-2">Uncategorized</p>
                    <p className="text-xs text-muted-foreground">{uncategorizedCount} images</p>
                  </div>
                </div>
              )}

              {/* Source image cards */}
              {catalogEntries.map(entry => (
                <SourceCard
                  key={entry.id}
                  entry={entry}
                  selectionMode={sourceSelectionMode}
                  selected={sourceSelectedIds.has(entry.id)}
                  onSelect={() => toggleSourceSelect(entry.id)}
                  onClick={() => { if (!sourceSelectionMode) { selectSource(entry.id); setViewLevel('sourceDetail'); } }}
                  onDelete={async () => {
                    try {
                      await deleteSourceEntry(entry.id);
                      toast({ title: 'Source image deleted' });
                    } catch {
                      toast({ title: 'Delete failed', variant: 'destructive' });
                    }
                  }}
                  onDownload={async () => {
                    toast({ title: 'Download Started', description: 'Downloading image...' });
                    try {
                      const response = await fetch(entry.signedUrl);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = entry.fileName || `source-${entry.id}.png`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast({ title: 'Download Failed', variant: 'destructive' });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Level 3: Source Detail ────────────────────────────────────────────────

  const renderSourceDetail = () => {
    const sourceName = selectedSourceId === null ? 'Uncategorized' : (selectedSource?.fileName ?? 'Source Image');
    const sourceCount = selectedSourceId === null ? uncategorizedCount : (selectedSource?.generatedCount ?? 0);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { clearSelection(); setViewLevel('sources'); setDetailSelectionMode(false); setDetailSelectedIds(new Set()); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedSource?.signedUrl && (
              <img
                src={selectedSource.signedUrl}
                alt={selectedSource.fileName}
                className="w-10 h-10 object-cover rounded border border-border/50 flex-shrink-0"
              />
            )}
            {selectedSourceId === null && (
              <div className="w-10 h-10 rounded border-2 border-dashed border-border/50 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{sourceName}</p>
              <p className="text-xs text-muted-foreground">{sourceCount} generated images</p>
            </div>
          </div>
          {selectedSourceId !== null && (
            <Button size="sm" onClick={handleGenerateMore} className="flex-shrink-0">
              <Wand2 className="h-4 w-4 mr-2" />
              Generate More
            </Button>
          )}
        </div>

        {/* Generated images grid */}
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="pt-6">
            <ImageLibraryGrid
              images={detailImages as any}
              loading={detailLoading}
              hasMore={false}
              showSourceThumbnails={false}
              viewMode="ai"
              onLoadMore={() => {}}
              onDelete={deleteDetailImage}
              onDownload={handleDownload}
              onOpenInNewTab={handleOpenInNewTab}
              selectionMode={detailSelectionMode}
              onSelectionModeChange={setDetailSelectionMode}
              selectedIds={detailSelectedIds}
              onSelectionChange={setDetailSelectedIds}
              onBulkDelete={deleteDetailImages}
              onRefresh={refetchDetail}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Collections list view ─────────────────────────────────────────────────

  const renderCollectionsView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setViewLevel('generated')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg flex-1">Collections</h2>
        <CreateCollectionDialog onCreate={async (input) => { await createCollection(input); }} />
      </div>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>My Collections ({collections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 && !collectionsLoading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FolderClosed className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No collections yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Create a collection to group your campaign images.</p>
              <CreateCollectionDialog
                onCreate={async (input) => { await createCollection(input); }}
                trigger={
                  <Button size="sm" className="mt-4">
                    Create First Collection
                  </Button>
                }
              />
            </div>
          ) : (
            <CollectionsList
              collections={collections}
              isLoading={collectionsLoading}
              itemCounts={{}}
              onOpenCollection={(id) => { setSelectedCollectionId(id); setViewLevel('collectionDetail'); }}
              onDeleteCollection={async (id) => {
                try {
                  await deleteCollection(id);
                  toast({ title: 'Collection deleted' });
                } catch {
                  toast({ title: 'Failed to delete collection', variant: 'destructive' });
                }
              }}
              onCreateCollection={async (input) => { await createCollection(input); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Collection detail view ────────────────────────────────────────────────

  const renderCollectionDetail = () => {
    const collection = collections.find(c => c.id === selectedCollectionId);
    if (!collection) return null;

    // Build the images list from collectionItems joined against allImages
    // Since we don't reload all images here, we pass the content_ids and let the grid
    // show a placeholder. For MVP we fetch all user images and filter client-side.
    // Note: this relies on the allImages being loaded (no filters active here).

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedCollectionId(null); setViewLevel('collections'); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">{collection.emoji}</span>
            <div>
              <p className="font-semibold text-base">{collection.name}</p>
              <p className="text-xs text-muted-foreground">{collectionItems.length} image{collectionItems.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="pt-6">
            {collectionItemsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-sm" />
                ))}
              </div>
            ) : collectionItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No images in this collection yet.</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Go to Generated Images and click the folder icon on any image.
                </p>
              </div>
            ) : (
              <CollectionImageGrid
                collectionId={collection.id}
                contentIds={collectionItems.map(i => i.content_id)}
                onDownload={handleDownload}
                onOpenInNewTab={handleOpenInNewTab}
                onRemoved={() => {}}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (viewLevel) {
      case 'generated': return renderGeneratedView();
      case 'sources': return renderSourceCatalog();
      case 'sourceDetail': return renderSourceDetail();
      case 'collections': return renderCollectionsView();
      case 'collectionDetail': return renderCollectionDetail();
    }
  };

  return (
    <div className="lg:p-8 space-y-6">
      {renderCurrentView()}

      <BulkImageUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={() => {
          setShowUploadModal(false);
          refetchCatalog();
        }}
      />

      {/* Add to Collection dialog */}
      {addToCollectionImage && (
        <AddToCollectionDialog
          open={!!addToCollectionImage}
          onOpenChange={(open) => { if (!open) setAddToCollectionImage(null); }}
          contentId={addToCollectionImage.id}
          contentType={addToCollectionImage.type}
        />
      )}
    </div>
  );
};

// ─── Source card sub-component ────────────────────────────────────────────────

interface SourceCardProps {
  entry: SourceCatalogEntry;
  selectionMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

const SourceCard = ({ entry, selectionMode, selected, onSelect, onClick, onDelete, onDownload }: SourceCardProps) => (
  <div
    className="group cursor-pointer relative"
    onClick={selectionMode ? onSelect : onClick}
  >
    {/* Selection overlay */}
    {selectionMode && (
      <div className={`absolute inset-0 z-10 rounded-sm border-2 transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-transparent'}`}>
        <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'bg-background/80 border-border'}`}>
          {selected && <CheckSquare className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
    )}

    <div className={`aspect-[3/4] rounded-sm overflow-hidden border transition-all duration-200 ${
      selected ? 'border-primary' : 'border-border/50 group-hover:border-primary/40 group-hover:shadow-md'
    }`}>
      <LazyImage
        src={entry.signedUrl}
        alt={entry.fileName}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 translate-y-0">
        <p className="text-white text-xs font-medium truncate leading-tight">{entry.fileName}</p>
        <p className="text-white/70 text-xs">{entry.generatedCount} image{entry.generatedCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Action buttons (visible on hover, not in selection mode) */}
      {!selectionMode && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            className="w-7 h-7 rounded bg-background/80 border border-border/50 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary"
            onClick={e => { e.stopPropagation(); onDownload(); }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="w-7 h-7 rounded bg-background/80 border border-border/50 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                onClick={e => e.stopPropagation()}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete source image?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete &quot;{entry.fileName}&quot; from your library. Generated images from this source will remain but become uncategorized.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  </div>
);

// ─── Collection image grid sub-component ──────────────────────────────────────

interface CollectionImageGridProps {
  collectionId: string;
  contentIds: string[];
  onDownload: (image: LibraryImage) => Promise<void>;
  onOpenInNewTab: (url: string) => void;
  onRemoved: () => void;
}

const CollectionImageGrid = ({ collectionId, contentIds, onDownload, onOpenInNewTab, onRemoved }: CollectionImageGridProps) => {
  const { images, loading } = useLibraryImages({ limit: 100 });
  const { removeItem } = useCollectionItems(collectionId);
  const { toast } = useToast();

  const contentIdSet = new Set(contentIds);
  const collectionImages = images.filter(img => contentIdSet.has(img.id));

  const handleDelete = async (imageId: string) => {
    try {
      await removeItem(imageId);
      toast({ title: 'Removed from collection' });
      onRemoved();
    } catch {
      toast({ title: 'Failed to remove image', variant: 'destructive' });
    }
  };

  return (
    <ImageLibraryGrid
      images={collectionImages}
      loading={loading}
      hasMore={false}
      showSourceThumbnails={false}
      viewMode="ai"
      onLoadMore={() => {}}
      onDelete={handleDelete}
      onDownload={onDownload}
      onOpenInNewTab={onOpenInNewTab}
    />
  );
};
