import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileImage, Download, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibraryImages } from "@/hooks/useLibraryImages";
import { useActiveJob } from "@/hooks/useActiveJob";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";

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
  const { toast } = useToast();
  const { user } = useAuth();
  const { images, loading, deleteImage: deleteImageFromDB } = useLibraryImages();
  const { activeJob, activeImages } = useActiveJob();

  const handleDownload = async (image: LibraryImage) => {
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ugc-${image.id}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: "Download iniciado", description: "Baixando imagem..." });
    } catch {
      toast({ title: "Falha no download", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!user) return;
    try {
      await deleteImageFromDB(imageId);
      toast({ title: "Imagem excluída", description: "Removida da biblioteca." });
    } catch {
      toast({ title: "Falha ao excluir", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const filtered = images
    .filter(img => img.prompt.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
          <FileImage className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Biblioteca</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Todas as suas imagens UGC geradas num só lugar
          </p>
        </div>
      </div>

      {/* Currently Generating */}
      {activeJob && (
        <GeneratingImagePlaceholders
          numberOfImages={activeJob.total}
          isGenerating={activeJob.status === "processing" || activeJob.status === "queued"}
          images={activeImages.map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || "",
            selected: false,
          }))}
          onImageSelect={() => {}} // No selection needed in library
          imageOrientation="square"
        />
      )}

      {/* Masonry (CSS columns) */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-7">
          <CardHeader>
            <CardTitle>Imagens Geradas ({filtered.length})</CardTitle>
          </CardHeader>
        </div>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Carregando sua biblioteca...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                Ainda não há imagens na sua biblioteca
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Tente ajustar seus termos de busca" : "Gere algum conteúdo UGC para vê-lo aqui"}
              </p>
            </div>
          ) : (
            <div
              className="
                columns-1 sm:columns-2 lg:columns-3 xl:columns-4
                gap-1
                [column-fill:balance]
              "
            >
              {filtered.map((image) => (
                <article
                  key={image.id}
                  className="
                    mb-1 break-inside-avoid
                    overflow-hidden
                    ring-1 ring-white/10 shadow-sm
                    bg-card group
                    [content-visibility:auto] [contain-intrinsic-size:400px]
                    [-webkit-column-break-inside:avoid] [page-break-inside:avoid]
                  "
                  // content-visibility avoids layout/paint until visible – big perf win on long lists
                  // (supported in modern browsers)
                >
                  <div className="relative">
                    <img
                      src={image.url}
                      alt={`Generated: ${image.prompt.slice(0, 50)}...`}
                      loading="lazy"
                      className="block w-full h-auto"
                    />

                    {/* Source thumbnail (bottom-left) */}
                    {image.sourceSignedUrl && (
                      <div className="absolute bottom-2 left-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
                        <img
                          src={image.sourceSignedUrl}
                          alt="Source image"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="pointer-events-none absolute inset-0 bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/20 transition-opacity z-10" />
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(image.url, "_blank")}
                          className="bg-background/90 hover:bg-background"
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(image)}
                          className="bg-background/90 hover:bg-background"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(image.id)}
                          className="bg-destructive/90 hover:bg-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
