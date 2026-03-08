import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Paintbrush,
  Eraser,
  Trash2,
  Loader2,
  Download,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageId?: string;
  onEditComplete?: (newImageUrl: string) => void;
}

type Tool = "brush" | "eraser";

export default function EditImageModal({
  isOpen,
  onClose,
  imageUrl,
  imageId,
  onEditComplete,
}: EditImageModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [instruction, setInstruction] = useState("");
  const [brushSize, setBrushSize] = useState(30);
  const [tool, setTool] = useState<Tool>("brush");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInstruction("");
      setResultUrl(null);
      setImgLoaded(false);
      setTool("brush");
    }
  }, [isOpen]);

  // Initialize canvas when image loads
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imgRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    []
  );

  // Drawing helpers
  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY =
      "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const draw = useCallback(
    (pos: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 60, 60, 0.45)";
      ctx.fill();
    },
    [tool, brushSize]
  );

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    if (pos) draw(pos);
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    if (pos) draw(pos);
  };

  const onPointerUp = () => setIsDrawing(false);

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Export mask as white-on-black base64 PNG at original resolution
  const exportMask = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || naturalSize.w === 0) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = naturalSize.w;
    offscreen.height = naturalSize.h;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Scale the drawn mask to original resolution
    const scaleX = naturalSize.w / canvas.width;
    const scaleY = naturalSize.h / canvas.height;

    // Read the display canvas and threshold to white
    const displayCtx = canvas.getContext("2d");
    if (!displayCtx) return null;
    const displayData = displayCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Create a temp canvas with the mask data
    const temp = document.createElement("canvas");
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tCtx = temp.getContext("2d");
    if (!tCtx) return null;

    // Convert red semi-transparent to white
    const outData = tCtx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < displayData.data.length; i += 4) {
      const alpha = displayData.data[i + 3];
      const isMarked = alpha > 10;
      outData.data[i] = isMarked ? 255 : 0;
      outData.data[i + 1] = isMarked ? 255 : 0;
      outData.data[i + 2] = isMarked ? 255 : 0;
      outData.data[i + 3] = 255;
    }
    tCtx.putImageData(outData, 0, 0);

    // Draw scaled to output
    ctx.drawImage(temp, 0, 0, offscreen.width, offscreen.height);

    // Check if mask has any white pixels
    const checkData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    let hasWhite = false;
    for (let i = 0; i < checkData.data.length; i += 4) {
      if (checkData.data[i] > 128) {
        hasWhite = true;
        break;
      }
    }

    if (!hasWhite) return null;
    return offscreen.toDataURL("image/png").split(",")[1];
  };

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      toast({
        title: "Instruction required",
        description: "Please describe the changes you want.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const maskBase64 = exportMask();

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl,
          maskBase64: maskBase64 || null,
          instruction: instruction.trim(),
          originalImageId: imageId || null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Edit failed");

      setResultUrl(data.imageUrl);
      onEditComplete?.(data.imageUrl);
      toast({ title: "Image edited!", description: "Your edited image is ready." });
    } catch (err: any) {
      console.error("Edit image error:", err);
      toast({
        title: "Edit failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
          <DialogDescription>
            Draw on the image to select the area you want to change, then describe the edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image + Canvas area */}
          <div
            ref={containerRef}
            className="relative inline-block w-full rounded-lg overflow-hidden border border-border bg-muted/20"
          >
            <img
              src={resultUrl || imageUrl}
              alt="Image to edit"
              className="w-full h-auto max-h-[50vh] object-contain"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              draggable={false}
            />
            {!resultUrl && imgLoaded && (
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                onMouseDown={onPointerDown}
                onMouseMove={onPointerMove}
                onMouseUp={onPointerUp}
                onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchMove={onPointerMove}
                onTouchEnd={onPointerUp}
              />
            )}
          </div>

          {/* Result actions */}
          {resultUrl && (
            <div className="flex gap-2">
              <Button onClick={handleDownloadResult} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Open Result
              </Button>
              <Button
                onClick={() => {
                  setResultUrl(null);
                  setInstruction("");
                }}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Edit Again
              </Button>
            </div>
          )}

          {/* Drawing tools - only show when not showing result */}
          {!resultUrl && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  variant={tool === "brush" ? "default" : "outline"}
                  onClick={() => setTool("brush")}
                >
                  <Paintbrush className="h-4 w-4 mr-1" />
                  Brush
                </Button>
                <Button
                  size="sm"
                  variant={tool === "eraser" ? "default" : "outline"}
                  onClick={() => setTool("eraser")}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Eraser
                </Button>
                <Button size="sm" variant="ghost" onClick={clearMask}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>

                <div className="flex items-center gap-2 ml-auto min-w-[160px]">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Size: {brushSize}px
                  </Label>
                  <Slider
                    value={[brushSize]}
                    onValueChange={([v]) => setBrushSize(v)}
                    min={10}
                    max={80}
                    step={2}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Instruction */}
              <div className="space-y-2">
                <Label htmlFor="edit-instruction">Edit instruction</Label>
                <Textarea
                  id="edit-instruction"
                  placeholder="e.g. Change the background to a beach sunset, remove the logo, make the shirt red..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !instruction.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Editing...
                  </>
                ) : (
                  "Apply Edit (1 credit)"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
