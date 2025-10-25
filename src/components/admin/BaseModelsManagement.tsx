import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBaseModels, BaseModel } from '@/hooks/useBaseModels';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export const BaseModelsManagement = () => {
  const { systemModels, loading: modelsLoading, fetchSystemModels } = useBaseModels();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    body_type: '',
    pose_type: '',
    skin_tone: ''
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    if (!formData.name || !formData.gender || !formData.body_type || !formData.pose_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `system/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('outfit-base-models')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('outfit-base-models')
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase
        .from('outfit_swap_base_models')
        .insert({
          name: formData.name,
          gender: formData.gender,
          body_type: formData.body_type,
          pose_type: formData.pose_type,
          skin_tone: formData.skin_tone || null,
          storage_path: filePath,
          public_url: publicUrl,
          thumbnail_url: publicUrl,
          is_system: true,
          is_active: true,
          metadata: {}
        });

      if (dbError) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage
          .from('outfit-base-models')
          .remove([filePath]);
        throw dbError;
      }

      toast.success('Base model uploaded successfully');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({
        name: '',
        gender: '',
        body_type: '',
        pose_type: '',
        skin_tone: ''
      });

      // Refresh models list
      await fetchSystemModels();
    } catch (error: any) {
      console.error('Error uploading base model:', error);
      toast.error(error.message || 'Failed to upload base model');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (model: BaseModel) => {
    if (!confirm(`Are you sure you want to delete "${model.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('outfit_swap_base_models')
        .delete()
        .eq('id', model.id);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('outfit-base-models')
        .remove([model.storage_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      toast.success('Base model deleted successfully');
      await fetchSystemModels();
    } catch (error: any) {
      console.error('Error deleting base model:', error);
      toast.error(error.message || 'Failed to delete base model');
    }
  };

  const handleToggleActive = async (model: BaseModel) => {
    try {
      const { error } = await supabase
        .from('outfit_swap_base_models')
        .update({ is_active: !model.is_active })
        .eq('id', model.id);

      if (error) throw error;

      toast.success(`Model ${model.is_active ? 'deactivated' : 'activated'}`);
      await fetchSystemModels();
    } catch (error: any) {
      console.error('Error toggling model status:', error);
      toast.error(error.message || 'Failed to update model');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Base Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="model-image">Model Image *</Label>
              <div className="flex flex-col gap-4">
                <Input
                  id="model-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {previewUrl && (
                  <div className="relative w-full h-64 border rounded-lg overflow-hidden">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Name *</Label>
                <Input
                  id="model-name"
                  placeholder="e.g., Female Athletic Casual"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-gender">Gender *</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unisex">Unisex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-body-type">Body Type *</Label>
                <Select 
                  value={formData.body_type} 
                  onValueChange={(value) => setFormData({ ...formData, body_type: value })}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="curvy">Curvy</SelectItem>
                    <SelectItem value="plus">Plus Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-pose">Pose Type *</Label>
                <Select 
                  value={formData.pose_type} 
                  onValueChange={(value) => setFormData({ ...formData, pose_type: value })}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standing">Standing</SelectItem>
                    <SelectItem value="sitting">Sitting</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-skin-tone">Skin Tone</Label>
                <Select 
                  value={formData.skin_tone} 
                  onValueChange={(value) => setFormData({ ...formData, skin_tone: value })}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skin tone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="tan">Tan</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={uploading || !selectedFile}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Model
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            System Base Models ({systemModels.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modelsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : systemModels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No base models uploaded yet. Upload your first model above.
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {systemModels.map((model) => (
                  <Card key={model.id} className="overflow-hidden">
                    <div className="relative aspect-[3/4]">
                      <img 
                        src={model.public_url} 
                        alt={model.name}
                        className="w-full h-full object-cover"
                      />
                      {!model.is_active && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="secondary">Inactive</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-medium text-sm truncate">{model.name}</h3>
                      <div className="flex flex-wrap gap-1">
                        {model.gender && (
                          <Badge variant="outline" className="text-xs">{model.gender}</Badge>
                        )}
                        {model.body_type && (
                          <Badge variant="outline" className="text-xs">{model.body_type}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(model)}
                          className="flex-1 text-xs"
                        >
                          {model.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(model)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
