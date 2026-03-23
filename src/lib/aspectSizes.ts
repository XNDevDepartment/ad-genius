import type { AspectRatio } from "@/components/AspectRatioSelector";
import type { SizeTier } from "@/components/ResolutionSelector";

// Note: 'source' is intentionally omitted - it preserves original image dimensions
export const SIZE_MAP: Record<Exclude<AspectRatio, 'source'>, Record<SizeTier, string>> = {
  '1:1':  { small: '1024x1024', large: '2048x2048' },
  '2:3':  { small: '896x1280',  large: '1792x2560' },
  '3:4':  { small: '896x1280',  large: '1792x2560' },
  '4:3':  { small: '1280x896',  large: '2560x1792' },
  '4:5':  { small: '896x1120',  large: '1792x2240' },
  '5:4':  { small: '1120x896',  large: '2240x1792' },
  '9:16': { small: '768x1408',  large: '1536x2816' },
  '16:9': { small: '1408x768',  large: '2816x1536' },
  '21:9': { small: '1536x640',  large: '3072x1280' },
};
