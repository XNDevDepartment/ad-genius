// utils/cropToAspect.ts
export type AR = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

function parseAR(ar: AR) {
  const [w, h] = ar.split(':').map(Number);
  return { ratio: w / h };
}
function parsePx(px?: string) {
  // e.g. "1536x1024" -> { w: 1536, h: 1024 }
  if (!px) return null;
  const [w, h] = px.split('x').map(n => parseInt(n, 10));
  return (Number.isFinite(w) && Number.isFinite(h)) ? { w, h } : null;
}

export async function cropFileToAspect(file: File, ar: AR, targetPx?: string): Promise<File> {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || 'image/png' });

  let bmp: ImageBitmap | HTMLImageElement;
  try {
    bmp = await createImageBitmap(blob); // handles EXIF in modern browsers
  } catch {
    bmp = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  const srcW = (bmp as any).width;
  const srcH = (bmp as any).height;
  const { ratio } = parseAR(ar);
  const srcRatio = srcW / srcH;

  // center-crop to requested aspect
  let cropW: number, cropH: number, sx: number, sy: number;
  if (srcRatio > ratio) {
    cropH = srcH;
    cropW = Math.round(cropH * ratio);
    sx = Math.round((srcW - cropW) / 2);
    sy = 0;
  } else {
    cropW = srcW;
    cropH = Math.round(cropW / ratio);
    sx = 0;
    sy = Math.round((srcH - cropH) / 2);
  }

  const target = parsePx(targetPx);
  const outW = target?.w ?? cropW;
  const outH = target?.h ?? cropH;

  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp as any, sx, sy, cropW, cropH, 0, 0, outW, outH);

  const outType = /image\/(png|jpeg|webp)/.test(file.type) ? file.type : 'image/png';
  const outBlob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), outType, 0.95));
  const ext = outType.split('/')[1];
  return new File([outBlob], file.name.replace(/\.\w+$/, '') + `_cropped.${ext}`, { type: outType });
}
