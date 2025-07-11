import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, StarOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { assistants, categories } from "@/data/assistants";
import { useFavorites } from "@/hooks/useFavorites";

interface CategoryPageProps {
  categoryId: string;
  onBack: () => void;
  onSelectAssistant: (assistantId: string) => void;
}

export const CategoryPage = ({ categoryId, onBack, onSelectAssistant }: CategoryPageProps) => {
  const { user } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  
  const category = categories.find(cat => cat.id === categoryId);
  const categoryAssistants = assistants.filter(assistant => assistant.category === categoryId);

  if (!category) {
    return <div>Category not found</div>;
  }

  const handleFavoriteToggle = (assistantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(assistantId)) {
      removeFavorite(assistantId);
    } else {
      addFavorite(assistantId);
    }
  };

  const handleAssistantClick = (assistant: any) => {
    if (assistant.requireAuth && !user) {
      toast.error('É necessário fazer login para usar este assistente');
      return;
    }
    
    if (assistant.status === "active") {
      onSelectAssistant(assistant.id);
    }
  };

  const Icon = category.icon;

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Category Hero */}
      <div className="text-center space-y-4 mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
            <Icon className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {category.name}
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {category.description}
        </p>
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {categoryAssistants.map((assistant, index) => {
          const AssistantIcon = assistant.icon;
          const isFav = isFavorite(assistant.id);
          
          return (
            <Card 
              key={assistant.id}
              className="group relative overflow-hidden bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-elegant cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleAssistantClick(assistant)}
            >
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              
              {/* Favorite Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 z-10 hover:bg-secondary/80"
                onClick={(e) => handleFavoriteToggle(assistant.id, e)}
              >
                {isFav ? (
                  <Star className="h-4 w-4 text-primary fill-primary" />
                ) : (
                  <StarOff className="h-4 w-4 text-muted-foreground hover:text-primary" />
                )}
              </Button>
              
              <CardHeader className="relative pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                    <AssistantIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300 truncate">
                        {assistant.name}
                      </CardTitle>
                      {assistant.status === "active" && (
                        <Sparkles className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    {assistant.status === "coming-soon" && (
                      <span className="inline-block px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md mt-1">
                        Em Breve
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative pt-0">
                <CardDescription className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {assistant.description}
                </CardDescription>
                
                <Button 
                  variant={assistant.status === "active" ? "default" : "secondary"}
                  disabled={assistant.status === "coming-soon" || (assistant.requireAuth && !user)}
                  className="w-full group-hover:shadow-glow transition-all duration-300"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssistantClick(assistant);
                  }}
                >
                  {assistant.status === "active" ? "Usar Assistente" : "Em Breve"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};