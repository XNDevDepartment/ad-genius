import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load user's favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('image_favorites')
        .select('image_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(fav => fav.image_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (imageId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const newFavorites = new Set(favorites);

      if (newFavorites.has(imageId)) {
        // Remove from favorites
        await supabase
          .from('image_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('image_id', imageId);
        
        newFavorites.delete(imageId);
      } else {
        // Add to favorites
        await supabase
          .from('image_favorites')
          .insert({
            user_id: user.id,
            image_id: imageId
          });
        
        newFavorites.add(imageId);
      }

      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    favorites,
    loading,
    toggleFavorite
  };
};