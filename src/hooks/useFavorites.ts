import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FavoriteAssistant {
  id: string;
  assistant_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      // Load from localStorage for non-authenticated users
      const storedFavorites = localStorage.getItem('userFavorites');
      setFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('assistant_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = data?.map(fav => fav.assistant_id) || [];
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Erro ao carregar favoritos",
        description: "Falha ao carregar os seus assistentes favoritos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (assistantId: string) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            assistant_id: assistantId,
          });

        if (error) throw error;

        setFavorites(prev => [...prev, assistantId]);
        toast({
          title: "Adicionado aos favoritos",
          description: "Assistente adicionado aos seus favoritos",
        });
      } catch (error) {
        console.error('Error adding favorite:', error);
        toast({
          title: "Erro ao adicionar favorito",
          description: "Falha ao adicionar assistente aos favoritos",
          variant: "destructive",
        });
      }
    } else {
      // Store in localStorage for non-authenticated users
      const newFavorites = [...favorites, assistantId];
      setFavorites(newFavorites);
      localStorage.setItem('userFavorites', JSON.stringify(newFavorites));
      toast({
        title: "Adicionado aos favoritos",
        description: "Assistente adicionado aos seus favoritos",
      });
    }
  };

  const removeFavorite = async (assistantId: string) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('assistant_id', assistantId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== assistantId));
        toast({
          title: "Removido dos favoritos",
          description: "Assistente removido dos seus favoritos",
        });
      } catch (error) {
        console.error('Error removing favorite:', error);
        toast({
          title: "Erro ao remover favorito",
          description: "Falha ao remover assistente dos favoritos",
          variant: "destructive",
        });
      }
    } else {
      // Remove from localStorage for non-authenticated users
      const newFavorites = favorites.filter(id => id !== assistantId);
      setFavorites(newFavorites);
      localStorage.setItem('userFavorites', JSON.stringify(newFavorites));
      toast({
        title: "Removido dos favoritos",
        description: "Assistente removido dos seus favoritos",
      });
    }
  };

  const isFavorite = (assistantId: string) => favorites.includes(assistantId);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
  };
};