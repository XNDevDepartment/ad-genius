import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Upload, ImageIcon, Replace, Loader2, Sparkles, Users, Clock, RotateCcw, Download } from "lucide-react";

import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AspectRatioSelector, { type AspectRatio } from "@/components/AspectRatioSelector";
import ResolutionSelector from "@/components/ResolutionSelector";
import { SavedScenariosModal } from "@/components/SavedScenariosModal";
import { SavedAudiencesModal } from "@/components/SavedAudiencesModal";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useSourceImages } from "@/hooks/useSourceImages";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { useLibraryImages } from "@/hooks/useLibraryImages";
import { useCustomScenarios } from "@/hooks/useCustomScenarios";
import { useCustomAudiences } from "@/hooks/useCustomAudiences";
import { useProductSwap } from "@/hooks/useProductSwap";
import { SIZE_MAP, type SizeTier } from "@/lib/aspectSizes";

interface PickedImage {
  url: string;
  id?: string | null;
  name?: string;
}

const FREE_LOCKED_RATIOS: AspectRatio[] = ["9:16", "4:5"];

const PickerDialog = ({
  open,
  onOpenChange,
  onPick,
  mode,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (img: PickedImage) => void;
  mode: "library" | "source";
  title: string;
}) => {
  const { sourceImages, loading: srcLoading } = useSourceImages();
  const { images: libraryImages, loading: libLoading } = useLibraryImages({ limit: 60 });
  const items =
    mode === "library"
      ? libraryImages.map((i) => ({ url: i.url, id: i.id, name: i.prompt?.slice(0, 30) || "Image" }))
      : sourceImages.map((i) => ({ url: i.signedUrl || i.publicUrl, id: i.id, name: i.fileName }));
  const loading = mode === "library" ? libLoading : srcLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No images yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pr-2">
              {items.map((img) => (
                <button
                  key={img.id || img.url}
                  onClick={() => {
                    onPick({ url: img.url, id: img.id, name: img.name });
                    onOpenChange(false);
                  }}
                  className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors bg-muted"
                >
                  <img src={img.url} alt={img.name || "Image"} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const ImageSlot = ({
  label,
  hint,
  image,
  onUploadFile,
  onPickClick,
  onClear,
  pickerLabel,
  uploading,
}: {
  label: string;
  hint: string;
  image: PickedImage | null;
  onUploadFile: (file: File) => void;
  onPickClick: () => void;
  onClear: () => void;
  pickerLabel: string;
  uploading?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Card className="p-3">
        {image ? (
          <div className="space-y-2">
            <div className="aspect-square rounded-md overflow-hidden bg-muted">
              <img src={image.url} alt={image.name || label} className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClear} className="flex-1">
                Change
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="aspect-square rounded-md border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">{hint}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadFile(f);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Upload
              </Button>
              <Button variant="outline" size="sm" onClick={onPickClick}>
                <ImageIcon className="h-3.5 w-3.5 mr-1" />
                {pickerLabel}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const ProductSwap = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFreeTier, getRemainingCredits } = useCredits();
  const { toast } = useToast();

  const [reference, setReference] = useState<PickedImage | null>(null);
  const [newProduct, setNewProduct] = useState<PickedImage | null>(null);
  const [refPickerOpen, setRefPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [audience, setAudience] = useState("");
  const [scenario, setScenario] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [tier, setTier] = useState<SizeTier>("small");
  const [savedAudiencesOpen, setSavedAudiencesOpen] = useState(false);
  const [savedScenariosOpen, setSavedScenariosOpen] = useState(false);

  const { uploadSourceImage, uploading } = useSourceImageUpload();
  const { stage, loading, resultUrl, createJob, reset } = useProductSwap();
  const { scenarios } = useCustomScenarios();
  const { audiences: savedAudiences } = useCustomAudiences();

  const free = isFreeTier();
  const lockedRatios = free ? FREE_LOCKED_RATIOS : [];
  const lockedTiers: SizeTier[] = free ? ["medium", "large"] : [];

  const cost = tier === "small" ? 1 : tier === "medium" ? 2 : 3;

  const size = useMemo(() => {
    if (aspectRatio === "source") return "1024x1024";
    return SIZE_MAP[aspectRatio]?.[tier] || "1024x1024";
  }, [aspectRatio, tier]);

  const handleUpload = async (file: File, target: "ref" | "product") => {
    const img = await uploadSourceImage(file);
    if (img) {
      const picked: PickedImage = { url: img.publicUrl, id: img.id, name: img.fileName };
      if (target === "ref") setReference(picked);
      else setNewProduct(picked);
    }
  };

  const canSubmit =
    !!reference &&
    !!newProduct &&
    audience.trim().length >= 2 &&
    scenario.trim().length >= 2 &&
    !loading;

  const handleSubmit = async () => {
    if (!user) {
      navigate("/sign-in");
      return;
    }
    if (!canSubmit || !reference || !newProduct) return;
    if (getRemainingCredits() < cost) {
      toast({
        variant: "destructive",
        title: "Not enough credits",
        description: `This swap needs ${cost} credit${cost > 1 ? "s" : ""}.`,
      });
      navigate("/pricing");
      return;
    }
    try {
      await createJob({
        referenceImageUrl: reference.url,
        referenceImageId: reference.id || null,
        newProductImageUrl: newProduct.url,
        newProductImageId: newProduct.id || null,
        audience,
        scenario,
        settings: { aspect_ratio: aspectRatio, resolution_tier: tier, size },
      });
    } catch {
      /* toast already shown */
    }
  };

  const renderResolutionTabs = () => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t("ugc.resolution") || "Resolution"}</Label>
      <ResolutionSelector
        value={tier}
        onChange={(v) => {
          if (lockedTiers.includes(v)) {
            navigate("/pricing");
            return;
          }
          setTier(v);
        }}
      />
      <p className="text-xs text-muted-foreground">
        {tier === "small" ? "1K · 1 credit" : tier === "medium" ? "2K · 2 credits" : "4K · 3 credits"}
      </p>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-4 pb-16">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/create")} className="h-11 w-11">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
                <Replace className="h-6 w-6 text-primary" />
                {t("productSwap.title")}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">{t("productSwap.subtitle")}</p>
            </div>
          </div>

          {stage === "results" && resultUrl ? (
            <Card className="p-4 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold">{t("productSwap.results.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {reference && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("productSwap.reference")}</Label>
                    <div className="aspect-square rounded-md overflow-hidden bg-muted mt-1">
                      <img src={reference.url} alt="reference" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
                {newProduct && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("productSwap.newProduct")}</Label>
                    <div className="aspect-square rounded-md overflow-hidden bg-muted mt-1">
                      <img src={newProduct.url} alt="new product" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">{t("productSwap.result")}</Label>
                  <div className="aspect-square rounded-md overflow-hidden bg-muted mt-1">
                    <img src={resultUrl} alt="result" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("productSwap.results.again")}
                </Button>
                <a href={resultUrl} download target="_blank" rel="noreferrer">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    {t("productSwap.results.download")}
                  </Button>
                </a>
                <Button variant="outline" onClick={() => navigate("/library")}>
                  {t("productSwap.results.openLibrary")}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <ImageSlot
                  label={t("productSwap.reference")}
                  hint={t("productSwap.referenceHint")}
                  image={reference}
                  onUploadFile={(f) => handleUpload(f, "ref")}
                  onPickClick={() => setRefPickerOpen(true)}
                  onClear={() => setReference(null)}
                  pickerLabel={t("productSwap.fromLibrary")}
                  uploading={uploading}
                />
                <ImageSlot
                  label={t("productSwap.newProduct")}
                  hint={t("productSwap.newProductHint")}
                  image={newProduct}
                  onUploadFile={(f) => handleUpload(f, "product")}
                  onPickClick={() => setProductPickerOpen(true)}
                  onClear={() => setNewProduct(null)}
                  pickerLabel={t("productSwap.fromUploads")}
                  uploading={uploading}
                />
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">{t("productSwap.audience")}</Label>
                    {savedAudiences.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSavedAudiencesOpen(true)}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {t("ugc.savedAudiences.title")}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={3}
                    placeholder={t("productSwap.audiencePlaceholder")}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">{t("productSwap.scenario")}</Label>
                    {scenarios.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSavedScenariosOpen(true)}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {t("ugc.savedScenarios.title")}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={3}
                    placeholder={t("productSwap.scenarioPlaceholder")}
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t("ugc.orientation.title") || "Aspect ratio"}
                  </Label>
                  <AspectRatioSelector
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    lockedRatios={lockedRatios}
                  />
                </div>

                {renderResolutionTabs()}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("productSwap.processing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t("productSwap.submit", { cost })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <PickerDialog
          open={refPickerOpen}
          onOpenChange={setRefPickerOpen}
          onPick={setReference}
          mode="library"
          title={t("productSwap.pickReferenceTitle")}
        />
        <PickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          onPick={setNewProduct}
          mode="source"
          title={t("productSwap.pickProductTitle")}
        />
        <SavedAudiencesModal
          open={savedAudiencesOpen}
          onOpenChange={setSavedAudiencesOpen}
          onSelect={setAudience}
        />
        <SavedScenariosModal
          open={savedScenariosOpen}
          onOpenChange={setSavedScenariosOpen}
          onSelect={setScenario}
        />
      </div>
    </PageTransition>
  );
};

export default ProductSwap;
