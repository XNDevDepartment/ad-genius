import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Store, Search, Download, Loader2, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { shopifyImportApi, ShopifyProduct, getProxiedImageUrl } from '@/lib/api/shopify-import';

interface ShopifyImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (importedIds: string[]) => void;
}

export const ShopifyImportModal = ({ open, onOpenChange, onImportComplete }: ShopifyImportModalProps) => {
  const { t } = useTranslation();
  
  const [storeUrl, setStoreUrl] = useState('');
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ completed: 0, total: 0 });
  const [hasFetched, setHasFetched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const allImages = useMemo(() => {
    return products.flatMap(p => p.images.map(img => img.src));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const filteredImages = useMemo(() => {
    return filteredProducts.flatMap(p => p.images.map(img => img.src));
  }, [filteredProducts]);

  const handleFetchProducts = async (page = 1) => {
    if (!storeUrl.trim()) {
      toast.error(t('shopifyImport.invalidUrl', 'Please enter a valid Shopify store URL'));
      return;
    }

    if (page === 1) {
      setIsFetching(true);
      setProducts([]);
      setSelectedImages(new Set());
      setHasFetched(false);
      setFailedImages(new Set());
      setLoadedImages(new Set());
      setSearchQuery('');
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await shopifyImportApi.fetchProducts(storeUrl, page);
      
      if (!response.success) {
        toast.error(response.error || t('shopifyImport.fetchError', 'Could not fetch products'));
        return;
      }

      if (page === 1) {
        setProducts(response.products || []);
      } else {
        setProducts(prev => [...prev, ...(response.products || [])]);
      }
      
      setCurrentPage(page);
      setHasMore(response.hasMore || false);
      setHasFetched(true);

      if (page === 1) {
        if ((response.products?.length || 0) === 0) {
          toast.info(t('shopifyImport.noProducts', 'No products found'));
        } else {
          toast.success(t('shopifyImport.productsFound', '{{count}} products found', { 
            count: response.products?.length 
          }));
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('shopifyImport.fetchError', 'Could not fetch products'));
    } finally {
      setIsFetching(false);
      setIsLoadingMore(false);
    }
  };

  const toggleImageSelection = (imageSrc: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(imageSrc)) {
        next.delete(imageSrc);
      } else {
        next.add(imageSrc);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages));
    }
  };

  const handleImport = async () => {
    if (selectedImages.size === 0) {
      toast.error(t('shopifyImport.noSelection', 'Please select at least one image'));
      return;
    }

    setIsImporting(true);
    setImportProgress({ completed: 0, total: selectedImages.size });

    try {
      const result = await shopifyImportApi.importImages(
        Array.from(selectedImages),
        (completed, total) => setImportProgress({ completed, total })
      );

      if (result.success > 0) {
        toast.success(t('shopifyImport.importSuccess', 'Successfully imported {{count}} images', { 
          count: result.success 
        }));
        
        // Get IDs of successfully imported images
        const successfulUrls = result.results
          .filter(r => r.success)
          .map(r => r.url);
        
        onImportComplete(successfulUrls);
        onOpenChange(false);
        
        // Reset state
        setProducts([]);
        setSelectedImages(new Set());
        setHasFetched(false);
        setSearchQuery('');
      }

      if (result.failed > 0) {
        toast.error(t('shopifyImport.importPartialError', '{{count}} images failed to import', { 
          count: result.failed 
        }));
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t('shopifyImport.importError', 'Failed to import images'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {t('shopifyImport.title', 'Import from Shopify')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6">
          {/* URL Input */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder={t('shopifyImport.urlPlaceholder', 'https://store.myshopify.com')}
                className="pl-10"
                disabled={isFetching}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchProducts(1)}
              />
            </div>
            <Button 
              onClick={() => handleFetchProducts(1)} 
              disabled={isFetching || !storeUrl.trim()}
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('shopifyImport.fetching', 'Fetching...')}
                </>
              ) : (
                t('shopifyImport.fetchProducts', 'Fetch Products')
              )}
            </Button>
          </div>

          {/* Products Content */}
          {hasFetched && (
            <ScrollArea className="flex-1">
              {products.length > 0 ? (
                <div className="space-y-4">
                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? (
                          <>
                            {t('shopifyImport.showingFiltered', 'Showing {{filtered}} of {{total}} products', { 
                              filtered: filteredProducts.length, 
                              total: products.length 
                            })}
                          </>
                        ) : (
                          <>
                            {t('shopifyImport.productsFound', '{{count}} products found', { count: products.length })}
                            {' · '}
                            {t('shopifyImport.imagesAvailable', '{{count}} images available', { count: allImages.length })}
                          </>
                        )}
                      </p>
                      
                      {/* Search Filter */}
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t('shopifyImport.searchProducts', 'Search products...')}
                          className="pl-10 h-8 text-sm"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setSearchQuery('')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedImages.size === filteredImages.length && filteredImages.length > 0
                          ? t('shopifyImport.deselectAll', 'Deselect All')
                          : t('shopifyImport.selectAll', 'Select All')}
                      </Button>
                      <Button
                        onClick={handleImport}
                        disabled={selectedImages.size === 0 || isImporting}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('shopifyImport.importing', 'Importing...')}
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            {t('shopifyImport.importSelected', 'Import {{count}} Images', { 
                              count: selectedImages.size 
                            })}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {isImporting && (
                    <div className="mb-4">
                      <Progress 
                        value={(importProgress.completed / importProgress.total) * 100} 
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        {t('shopifyImport.importingProgress', 'Importing {{completed}} of {{total}}...', {
                          completed: importProgress.completed,
                          total: importProgress.total
                        })}
                      </p>
                    </div>
                  )}

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          {product.images[0] && (
                            <div 
                              className="relative aspect-square bg-muted cursor-pointer group"
                              onClick={() => toggleImageSelection(product.images[0].src)}
                            >
                              {!failedImages.has(product.images[0].src) ? (
                                <>
                                  {!loadedImages.has(product.images[0].src) && (
                                    <Skeleton className="absolute inset-0" />
                                  )}
                                  <img
                                    src={getProxiedImageUrl(product.images[0].src)}
                                    alt={product.images[0].alt || product.title}
                                    className={`w-full h-full object-cover transition-opacity ${
                                      loadedImages.has(product.images[0].src) ? 'opacity-100' : 'opacity-0'
                                    }`}
                                    loading="lazy"
                                    onLoad={() => setLoadedImages(prev => new Set(prev).add(product.images[0].src))}
                                    onError={() => setFailedImages(prev => new Set(prev).add(product.images[0].src))}
                                  />
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                                selectedImages.has(product.images[0].src) 
                                  ? 'bg-primary/20' 
                                  : 'bg-black/0 group-hover:bg-black/10'
                              }`}>
                                <Checkbox
                                  checked={selectedImages.has(product.images[0].src)}
                                  className="absolute top-2 left-2 h-5 w-5 bg-background"
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="p-2">
                            <h3 className="font-medium text-xs line-clamp-2">
                              {product.title}
                            </h3>
                            
                            {product.images.length > 1 && (
                              <div className="mt-1 flex gap-1 flex-wrap">
                                {product.images.slice(1, 4).map((img, idx) => (
                                  <div
                                    key={idx}
                                    className={`relative w-8 h-8 rounded border cursor-pointer overflow-hidden ${
                                      selectedImages.has(img.src) ? 'ring-2 ring-primary' : ''
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleImageSelection(img.src);
                                    }}
                                  >
                                    {!failedImages.has(img.src) ? (
                                      <img
                                        src={getProxiedImageUrl(img.src)}
                                        alt={img.alt || `${product.title} ${idx + 2}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={() => setFailedImages(prev => new Set(prev).add(img.src))}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {product.images.length > 4 && (
                                  <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    +{product.images.length - 4}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline"
                        onClick={() => handleFetchProducts(currentPage + 1)}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('shopifyImport.loadingMore', 'Loading...')}
                          </>
                        ) : (
                          t('shopifyImport.loadMore', 'Load More Products')
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t('shopifyImport.noProducts', 'No products found')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('shopifyImport.noProductsHint', 'This store may be private or have no public products')}
                  </p>
                </div>
              )}
            </ScrollArea>
          )}

          {/* Empty state before fetch */}
          {!hasFetched && !isFetching && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('shopifyImport.urlHint', 'Enter the main URL of any public Shopify store')}
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isFetching && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">
                  {t('shopifyImport.fetching', 'Fetching...')}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
