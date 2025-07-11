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
        title: "Error loading favorites",
        description: "Failed to load your favorite assistants",
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
          title: "Added to favorites",
          description: "Assistant added to your favorites",
        });
      } catch (error) {
        console.error('Error adding favorite:', error);
        toast({
          title: "Error adding favorite",
          description: "Failed to add assistant to favorites",
          variant: "destructive",
        });
      }
    } else {
      // Store in localStorage for non-authenticated users
      const newFavorites = [...favorites, assistantId];
      setFavorites(newFavorites);
      localStorage.setItem('userFavorites', JSON.stringify(newFavorites));
      toast({
        title: "Added to favorites",
        description: "Assistant added to your favorites",
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
          title: "Removed from favorites",
          description: "Assistant removed from your favorites",
        });
      } catch (error) {
        console.error('Error removing favorite:', error);
        toast({
          title: "Error removing favorite",
          description: "Failed to remove assistant from favorites",
          variant: "destructive",
        });
      }
    } else {
      // Remove from localStorage for non-authenticated users
      const newFavorites = favorites.filter(id => id !== assistantId);
      setFavorites(newFavorites);
      localStorage.setItem('userFavorites', JSON.stringify(newFavorites));
      toast({
        title: "Removed from favorites",
        description: "Assistant removed from your favorites",
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