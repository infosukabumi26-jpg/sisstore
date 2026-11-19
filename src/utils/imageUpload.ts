export interface ImageProcessOptions {
  maxDimension: number;
  preservePng?: boolean;
  quality?: number;
}

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format file harus PNG, JPG, WEBP, atau SVG.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Ukuran gambar maksimal 5 MB.';
  }
  return null;
}

export async function processImageUpload(
  file: File,
  options: ImageProcessOptions
): Promise<string> {
  const err = validateImageFile(file);
  if (err) {
    throw new Error(err);
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/svg+xml') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { maxDimension, preservePng = false, quality = 0.85 } = options;
      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width || 1, img.height || 1)
      );
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      if (!preservePng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const mime = preservePng ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(mime, quality));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
