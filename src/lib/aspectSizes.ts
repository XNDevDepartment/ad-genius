import type { AspectRatio } from "@/components/AspectRatioSelector";

export type SizeTier = 'small' | 'medium' | 'large';

// Note: 'source' is intentionally omitted - it preserves original image dimensions
// small = 1K, medium = 2K, large = 4K
export const SIZE_MAP: Record<Exclude<AspectRatio, 'source'>, Record<SizeTier, string>> = {
  '1:1':  { small: '1024x1024', medium: '1536x1536', large: '2048x2048' },
  '2:3':  { small: '896x1280',  medium: '1344x1920', large: '1792x2560' },
  '3:4':  { small: '896x1280',  medium: '1344x1920', large: '1792x2560' },
  '4:3':  { small: '1280x896',  medium: '1920x1344', large: '2560x1792' },
  '4:5':  { small: '896x1120',  medium: '1344x1680', large: '1792x2240' },
  '5:4':  { small: '1120x896',  medium: '1680x1344', large: '2240x1792' },
  '9:16': { small: '768x1408',  medium: '1152x2048',  large: '1536x2816' },
  '16:9': { small: '1408x768',  medium: '2048x1152',  large: '2816x1536' },
  '21:9': { small: '1536x640',  medium: '2304x960',   large: '3072x1280' },
};
