import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, metadata: {
    name: string;
    gender?: string;
    bodyType?: string;
    poseType?: string;
    skinTone?: string;
    ageRange?: string;
  }) => Promise<any>;
  uploading: boolean;
}

export const UploadModelDialog = ({
  isOpen,
  onClose,
  onUpload,
  uploading,
}: UploadModelDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("");
  const [poseType, setPoseType] = useState<string>("");
  const [skinTone, setSkinTone] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !name.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide a file and model name",
      });
      return;
    }

    const result = await onUpload(file, {
      name: name.trim(),
      gender: gender || undefined,
      bodyType: bodyType || undefined,
      poseType: poseType || undefined,
      skinTone: skinTone || undefined,
      ageRange: ageRange || undefined,
    });

    if (result) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setName("");
    setGender("");
    setBodyType("");
    setPoseType("");
    setSkinTone("");
    setAgeRange("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Your Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Model Image *</Label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full h-48 object-contain border rounded-lg" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />
              </label>
            )}
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom Model"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
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

          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ageRange">Age Range</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-12 months">0-12 months</SelectItem>
                <SelectItem value="1-3 years">1-3 years</SelectItem>
                <SelectItem value="4-7 years">4-7 years</SelectItem>
                <SelectItem value="8-12 years">8-12 years</SelectItem>
                <SelectItem value="13-17 years">13-17 years</SelectItem>
                <SelectItem value="18-22 years">18-22 years</SelectItem>
                <SelectItem value="23-35 years">23-35 years</SelectItem>
                <SelectItem value="36-50 years">36-50 years</SelectItem>
                <SelectItem value="51-65 years">51-65 years</SelectItem>
                <SelectItem value="65+ years">65+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Body Type */}
          <div className="space-y-2">
            <Label htmlFor="bodyType">Body Type</Label>
            <Select value={bodyType} onValueChange={setBodyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select body type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slim">Slim</SelectItem>
                <SelectItem value="athletic">Athletic</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pose Type */}
          <div className="space-y-2">
            <Label htmlFor="poseType">Pose Type</Label>
            <Select value={poseType} onValueChange={setPoseType}>
              <SelectTrigger>
                <SelectValue placeholder="Select pose type" />
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

          {/* Skin Tone */}
          <div className="space-y-2">
            <Label htmlFor="skinTone">Skin Tone</Label>
            <Select value={skinTone} onValueChange={setSkinTone}>
              <SelectTrigger>
                <SelectValue placeholder="Select skin tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="tan">Tan</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || !file || !name.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Model"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
