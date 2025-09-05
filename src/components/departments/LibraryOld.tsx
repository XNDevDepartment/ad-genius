
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, FileImage, Download, Trash2, Search, Filter, ExternalLink, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibraryImages } from "@/hooks/useLibraryImages";
import { useActiveJob } from "@/hooks/useActiveJob";
import { useSourceImages } from "@/hooks/useSourceImages";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSourceThumbnails, setShowSourceThumbnails] = useState(true);
  const [viewMode, setViewMode] = useState<"ai" | "source">("ai");
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const { images, loading, deleteImage: deleteImageFromDB } = useLibraryImages();
  const { sourceImages, loading: sourceLoading } = useSourceImages();
  const { activeJob, activeImages } = useActiveJob();

  const handleDownload = async (image: LibraryImage) => {
    toast({
      title: "Download Iniciado",
      description: "Baixando imagem...",
    });

    try {
      // For Supabase storage URLs, we can directly download
      const response = await fetch(image.url);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ugc-${image.id}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Falhou",
        description: "Falha ao baixar a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  const confirmDelete = async (imageId: string) => {
    if (!user) return;
    try {
      setDeletingId(imageId);
      await deleteImageFromDB(imageId);
      toast({ title: "Imagem Excluída", description: "Removida da sua biblioteca." });
    } catch {
      toast({
        title: "Exclusão Falhou",
        description: "Falha ao excluir a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };


  // For AI images, use generated images
  const aiImages = images
    .filter(image => image.prompt.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'prompt':
          return a.prompt.localeCompare(b.prompt);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // For source images, use source images with filename search
  const filteredSourceImages = sourceImages
    .filter(image => image.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'prompt':
          return a.fileName.localeCompare(b.fileName);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const filteredAndSortedImages = viewMode === "ai" ? aiImages : filteredSourceImages;
  const isLoading = viewMode === "ai" ? loading : sourceLoading;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in ">

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
          onImageSelect={() => {}} // No selection needed in library
          imageOrientation="square"
        />
      )}

      {/* Images Grid */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {viewMode === "ai" ? "Imagens Geradas" : "Imagens Fonte"} ({filteredAndSortedImages.length})
            </CardTitle>
          </CardHeader>
          
          {/* Controls */}
        </div>
        <CardContent>
          <div className="flex items-start lg:items-center gap-4 mb-2 lg:justify-between flex-col lg:flex-row ">
            {/* View Mode Toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "ai" | "source")}>
              <ToggleGroupItem value="ai" className="text-sm bg-muted">
                AI Generated
              </ToggleGroupItem>
              <ToggleGroupItem value="source" className="text-sm bg-muted">
                Source Images
              </ToggleGroupItem>
            </ToggleGroup>
            {/* Source Thumbnails Toggle (only show in AI mode) */}
            {viewMode === "ai" && (
              <div className="flex items-center text-center gap-2">
                <Switch
                  id="source-thumbnails"
                  checked={showSourceThumbnails}
                  onCheckedChange={setShowSourceThumbnails}
                />
                <label htmlFor="source-thumbnails" className="text-sm text-muted-foreground">
                  Mostrar Fonte
                </label>
              </div>
            )}
            
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Carregando sua biblioteca...</p>
            </div>
          ) : filteredAndSortedImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5">
              {filteredAndSortedImages.map((image) => {
                // Handle both AI images and source images
                const isSourceView = viewMode === "source";
                const imageUrl = isSourceView ? (image as any).signedUrl : (image as any).url;
                const imageAlt = isSourceView ? `Source: ${(image as any).fileName}` : `Generated: ${(image as any).prompt.substring(0, 50)}...`;
                
                return (
                  <div key={image.id} className="space-y-3 animate-scale-in group">
                    <div className=" overflow-hidden border border-border/50 relative aspect-square">
                      <img 
                        src={imageUrl}
                        alt={imageAlt}
                        className="w-full h-full object-cover shadow-card transition-transform group-hover:scale-105"
                      />

                      {/* Source image thumbnail in bottom-left (only in AI mode and when toggle is on) */}
                      {viewMode === "ai" && showSourceThumbnails && (image as any).sourceSignedUrl && (
                        <div className="absolute bottom-2 left-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
                          <img 
                            src={(image as any).sourceSignedUrl}
                            alt="Source image"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Bottom right corner button - Modal Preview */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedImage(image as any)}
                              className="bg-background/90 hover:bg-background"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <div className="space-y-4">
                              <img
                                src={imageUrl}
                                alt={imageAlt}
                                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                        <div className="flex gap-2">
                          {viewMode === "ai" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownload(image as any)}
                              className="bg-background/90 hover:bg-background"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Delete with confirmation - only show for AI images */}
                          {viewMode === "ai" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deletingId === image.id}
                                  className="bg-destructive/90 hover:bg-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar esta imagem?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação é permanente. A imagem será removida da sua biblioteca e do armazenamento.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => confirmDelete(image.id)}
                                  >
                                    {deletingId === image.id ? "A eliminar..." : "Eliminar"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">Ainda não há imagens na sua biblioteca</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Tente ajustar seus termos de busca" : "Gere algum conteúdo UGC para vê-lo aqui"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};