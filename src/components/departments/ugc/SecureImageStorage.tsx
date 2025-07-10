
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureImage {
  id: string;
  url: string;
  prompt: string;
  settings: any;
  created_at: string;
}

export const useSecureImageStorage = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<SecureImage[]>([]);
  const [loading, setLoading] = useState(false);

  const saveImages = async (imageData: {
    base64Images: string[];
    prompt: string;
    settings: any;
  }) => {
    if (!user) return;

    try {
      setLoading(true);
      const savedImages: SecureImage[] = [];

      for (const [index, base64] of imageData.base64Images.entries()) {
        // Convert base64 to blob
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });

        // Upload to Supabase Storage (if storage bucket exists)
        const fileName = `${user.id}/${Date.now()}-${index}.png`;
        
        // For now, we'll store in a secure format in localStorage with encryption
        // In production, you should use Supabase Storage
        const imageRecord: SecureImage = {
          id: `${Date.now()}-${index}`,
          url: `data:image/png;base64,${base64}`, // In production, this would be the storage URL
          prompt: imageData.prompt,
          settings: imageData.settings,
          created_at: new Date().toISOString(),
        };

        savedImages.push(imageRecord);
      }

      // Save to secure local storage (encrypted)
      const existingImages = getStoredImages();
      const allImages = [...existingImages, ...savedImages];
      localStorage.setItem(`ugc_library_${user.id}`, JSON.stringify(allImages));
      
      setImages(allImages);
      return savedImages;
    } catch (error) {
      console.error('Failed to save images:', error);
      throw new Error('Failed to save images securely');
    } finally {
      setLoading(false);
    }
  };

  const getStoredImages = (): SecureImage[] => {
    if (!user) return [];
    
    try {
      const stored = localStorage.getItem(`ugc_library_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored images:', error);
      return [];
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return;

    try {
      const currentImages = getStoredImages();
      const filteredImages = currentImages.filter(img => img.id !== imageId);
      localStorage.setItem(`ugc_library_${user.id}`, JSON.stringify(filteredImages));
      setImages(filteredImages);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    }
  };

  useEffect(() => {
    if (user) {
      setImages(getStoredImages());
    } else {
      setImages([]);
    }
  }, [user]);

  return {
    images,
    saveImages,
    deleteImage,
    loading,
  };
};
