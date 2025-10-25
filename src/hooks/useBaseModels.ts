import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface BaseModel {
  id: string;
  name: string;
  gender: "male" | "female" | "unisex" | null;
  body_type: "slim" | "athletic" | "average" | "plus" | null;
  pose_type: "standing" | "sitting" | "walking" | "casual" | "formal" | null;
  skin_tone: "light" | "medium" | "tan" | "dark" | null;
  storage_path: string;
  public_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  is_system: boolean;
  user_id: string | null;
  display_order: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface BaseModelFilters {
  gender?: string;
  bodyType?: string;
  poseType?: string;
  skinTone?: string;
}

export const useBaseModels = () => {
  const [systemModels, setSystemModels] = useState<BaseModel[]>([]);
  const [userModels, setUserModels] = useState<BaseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSystemModels = async (filters?: BaseModelFilters) => {
    try {
      setLoading(true);
      let query = supabase
        .from("outfit_swap_base_models")
        .select("*")
        .eq("is_system", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (filters?.gender) {
        query = query.eq("gender", filters.gender);
      }
      if (filters?.bodyType) {
        query = query.eq("body_type", filters.bodyType);
      }
      if (filters?.poseType) {
        query = query.eq("pose_type", filters.poseType);
      }
      if (filters?.skinTone) {
        query = query.eq("skin_tone", filters.skinTone);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSystemModels(data as BaseModel[] || []);
    } catch (error: any) {
      console.error("Error fetching system models:", error);
      toast({
        variant: "destructive",
        title: "Failed to load models",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserModels = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("outfit_swap_base_models")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserModels(data as BaseModel[] || []);
    } catch (error: any) {
      console.error("Error fetching user models:", error);
      toast({
        variant: "destructive",
        title: "Failed to load your models",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadUserModel = async (
    file: File,
    metadata: {
      name: string;
      gender?: string;
      bodyType?: string;
      poseType?: string;
      skinTone?: string;
    }
  ) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to upload models",
      });
      return null;
    }

    try {
      setUploading(true);

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("outfit-user-models")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("outfit-user-models")
        .getPublicUrl(fileName);

      // Create database record
      const { data: modelData, error: modelError } = await supabase
        .from("outfit_swap_base_models")
        .insert({
          name: metadata.name,
          gender: metadata.gender || null,
          body_type: metadata.bodyType || null,
          pose_type: metadata.poseType || null,
          skin_tone: metadata.skinTone || null,
          storage_path: fileName,
          public_url: urlData.publicUrl,
          is_system: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (modelError) throw modelError;

      toast({
        title: "Model uploaded",
        description: "Your base model has been uploaded successfully",
      });

      // Refresh user models
      await fetchUserModels();

      return modelData as BaseModel;
    } catch (error: any) {
      console.error("Error uploading model:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteUserModel = async (modelId: string) => {
    try {
      const model = userModels.find((m) => m.id === modelId);
      if (!model) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("outfit-user-models")
        .remove([model.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("outfit_swap_base_models")
        .delete()
        .eq("id", modelId);

      if (dbError) throw dbError;

      toast({
        title: "Model deleted",
        description: "Your base model has been deleted",
      });

      await fetchUserModels();
    } catch (error: any) {
      console.error("Error deleting model:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    }
  };

  useEffect(() => {
    fetchSystemModels();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserModels();
    }
  }, [user]);

  return {
    systemModels,
    userModels,
    loading,
    uploading,
    fetchSystemModels,
    fetchUserModels,
    uploadUserModel,
    deleteUserModel,
  };
};
