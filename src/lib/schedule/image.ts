import { SCHEDULE_IMAGE_MAX } from '@/config/schedule';

/**
 * Wgrany plik żyje jako `blob:` URL, który nie przetrwa odświeżenia strony. Żeby obrazek dało się
 * zapisać razem z rozkładem w localStorage, zmniejszamy go i zamieniamy na `data:` URL
 * (kilkadziesiąt KB zamiast kilku MB – localStorage ma limit ok. 5 MB na całą domenę).
 */
export async function toStorableImage(url: string): Promise<string> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, SCHEDULE_IMAGE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D niedostępny');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // WebP zachowuje przezroczystość (np. logo wydarzenia w PNG); Safari < 16 odda zamiast niego PNG.
  return canvas.toDataURL('image/webp', 0.85);
}
