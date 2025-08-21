
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileImage, Download, Trash2, Search, Filter, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSecureImageStorage } from "./ugc/SecureImageStorage";

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
  const { toast } = useToast();
  const { user } = useAuth();
  const { images, deleteImage, loading } = useSecureImageStorage();

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

  const handleDelete = async (imageId: string) => {
    if (!user) return;
    
    try {
      await deleteImage(imageId);
      toast({
        title: "Imagem Excluída",
        description: "A imagem foi removida da sua biblioteca.",
      });
    } catch (error) {
      toast({
        title: "Exclusão Falhou",
        description: "Falha ao excluir a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const filteredAndSortedImages = images
    .filter(image => 
      image.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
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

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <FileImage className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Biblioteca</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Todas as suas imagens UGC geradas num só lugar</p>
          </div>
        </div>
      </div>


      {/* Images Grid */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {/* <FileImage className="h-5 w-5 text-primary" /> */}
            Imagens Geradas ({filteredAndSortedImages.length})
          </CardTitle>
          {/* <CardDescription>
            Sua coleção de conteúdo UGC gerado por IA
          </CardDescription> */}
        </CardHeader>
         {/* Filters */}
        {/* <div className="flex flex-col sm:flex-row gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais Recentes Primeiro</SelectItem>
                <SelectItem value="oldest">Mais Antigos Primeiro</SelectItem>
                {/* <SelectItem value="prompt">Por Prompt</SelectItem> */}
              {/* </SelectContent>
            </Select>
          </div> */}
        </div>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Carregando sua biblioteca...</p>
            </div>
          ) : filteredAndSortedImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedImages.map((image) => {
                return (
                  <div key={image.id} className="space-y-3 animate-scale-in group">
                    <div className="rounded-lg overflow-hidden border border-border/50 relative aspect-square">
                      <img 
                        src={image.url}
                        alt={`Generated: ${image.prompt.substring(0, 50)}...`}
                        className="w-full h-full object-cover shadow-card transition-transform group-hover:scale-105"
                      />
                      
                      {/* Source image thumbnail in bottom-left */}
                      {image.sourceSignedUrl && (
                        <div className="absolute bottom-2 left-2 w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
                          <img 
                            src={image.sourceSignedUrl}
                            alt="Source image"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Bottom right corner button */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(image.url, '_blank')}
                          className="bg-background/90 hover:bg-background"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(image)}
                            className="bg-background/90 hover:bg-background"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(image.id)}
                            className="bg-destructive/90 hover:bg-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{new Date(image.created_at).toLocaleDateString()}</span>
                        <span>{image.settings.size}</span>
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
