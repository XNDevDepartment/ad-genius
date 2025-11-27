import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("");
  const [poseType, setPoseType] = useState<string>("");
  const [skinTone, setSkinTone] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");
  const { toast } = useToast();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg'];

  const handleFileSelect = (selectedFile: File) => {
    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: t('uploadModelDialog.fileTooLarge'),
        description: t('uploadModelDialog.fileTooLargeDesc'),
      });
      return;
    }

    // Validate file format
    if (!SUPPORTED_FORMATS.includes(selectedFile.type)) {
      toast({
        variant: "destructive",
        title: t('uploadModelDialog.invalidFormat'),
        description: t('uploadModelDialog.invalidFormatDesc'),
      });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !name.trim()) {
      toast({
        variant: "destructive",
        title: t('uploadModelDialog.missingInfo'),
        description: t('uploadModelDialog.missingInfoDesc'),
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
          <DialogTitle>{t('uploadModelDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{t('uploadModelDialog.modelImage')} *</Label>
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
                <span className="text-sm text-muted-foreground">{t('uploadModelDialog.clickToUpload')}</span>
                <span className="text-xs text-muted-foreground mt-1">{t('uploadModelDialog.formatHint')}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
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
            <Label htmlFor="name">{t('uploadModelDialog.modelName')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('uploadModelDialog.modelNamePlaceholder')}
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">{t('uploadModelDialog.gender')}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder={t('uploadModelDialog.selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('uploadModelDialog.genders.male')}</SelectItem>
                <SelectItem value="female">{t('uploadModelDialog.genders.female')}</SelectItem>
                <SelectItem value="unisex">{t('uploadModelDialog.genders.unisex')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ageRange">{t('uploadModelDialog.ageRange')}</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger>
                <SelectValue placeholder={t('uploadModelDialog.selectAgeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-12 months">{t('uploadModelDialog.ageRanges.baby')}</SelectItem>
                <SelectItem value="1-3 years">{t('uploadModelDialog.ageRanges.toddler')}</SelectItem>
                <SelectItem value="4-7 years">{t('uploadModelDialog.ageRanges.youngChild')}</SelectItem>
                <SelectItem value="8-12 years">{t('uploadModelDialog.ageRanges.child')}</SelectItem>
                <SelectItem value="13-17 years">{t('uploadModelDialog.ageRanges.teen')}</SelectItem>
                <SelectItem value="18-22 years">{t('uploadModelDialog.ageRanges.youngAdult')}</SelectItem>
                <SelectItem value="23-35 years">{t('uploadModelDialog.ageRanges.adult')}</SelectItem>
                <SelectItem value="36-50 years">{t('uploadModelDialog.ageRanges.middleAge')}</SelectItem>
                <SelectItem value="51-65 years">{t('uploadModelDialog.ageRanges.mature')}</SelectItem>
                <SelectItem value="65+ years">{t('uploadModelDialog.ageRanges.senior')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Body Type */}
          <div className="space-y-2">
            <Label htmlFor="bodyType">{t('uploadModelDialog.bodyType')}</Label>
            <Select value={bodyType} onValueChange={setBodyType}>
              <SelectTrigger>
                <SelectValue placeholder={t('uploadModelDialog.selectBodyType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slim">{t('uploadModelDialog.bodyTypes.slim')}</SelectItem>
                <SelectItem value="athletic">{t('uploadModelDialog.bodyTypes.athletic')}</SelectItem>
                <SelectItem value="average">{t('uploadModelDialog.bodyTypes.average')}</SelectItem>
                <SelectItem value="plus">{t('uploadModelDialog.bodyTypes.plus')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pose Type */}
          <div className="space-y-2">
            <Label htmlFor="poseType">{t('uploadModelDialog.poseType')}</Label>
            <Select value={poseType} onValueChange={setPoseType}>
              <SelectTrigger>
                <SelectValue placeholder={t('uploadModelDialog.selectPoseType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standing">{t('uploadModelDialog.poseTypes.standing')}</SelectItem>
                <SelectItem value="sitting">{t('uploadModelDialog.poseTypes.sitting')}</SelectItem>
                <SelectItem value="walking">{t('uploadModelDialog.poseTypes.walking')}</SelectItem>
                <SelectItem value="casual">{t('uploadModelDialog.poseTypes.casual')}</SelectItem>
                <SelectItem value="formal">{t('uploadModelDialog.poseTypes.formal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Skin Tone */}
          <div className="space-y-2">
            <Label htmlFor="skinTone">{t('uploadModelDialog.skinTone')}</Label>
            <Select value={skinTone} onValueChange={setSkinTone}>
              <SelectTrigger>
                <SelectValue placeholder={t('uploadModelDialog.selectSkinTone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('uploadModelDialog.skinTones.light')}</SelectItem>
                <SelectItem value="medium">{t('uploadModelDialog.skinTones.medium')}</SelectItem>
                <SelectItem value="tan">{t('uploadModelDialog.skinTones.tan')}</SelectItem>
                <SelectItem value="dark">{t('uploadModelDialog.skinTones.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {t('uploadModelDialog.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || !file || !name.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('uploadModelDialog.uploading')}
                </>
              ) : (
                t('uploadModelDialog.uploadModel')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};